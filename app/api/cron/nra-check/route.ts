import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { recomputeCanPay } from "@/lib/members";

// Triggered nightly by the companion Cloudflare Worker's Cron Trigger
// (kiowa-gun-cron), alongside renewal-reminders. Suspends any Member whose
// NRA membership has lapsed -- nraActive only ever gets flipped back on by
// admin review of re-submitted proof (see app/portal/nra-expired), never
// automatically here.
export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);

  const expired = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.status, "Member"),
        eq(members.nraActive, 1),
        lt(members.nraExpirationDate, today)
      )
    );

  for (const { id } of expired) {
    await db.update(members).set({ nraActive: 0 }).where(eq(members.id, id));
    await recomputeCanPay(db, id);
  }

  return NextResponse.json({ ok: true, suspendedCount: expired.length });
}
