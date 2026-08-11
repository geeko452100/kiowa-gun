import { NextResponse } from "next/server";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members, documents, siteSettings, adminUsers } from "@/lib/schema";
import { sendAdminEmail } from "@/lib/email";
import { RENEWAL_TERMINATION_CUTOFF } from "@/lib/constants";

// Triggered nightly by the companion Cloudflare Worker's Cron Trigger
// (kiowa-gun-cron), alongside renewal-reminders and nra-check. Once a year,
// on/after RENEWAL_TERMINATION_CUTOFF, soft-terminates any Member who hasn't
// paid this cycle's dues: status -> "Terminated", PII scrubbed, uploaded
// documents deleted. `payments` rows are left untouched -- financial history
// stays linked via memberId to the now-anonymized shell row.
export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const pastCutoff =
    now.getUTCMonth() + 1 > RENEWAL_TERMINATION_CUTOFF.month ||
    (now.getUTCMonth() + 1 === RENEWAL_TERMINATION_CUTOFF.month && now.getUTCDate() >= RENEWAL_TERMINATION_CUTOFF.day);

  const db = await getDb();
  const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
  if (!pastCutoff || settings?.lastTerminationSweepYear === thisYear) {
    return NextResponse.json({ ok: true, ran: false });
  }

  const unpaid = await db
    .select({ id: members.id, name: members.name, email: members.email })
    .from(members)
    .where(
      and(
        eq(members.status, "Member"),
        or(isNull(members.subscriptionStatus), ne(members.subscriptionStatus, "active"))
      )
    );

  for (const m of unpaid) {
    const docs = await db.select({ id: documents.id, r2Key: documents.r2Key }).from(documents).where(eq(documents.memberId, m.id));
    for (const doc of docs) {
      await env.DOCS.delete(doc.r2Key);
    }
    await db.delete(documents).where(eq(documents.memberId, m.id));

    await db
      .update(members)
      .set({
        status: "Terminated",
        terminatedAt: now.toISOString(),
        name: "Removed Member",
        email: `terminated-${m.id}@removed.invalid`,
        phone: null,
        address: null,
        nraNumber: null,
        nraExpirationDate: null,
        rulesAcknowledgedPrintedName: null,
        rulesAcknowledgedName: null,
        rulesAcknowledgedAt: null,
        smsOptIn: 0,
        canPay: 0,
      })
      .where(eq(members.id, m.id));
  }

  await db
    .update(siteSettings)
    .set({ lastTerminationSweepYear: thisYear })
    .where(eq(siteSettings.id, 1));

  if (unpaid.length > 0) {
    const admins = await db.select({ email: adminUsers.email }).from(adminUsers);
    const summary = `<p>The annual dues deadline (${RENEWAL_TERMINATION_CUTOFF.month}/${RENEWAL_TERMINATION_CUTOFF.day}) has passed. ${unpaid.length} member(s) who hadn't paid were terminated and had their personal info removed:</p>
      <ul>${unpaid.map((m) => `<li>${m.name} (${m.email})</li>`).join("")}</ul>`;
    for (const admin of admins) {
      await sendAdminEmail(admin.email, "Annual Membership Termination Sweep Ran", summary);
    }
  }

  return NextResponse.json({ ok: true, ran: true, terminatedCount: unpaid.length });
}
