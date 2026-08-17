import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import {
  verifyPassword,
  hashPassword,
  needsRehash,
  DUMMY_SALT,
  DUMMY_HASH,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOGIN_LOCKOUT_MS,
} from "@/lib/auth";
import { createMemberSession } from "@/lib/memberAuth";
import { checkRateLimit, RATE_LIMITED_RESPONSE_BODY } from "@/lib/rateLimit";

const INVALID_CREDENTIALS = NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

export async function POST(request: Request) {
  // Per-account lockout below doesn't stop credential stuffing spread across
  // many member accounts from one IP -- this catches that.
  if (!(await checkRateLimit("portal-login", request))) {
    return NextResponse.json(RATE_LIMITED_RESPONSE_BODY, { status: 429 });
  }

  const { email, password, remember } = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    remember?: boolean;
  };
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const db = await getDb();
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.email, String(email).toLowerCase().trim()))
    .limit(1);

  // Always run the (slow) password hash, even for an unknown email or one
  // that hasn't set up portal login yet, so response timing can't be used to
  // tell which emails have an account.
  const passwordOk = await verifyPassword(password, member?.salt ?? DUMMY_SALT, member?.passwordHash ?? DUMMY_HASH);

  if (!member || !member.passwordHash) {
    return INVALID_CREDENTIALS;
  }

  if (member.lockedUntil && member.lockedUntil > Date.now()) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  if (!passwordOk) {
    const failedLoginCount = member.failedLoginCount + 1;
    const lockedOut = failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS;
    await db
      .update(members)
      .set({
        failedLoginCount: lockedOut ? 0 : failedLoginCount,
        lockedUntil: lockedOut ? Date.now() + LOGIN_LOCKOUT_MS : null,
      })
      .where(eq(members.id, member.id));
    return INVALID_CREDENTIALS;
  }

  if (member.failedLoginCount > 0 || member.lockedUntil) {
    await db
      .update(members)
      .set({ failedLoginCount: 0, lockedUntil: null })
      .where(eq(members.id, member.id));
  }

  // Transparently upgrade hashes written under an older, lower PBKDF2 cost.
  if (needsRehash(member.passwordHash)) {
    const { hash, salt } = await hashPassword(password);
    await db.update(members).set({ passwordHash: hash, salt }).where(eq(members.id, member.id));
  }

  await createMemberSession(member.id, Boolean(remember));
  return NextResponse.json({ ok: true });
}
