import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members, membershipInvoices } from "@/lib/schema";
import { createDuesCheckoutSession, StripeApiError, StripeConfigError } from "@/lib/stripe";

// Starts a one-time Stripe Checkout Session for a new applicant's first year
// of dues from the emailed invoice link (app/membership/pay/[token]) -- the
// token-based counterpart to app/api/payments/pay, which requires a portal
// login instead. Fulfillment (Member status, invoice paid, welcome email)
// happens in fulfillPaidCheckoutSession once Stripe confirms payment.
export async function POST(request: Request) {
  const { token } = (await request.json().catch(() => ({}))) as { token?: string };
  if (!token) {
    return NextResponse.json({ error: "Payment info is required" }, { status: 400 });
  }

  const db = await getDb();
  const [invoice] = await db.select().from(membershipInvoices).where(eq(membershipInvoices.token, token));
  if (!invoice) {
    return NextResponse.json({ error: "This invoice link isn't valid. Contact the club if you believe this is a mistake." }, { status: 404 });
  }
  if (invoice.paidAt) {
    return NextResponse.json({ error: "This invoice has already been paid." }, { status: 409 });
  }

  const [member] = await db.select().from(members).where(eq(members.id, invoice.memberId));
  if (!member) {
    return NextResponse.json({ error: "No member found for this invoice." }, { status: 404 });
  }
  if (!member.canPay) {
    return NextResponse.json(
      { error: "Your account isn't currently eligible to pay dues. Contact the club if you believe this is a mistake." },
      { status: 403 }
    );
  }

  const origin = new URL(request.url).origin;
  try {
    const session = await createDuesCheckoutSession({
      memberId: member.id,
      memberEmail: member.email,
      kind: "invoice",
      invoiceToken: token,
      origin,
      returnUrl: `${origin}/membership/pay/${token}?session_id={CHECKOUT_SESSION_ID}`,
    });
    return NextResponse.json({ clientSecret: session.clientSecret });
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return NextResponse.json({ error: "Online payment isn't configured yet." }, { status: 503 });
    }
    if (err instanceof StripeApiError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    return NextResponse.json({ error: "Could not reach the payment processor. Try again shortly." }, { status: 502 });
  }
}
