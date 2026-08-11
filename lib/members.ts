import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { members } from "./schema";

// Single source of truth for whether a member is currently allowed to pay
// dues (checked by every payment entry point -- app/api/payments/subscribe
// and app/api/payments/invoice -- instead of each one re-deriving
// eligibility from status/backgroundCheckCleared/nraActive itself). Call
// this any time one of those underlying inputs changes rather than setting
// can_pay directly.
export async function recomputeCanPay(db: Awaited<ReturnType<typeof getDb>>, memberId: number) {
  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) return;

  const canPay = member.status === "Member" ? member.nraActive : member.backgroundCheckCleared;
  if (canPay !== member.canPay) {
    await db.update(members).set({ canPay }).where(eq(members.id, memberId));
  }
}
