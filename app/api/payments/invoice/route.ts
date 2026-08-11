import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members, membershipInvoices } from "@/lib/schema";
import { createDuesSubscription, NmiApiError } from "@/lib/nmi";
import { recomputeCanPay } from "@/lib/members";

// Pays a new applicant's first year of dues from the emailed invoice link
// (app/membership/pay/[token]) -- the token-based counterpart to
// app/api/payments/subscribe, which requires a portal login instead.
export async function POST(request: Request) {
  const { token, paymentToken } = (await request.json().catch(() => ({}))) as {
    token?: string;
    paymentToken?: string;
  };
  if (!token || !paymentToken) {
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
      nmiCustomerVaultId: result.customer_vault_id || null,
      nmiSubscriptionId: result.id,
      subscriptionStatus: "active",
      status: "Member",
    })
    .where(eq(members.id, member.id));

  await db.update(membershipInvoices).set({ paidAt: new Date().toISOString() }).where(eq(membershipInvoices.id, invoice.id));
  await recomputeCanPay(db, member.id);

  return NextResponse.json({ ok: true });
}
