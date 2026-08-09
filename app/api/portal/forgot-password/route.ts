import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members, memberPasswordResetTokens } from "@/lib/schema";
import { generateToken } from "@/lib/auth";
import { sendAdminEmail } from "@/lib/email";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // don't re-email the same inbox more than once every 2 minutes

const GENERIC_MESSAGE = "If that email has a portal login, we've sent a link to reset the password.";

// Public and unauthenticated by design, so the response must be identical
// whether or not the email belongs to a member with a portal login -- never
// reveal which emails have accounts. Mirrors app/api/admin/forgot-password.
export async function POST(request: Request) {
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const db = await getDb();
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.email, String(email).toLowerCase().trim()))
    .limit(1);

  if (member?.passwordHash) {
    const [recent] = await db
      .select()
      .from(memberPasswordResetTokens)
      .where(eq(memberPasswordResetTokens.memberId, member.id))
      .orderBy(desc(memberPasswordResetTokens.id))
      .limit(1);
    const issuedAt = recent ? recent.expiresAt - RESET_TTL_MS : 0;
    const recentlySent = Date.now() - issuedAt < RESEND_COOLDOWN_MS;

    if (!recentlySent) {
      await db.delete(memberPasswordResetTokens).where(eq(memberPasswordResetTokens.memberId, member.id));
      const token = generateToken();
      await db.insert(memberPasswordResetTokens).values({
        memberId: member.id,
        token,
        expiresAt: Date.now() + RESET_TTL_MS,
      });

      const origin = new URL(request.url).origin;
      const link = `${origin}/portal/reset-password?token=${token}`;
      await sendAdminEmail(
        member.email,
        "Reset your Kiowa Gun Club member portal password",
        `<p>Someone requested a password reset for this Kiowa Gun Club member portal login.</p>
         <p><a href="${link}">Click here to set a new password</a>.</p>
         <p>This link expires in 1 hour. If you didn't request this, you can ignore it — your current password still works.</p>`
      );
    }
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
