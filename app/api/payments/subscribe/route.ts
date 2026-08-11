import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { createDuesSubscription, NmiApiError } from "@/lib/nmi";

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
  if (!member.canPay) {
    return NextResponse.json(
      { error: "Your account isn't currently eligible to pay dues. Contact the club if you believe this is a mistake." },
      { status: 403 }
    );
  }

  let result;
  try {
    result = await createDuesSubscription(member, paymentToken);
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
