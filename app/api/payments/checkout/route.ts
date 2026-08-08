import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { getStripe } from "@/lib/stripe";
import { DUES_AMOUNT_CENTS } from "@/lib/constants";

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

  const origin = new URL(request.url).origin;
  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: member.email,
    metadata: { memberId: String(member.id) },
    managed_payments: { enabled: false },
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Gun-Club Membership" },
          unit_amount: DUES_AMOUNT_CENTS,
        },
        quantity: 1,
      },
    ],
    // Deliberately omitting payment_method_types: leaving it unset makes
    // Checkout offer every payment method enabled in the Stripe Dashboard
    // (ACH, Cash App, etc.), not just cards. Setting it would restrict to
    // that fixed list instead.
    success_url: `${origin}/dues/success`,
    cancel_url: `${origin}/dues/cancel`,
  });

  return NextResponse.json({ url: session.url });
}
