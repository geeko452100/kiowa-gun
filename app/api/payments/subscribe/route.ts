import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { nmiRequest, NmiApiError, toNmiDate } from "@/lib/nmi";
import { DUES_AMOUNT_CENTS } from "@/lib/constants";

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? name, lastName: parts.slice(1).join(" ") || parts[0] || name };
}

// Starts a member's recurring annual dues subscription from an NMI Collect.js
// payment_token (see components/nmi/CardFields.tsx) -- the NMI equivalent of
// the old Stripe Checkout redirect, except the card form is embedded on our
// own page instead of a hosted page we send the member to.
export async function POST(request: Request) {
  const { email, paymentToken } = (await request.json().catch(() => ({}))) as {
    email?: string;
    paymentToken?: string;
  };
  if (!email || !paymentToken) {
    return NextResponse.json({ error: "Email and payment info are required" }, { status: 400 });
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

  const { firstName, lastName } = splitName(member.name);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  let result;
  try {
    result = await nmiRequest("/subscriptions", "POST", {
      plan_amount: (DUES_AMOUNT_CENTS / 100).toFixed(2),
      // 0 = renews indefinitely until canceled, not a fixed number of payments.
      plan_payments: 0,
      month_frequency: 12,
      day_of_month: tomorrow.getDate(),
      start_date: toNmiDate(tomorrow),
      payment_details: { payment_token: paymentToken },
      billing_address: { first_name: firstName, last_name: lastName, email: member.email },
    });
  } catch (err) {
    if (err instanceof NmiApiError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    return NextResponse.json({ error: "Could not reach the payment processor. Try again shortly." }, { status: 502 });
  }

  await db
    .update(members)
    .set({
      // customer_vault_id often comes back blank on subscription creation --
      // don't write an empty string into a UNIQUE column (every empty-string
      // member would collide on the 2nd signup). nmiSubscriptionId is always
      // present and unique, so it's the reliable link.
      nmiCustomerVaultId: result.customer_vault_id || null,
      nmiSubscriptionId: result.id,
      subscriptionStatus: "active",
    })
    .where(eq(members.id, member.id));

  return NextResponse.json({ ok: true });
}
