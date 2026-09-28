import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { members, payments } from "./schema";
import { DUES_AMOUNT_CENTS } from "./constants";
import { nextCutoffAfterPayment } from "./renewalCycle";

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

// Records a dues charge Stripe has confirmed (Checkout Session payment_status
// "paid"). Shared by the webhook and the return-page complete route so the
// "what happens after a successful charge" logic only lives in one place.
// Pushes renewalDate out to the next annual cutoff the member hasn't already
// paid through (see lib/renewalCycle) and re-arms the reminder cron for that
// cycle. Idempotent on stripeCheckoutSessionId so a webhook + return-page
// race records the payment once.
export async function recordDuesPayment(
  db: Awaited<ReturnType<typeof getDb>>,
  member: { id: number; renewalDate: string | null },
  charge: { stripeCheckoutSessionId: string; paymentMethodType?: string }
) {
  await db
    .insert(payments)
    .values({
      memberId: member.id,
      amountCents: DUES_AMOUNT_CENTS,
      currency: "usd",
      paymentMethodType: charge.paymentMethodType ?? "card",
      stripeCheckoutSessionId: charge.stripeCheckoutSessionId,
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
