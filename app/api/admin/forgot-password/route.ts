import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminUsers, passwordResetTokens } from "@/lib/schema";
import { generateToken } from "@/lib/auth";
import { sendAdminEmail } from "@/lib/email";
import { checkRateLimit, RATE_LIMITED_RESPONSE_BODY } from "@/lib/rateLimit";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // don't re-email the same inbox more than once every 2 minutes

const GENERIC_MESSAGE = "If that email is linked to an admin account, we've sent a link to reset your password.";

// Public and unauthenticated by design (that's the point of "forgot password"),
// so the response must be identical whether or not the email belongs to an
// admin — never reveal which emails have logins.
export async function POST(request: Request) {
  if (!(await checkRateLimit("admin-forgot-password", request))) {
    return NextResponse.json(RATE_LIMITED_RESPONSE_BODY, { status: 429 });
  }

  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const db = await getDb();
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, String(email).toLowerCase().trim()))
    .limit(1);

  if (admin) {
    const [recent] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.adminUserId, admin.id))
      .orderBy(desc(passwordResetTokens.id))
      .limit(1);
    const issuedAt = recent ? recent.expiresAt - RESET_TTL_MS : 0;
    const recentlySent = Date.now() - issuedAt < RESEND_COOLDOWN_MS;

    if (!recentlySent) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.adminUserId, admin.id));
      const token = generateToken();
      await db.insert(passwordResetTokens).values({
        adminUserId: admin.id,
        token,
        expiresAt: Date.now() + RESET_TTL_MS,
      });

      const origin = new URL(request.url).origin;
      const link = `${origin}/admin/reset-password?token=${token}`;
      await sendAdminEmail(
        admin.email,
        "Reset your Kiowa Gun Club admin password",
        `<p>We received a request to reset the password on your Kiowa Gun Club admin account.</p>
         <p><a href="${link}">Set a new password</a></p>
         <p>This link expires in 1 hour. If you didn't request this, feel free to ignore it — your password won't change.</p>`
      );
    }
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
