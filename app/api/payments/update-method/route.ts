import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { getCurrentMember } from "@/lib/memberAuth";
import { nmiRequest, NmiApiError } from "@/lib/nmi";

// NMI has no hosted equivalent of Stripe's Billing Portal -- updating the
// card on an existing subscription means submitting a new Collect.js token
// against it directly, via our own form (components/nmi/CardFields.tsx in
// components/portal/PaymentSection.tsx).
export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!member.nmiSubscriptionId) {
    return NextResponse.json({ error: "No dues subscription found yet. Pay your dues once to set one up." }, { status: 400 });
  }

  const { paymentToken } = (await request.json().catch(() => ({}))) as { paymentToken?: string };
  if (!paymentToken) {
    return NextResponse.json({ error: "Payment info is required" }, { status: 400 });
  }

  try {
    await nmiRequest(`/subscriptions/${member.nmiSubscriptionId}`, "PUT", {
      payment_details: { payment_token: paymentToken },
    });
  } catch (err) {
    if (err instanceof NmiApiError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    return NextResponse.json({ error: "Could not reach the payment processor. Try again shortly." }, { status: 502 });
  }

  const db = await getDb();
  await db.update(members).set({ subscriptionStatus: "active" }).where(eq(members.id, member.id));

  return NextResponse.json({ ok: true });
}
