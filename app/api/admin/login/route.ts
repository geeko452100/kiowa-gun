import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminUsers } from "@/lib/schema";
import {
  verifyPassword,
  createSession,
  DUMMY_SALT,
  DUMMY_HASH,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOGIN_LOCKOUT_MS,
} from "@/lib/auth";

const INVALID_CREDENTIALS = NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

export async function POST(request: Request) {
  const { email, password, remember } = (await request.json()) as {
    email: string;
    password: string;
    remember?: boolean;
  };
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const db = await getDb();
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, String(email).toLowerCase().trim()))
    .limit(1);

  // Always run the (slow) password hash, even for an unknown email, so
  // response timing can't be used to tell which admin emails exist.
  const passwordOk = await verifyPassword(password, admin?.salt ?? DUMMY_SALT, admin?.passwordHash ?? DUMMY_HASH);

  if (!admin) {
    return INVALID_CREDENTIALS;
  }

  if (admin.lockedUntil && admin.lockedUntil > Date.now()) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  if (!passwordOk) {
    const failedLoginCount = admin.failedLoginCount + 1;
    const lockedOut = failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS;
    await db
      .update(adminUsers)
      .set({
        failedLoginCount: lockedOut ? 0 : failedLoginCount,
        lockedUntil: lockedOut ? Date.now() + LOGIN_LOCKOUT_MS : null,
      })
      .where(eq(adminUsers.id, admin.id));
    return INVALID_CREDENTIALS;
  }

  if (admin.failedLoginCount > 0 || admin.lockedUntil) {
    await db
      .update(adminUsers)
      .set({ failedLoginCount: 0, lockedUntil: null })
      .where(eq(adminUsers.id, admin.id));
  }

  await createSession(admin.id, Boolean(remember));
  return NextResponse.json({ ok: true });
}
