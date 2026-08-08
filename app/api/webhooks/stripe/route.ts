import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { payments } from "@/lib/schema";
import { getStripe } from "@/lib/stripe";

// Stripe calls this after a Checkout Session finishes. Payments only ever
// land in the `payments` table from here -- never from the checkout-creation
// route -- so a row existing means Stripe has actually confirmed the money
// moved, not just that a session was started.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const stripe = await getStripe();
  const body = await request.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const memberId = Number(session.metadata?.memberId);
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

    if (memberId && session.amount_total != null) {
      let paymentMethodType: string | null = null;
      if (paymentIntentId) {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["payment_method"],
        });
        const method = intent.payment_method;
        paymentMethodType = typeof method === "string" ? null : (method?.type ?? null);
      }

      const db = await getDb();
      await db
        .insert(payments)
        .values({
          memberId,
          amountCents: session.amount_total,
          currency: session.currency ?? "usd",
          paymentMethodType,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId ?? null,
        })
        .onConflictDoNothing();
    }
  }

  return NextResponse.json({ received: true });
}
