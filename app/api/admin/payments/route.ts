import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { payments, members, documents } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();

  const rows = await db
    .select({
      id: payments.id,
      memberId: payments.memberId,
      memberName: members.name,
      memberEmail: members.email,
      amountCents: payments.amountCents,
      currency: payments.currency,
      paymentMethodType: payments.paymentMethodType,
      paidAt: payments.paidAt,
      subscriptionStatus: members.subscriptionStatus,
    })
    .from(payments)
    .innerJoin(members, eq(payments.memberId, members.id))
    .orderBy(desc(payments.paidAt));

  // Cross-check: which members have uploaded a cleanup-day discount card, so
  // the board can spot a reduced payment that isn't backed by one.
  const discountCardDocs = await db
    .select({ memberId: documents.memberId })
    .from(documents)
    .where(eq(documents.category, "discount_card"));
  const membersWithDiscountCard = new Set(discountCardDocs.map((d) => d.memberId));

  const result = rows.map((r) => ({
    ...r,
    hasDiscountCard: membersWithDiscountCard.has(r.memberId),
  }));

  return NextResponse.json(result);
}
