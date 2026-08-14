import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members, membershipInvoices } from "@/lib/schema";
import { chargeDues, NmiApiError } from "@/lib/nmi";
import { recomputeCanPay, recordDuesPayment } from "@/lib/members";
import { sendAdminEmail } from "@/lib/email";

// Pays a new applicant's first year of dues from the emailed invoice link
// (app/membership/pay/[token]) -- the token-based counterpart to
// app/api/payments/pay, which requires a portal login instead.
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

  let transaction;
  try {
    transaction = await chargeDues(member, paymentToken);
  } catch (err) {
    if (err instanceof NmiApiError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    return NextResponse.json({ error: "Could not reach the payment processor. Try again shortly." }, { status: 502 });
  }

  await recordDuesPayment(db, member, transaction);
  await db.update(members).set({ status: "Member" }).where(eq(members.id, member.id));
  await db.update(membershipInvoices).set({ paidAt: new Date().toISOString() }).where(eq(membershipInvoices.id, invoice.id));
  await recomputeCanPay(db, member.id);

  const origin = new URL(request.url).origin;
  const signupLink = `${origin}/portal/signup`;
  await sendAdminEmail(
    member.email,
    "Welcome to Kiowa Gun Club — Set Up Your Member Portal Account",
    `<p>Your membership is approved and your dues are paid. You're officially a Kiowa Gun Club member!</p>
     <p><a href="${signupLink}">Create your member portal account</a> to log in, manage your membership, and access member resources.</p>`
  );

  return NextResponse.json({ ok: true });
}
