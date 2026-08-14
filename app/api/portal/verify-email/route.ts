import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members, memberEmailVerificationTokens } from "@/lib/schema";

// Public by design (that's the point of an emailed link -- it may be opened
// on a different device/browser than the one that's logged in) -- add to
// proxy.ts's PUBLIC_PORTAL_PATHS accordingly.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const origin = new URL(request.url).origin;
  if (!token) {
    return NextResponse.redirect(`${origin}/portal/verify-pending?verifyError=1`);
  }

  const db = await getDb();
  const [row] = await db
    .select()
    .from(memberEmailVerificationTokens)
    .where(eq(memberEmailVerificationTokens.token, token))
    .limit(1);
  if (!row || row.expiresAt < Date.now()) {
    return NextResponse.redirect(`${origin}/portal/verify-pending?verifyError=1`);
  }

  await db.update(members).set({ emailVerified: 1 }).where(eq(members.id, row.memberId));
  await db.delete(memberEmailVerificationTokens).where(eq(memberEmailVerificationTokens.memberId, row.memberId));

  return NextResponse.redirect(`${origin}/portal?verified=1`);
}
