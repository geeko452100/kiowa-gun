import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { chargeDues, NmiApiError } from "@/lib/nmi";
import { recordDuesPayment } from "@/lib/members";

// Charges a member's dues as a single one-time sale from an NMI Collect.js
// payment_token -- see the guardrail comment at the top of lib/nmi.ts. Used
// both for a brand-new applicant's first payment (components/MembershipForm,
// mode "apply") and for an existing member's annual renewal payment
// (components/portal/PaymentSection) -- same "pay dues right now" action
// either way, since nothing auto-bills. app/api/payments/invoice is the
// token-based counterpart for a new applicant paying from their emailed
// invoice link instead of a portal login.
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

  return NextResponse.json({ ok: true });
}
