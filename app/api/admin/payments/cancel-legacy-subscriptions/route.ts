import { NextResponse } from "next/server";
import { eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { canViewFinancials } from "@/lib/roles";
import { cancelSubscription, NmiApiError } from "@/lib/nmi";

// One-time cleanup for members who still have a recurring NMI subscription
// from before the board's no-auto-billing decision (see the guardrail
// comment atop lib/nmi.ts) -- nothing in the current codebase creates a
// subscription, but a legacy one keeps auto-charging at NMI until it's
// explicitly cancelled there. Safe to run repeatedly: only rows that still
// have an nmiSubscriptionId are touched, and it's cleared on success so a
// second run has nothing left to do.
export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewFinancials(admin.role)) {
    return NextResponse.json({ error: "Treasurer, President, Vice President, or Tech Admin access required" }, { status: 403 });
  }

  const db = await getDb();
  const legacy = await db
    .select({ id: members.id, nmiSubscriptionId: members.nmiSubscriptionId })
    .from(members)
    .where(isNotNull(members.nmiSubscriptionId));

  let canceledCount = 0;
  let failedCount = 0;
  for (const m of legacy) {
    if (!m.nmiSubscriptionId) continue;
    try {
      await cancelSubscription(m.nmiSubscriptionId);
      await db
        .update(members)
        .set({ nmiSubscriptionId: null, nmiCustomerVaultId: null })
        .where(eq(members.id, m.id));
      canceledCount += 1;
    } catch (err) {
      failedCount += 1;
      if (!(err instanceof NmiApiError)) throw err;
    }
  }

  return NextResponse.json({ ok: true, canceledCount, failedCount });
}
