import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { createDuesCheckoutSession, StripeApiError, StripeConfigError } from "@/lib/stripe";

// Starts a one-time Stripe Checkout Session for dues -- see the guardrail
// comment at the top of lib/stripe.ts. Used for an existing member's annual
// renewal (components/portal/PaymentSection). app/api/payments/invoice is the
// token-based counterpart for a new applicant paying from their emailed
// invoice link instead of a portal login. Nothing auto-bills; completing
// Checkout is the member's own action.
export async function POST(request: Request) {
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const db = await getDb();
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.email, email.toLowerCase().trim()));
  if (!member) {
    return NextResponse.json(
      { error: "No member found with that email. Contact the club if you believe this is a mistake." },
      { status: 404 }
    );
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
      kind: "dues",
      origin,
      returnUrl: `${origin}/dues/success?session_id={CHECKOUT_SESSION_ID}`,
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
