import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members, smsCampaigns } from "@/lib/schema";
import { sendGatewaySms } from "@/lib/sms";

// Triggered daily by a companion Cloudflare Worker's Cron Trigger (this app's
// own Worker has no scheduled handler). Texts members whose renewal_date
// (the shared annual dues cutoff every member is due by -- see
// lib/renewalCycle -- not a personal anniversary) is within 45 or 15 days,
// once per renewal cycle per threshold -- tracked via
// renewal_45/15_reminder_sent_for so a missed day still catches up on the
// next run instead of silently skipping the window. Since renewal_date is
// the same clubwide cutoff for every unpaid member, this is effectively "text
// everyone 45 days before the cutoff, and again 15 days before."
// Ascending order: the smallest threshold a member currently falls under is
// the one that actually applies (a member added 10 days before the cutoff is
// "within 15 days", not "within 45 days", even though both are technically
// true) -- and it implies every larger threshold has effectively fired too.
// Dues are never charged automatically (see the guardrail comment atop
// lib/nmi.ts) -- this reminder is the only nudge a member gets; paying is
// always their own action (or, for cash/check, a board member manually
// recording it).
const THRESHOLDS = [
  { days: 15, field: "renewal15ReminderSentFor" as const },
  { days: 45, field: "renewal45ReminderSentFor" as const },
];

function daysUntil(dateStr: string, today: Date): number {
  const target = new Date(`${dateStr}T00:00:00Z`);
  const diffMs = target.getTime() - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round(diffMs / 86_400_000);
}

function messageFor(daysOut: number, renewalDate: string): string {
  const formatted = new Date(`${renewalDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `Kiowa Gun Club: Your annual membership dues are due in ${daysOut} days (by ${formatted}). Nothing is charged automatically -- log in to the member portal to pay. Questions? Contact the board.`;
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const rows = await db
    .select()
    .from(members)
    .where(and(eq(members.status, "Member"), eq(members.smsOptIn, 1)));
  const today = new Date();

  let sentCount = 0;
  let failedCount = 0;

  for (const m of rows) {
    if (!m.renewalDate || !m.phone) continue;

    const daysOut = daysUntil(m.renewalDate, today);
    if (daysOut < 0) continue;

    const due = THRESHOLDS.find(
      ({ days, field }) => daysOut <= days && m[field] !== m.renewalDate
    );
    if (!due) continue;

    const { error } = await sendGatewaySms(m.id, m.phone, messageFor(daysOut, m.renewalDate));

    if (error) {
      failedCount += 1;
      continue;
    }
    sentCount += 1;
    // Mark every threshold at or above the one that just fired as sent for
    // this cycle, so a late-added renewal date doesn't also fire the larger
    // threshold's message right after.
    const updates = Object.fromEntries(
      THRESHOLDS.filter(({ days }) => days >= due.days).map(({ field }) => [field, m.renewalDate])
    );
    await db.update(members).set(updates).where(eq(members.id, m.id));
  }

  if (sentCount > 0 || failedCount > 0) {
    await db.insert(smsCampaigns).values({
      body: "[Automated renewal reminders]",
      sentCount,
      failedCount,
      createdBy: "System (renewal reminder cron)",
      recipientPhone: null,
    });
  }

  return NextResponse.json({ ok: true, sentCount, failedCount });
}
