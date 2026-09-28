import { NextResponse } from "next/server";
import {
  fulfillPaidCheckoutSession,
  retrieveCheckoutSession,
  StripeApiError,
  StripeConfigError,
} from "@/lib/stripe";

// Return-page counterpart to the Stripe webhook: retrieves the Checkout
// Session and records the dues payment if Stripe says it's paid. Safe to
// call more than once -- fulfillPaidCheckoutSession is idempotent.
export async function POST(request: Request) {
  const { sessionId } = (await request.json().catch(() => ({}))) as { sessionId?: string };
  if (!sessionId) {
    return NextResponse.json({ error: "Missing checkout session" }, { status: 400 });
  }

  try {
    const session = await retrieveCheckoutSession(sessionId);
    await fulfillPaidCheckoutSession(session);
    return NextResponse.json({ ok: true, paid: session.payment_status === "paid" });
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return NextResponse.json({ error: "Online payment isn't configured yet." }, { status: 503 });
    }
    if (err instanceof StripeApiError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    return NextResponse.json({ error: "Could not confirm the payment. Try again shortly." }, { status: 502 });
  }
}
