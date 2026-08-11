import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { memberEmailVerificationTokens } from "./schema";
import { generateToken } from "./auth";
import { sendAdminEmail } from "./email";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Shared by signup (app/api/portal/signup) and manual resend
// (app/api/portal/resend-verification) -- same link, same lifetime.
export async function sendVerificationEmail(origin: string, memberId: number, email: string) {
  const db = await getDb();
  await db.delete(memberEmailVerificationTokens).where(eq(memberEmailVerificationTokens.memberId, memberId));
  const token = generateToken();
  await db.insert(memberEmailVerificationTokens).values({
    memberId,
    token,
    expiresAt: Date.now() + VERIFICATION_TTL_MS,
  });

  const link = `${origin}/api/portal/verify-email?token=${token}`;
  await sendAdminEmail(
    email,
    "Verify your email - Kiowa Gun Club member portal",
    `<p>Thanks for signing up for the Kiowa Gun Club member portal. Please confirm this is your email address.</p>
     <p><a href="${link}">Verify your email</a></p>
     <p>This link expires in 24 hours. If you didn't create a portal account, you can safely ignore this message.</p>`
  );
}
