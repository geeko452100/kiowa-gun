import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { members, payments } from "./schema";
import { DUES_AMOUNT_CENTS } from "./constants";
import { nextCutoffAfterPayment } from "./renewalCycle";
import type { NmiTransaction } from "./nmi";

// Single source of truth for whether a member is currently allowed to pay
// dues (checked by every payment entry point -- app/api/payments/pay
// and app/api/payments/invoice -- instead of each one re-deriving
// eligibility from status/backgroundCheckCleared/nraActive itself). Call
// this any time one of those underlying inputs changes rather than setting
// can_pay directly.
export async function recomputeCanPay(db: Awaited<ReturnType<typeof getDb>>, memberId: number) {
  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) return;

  const canPay = member.status === "Member" ? member.nraActive : member.backgroundCheckCleared;
  if (canPay !== member.canPay) {
    await db.update(members).set({ canPay }).where(eq(members.id, memberId));
  }
}

// Records a dues charge that NMI has just confirmed synchronously (chargeDues
// already returned success -- there's no async webhook step to wait on,
// since one-time sales aren't subscriptions). Shared by app/api/payments/pay
// and app/api/payments/invoice so the "what happens after a successful
// charge" logic only lives in one place. Pushes renewalDate out to the next
// annual cutoff the member hasn't already paid through (see
// lib/renewalCycle) and re-arms the reminder cron for that cycle.
export async function recordDuesPayment(
  db: Awaited<ReturnType<typeof getDb>>,
  member: { id: number; renewalDate: string | null },
  transaction: NmiTransaction
) {
  await db
    .insert(payments)
    .values({
      memberId: member.id,
      amountCents: DUES_AMOUNT_CENTS,
      currency: "usd",
      paymentMethodType: "card",
      nmiTransactionId: transaction.id,
    })
    .onConflictDoNothing();

  await db
    .update(members)
    .set({
      renewalDate: nextCutoffAfterPayment(member.renewalDate, new Date()),
      renewal45ReminderSentFor: null,
      renewal15ReminderSentFor: null,
      subscriptionStatus: "active",
    })
    .where(eq(members.id, member.id));
}
