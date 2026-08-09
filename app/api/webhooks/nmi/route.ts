import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { payments, members } from "@/lib/schema";
import { verifyNmiWebhookSignature } from "@/lib/nmi";

type NmiTransactionEvent = {
  event_type: string;
  event_body: {
    transaction_id?: string;
    customer_vault_id?: string;
    action?: { amount?: string; success?: string };
  };
};

// Payments only ever land in the `payments` table from here -- never from
// app/api/payments/subscribe -- so a row existing means NMI has actually
// confirmed the charge, not just that a subscription was created. Fires for
// both the first payment and every renewal alike (NMI has no separate
// "checkout vs. invoice" distinction the way Stripe did).
export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const signature = request.headers.get("signature") ?? request.headers.get("Signature");
  const rawBody = await request.text();

  if (!signature || !(await verifyNmiWebhookSignature(rawBody, signature, env.NMI_WEBHOOK_SECRET))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: NmiTransactionEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = await getDb();
  const customerVaultId = event.event_body.customer_vault_id;

  if (event.event_type === "transaction.sale.success") {
    const { transaction_id: transactionId, action } = event.event_body;
    if (customerVaultId && transactionId && action?.amount) {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.nmiCustomerVaultId, customerVaultId))
        .limit(1);

      if (member) {
        await db
          .insert(payments)
          .values({
            memberId: member.id,
            amountCents: Math.round(parseFloat(action.amount) * 100),
            currency: "usd",
            paymentMethodType: "card",
            nmiTransactionId: transactionId,
          })
          .onConflictDoNothing();

        // Push the renewal date a year out and clear the reminder-sent flags
        // so the cron (app/api/cron/renewal-reminders) re-arms for the next
        // cycle instead of re-texting about the payment that just cleared.
        const nextRenewal = new Date();
        nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
        await db
          .update(members)
          .set({
            renewalDate: nextRenewal.toISOString().slice(0, 10),
            renewal45ReminderSentFor: null,
            renewal15ReminderSentFor: null,
            subscriptionStatus: "active",
          })
          .where(eq(members.id, member.id));
      }
    }
  }

  if (event.event_type === "transaction.sale.failure" && customerVaultId) {
    await db
      .update(members)
      .set({ subscriptionStatus: "past_due" })
      .where(eq(members.nmiCustomerVaultId, customerVaultId));
  }

  return NextResponse.json({ received: true });
}
