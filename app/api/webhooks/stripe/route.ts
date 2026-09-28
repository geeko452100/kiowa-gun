import { NextResponse } from "next/server";
import { asCheckoutSession, fulfillPaidCheckoutSession, StripeConfigError, verifyWebhook } from "@/lib/stripe";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event;
  try {
    event = await verifyWebhook(rawBody, request.headers.get("stripe-signature"));
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return NextResponse.json({ error: "Stripe isn't configured yet." }, { status: 503 });
    }
    throw err;
  }
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await fulfillPaidCheckoutSession(asCheckoutSession(event.data.object as Record<string, unknown>));
  }

  return NextResponse.json({ received: true });
}
