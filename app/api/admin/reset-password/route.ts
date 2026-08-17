import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminUsers, passwordResetTokens } from "@/lib/schema";
import { hashPassword, destroyOtherSessions } from "@/lib/auth";

export async function POST(request: Request) {
  const { token, password } = (await request.json()) as { token?: string; password?: string };
  if (!token || !password) {
    return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
  }
  if (password.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
  }

  const db = await getDb();
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  if (!row || row.expiresAt < Date.now()) {
    return NextResponse.json(
      { error: "This link is invalid or has expired. Ask a board admin to send a new one." },
      { status: 400 }
    );
  }

  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, row.adminUserId)).limit(1);
  if (!admin) {
    return NextResponse.json({ error: "This login no longer exists" }, { status: 400 });
  }

  const { hash, salt } = await hashPassword(password);
  await db
    .update(adminUsers)
    .set({ passwordHash: hash, salt, failedLoginCount: 0, lockedUntil: null })
    .where(eq(adminUsers.id, admin.id));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.adminUserId, admin.id));
  // No active session at this point (this is the unauthenticated token
  // flow) -- but if the admin's cookie was compromised, this makes sure it
  // doesn't survive the reset.
  await destroyOtherSessions(admin.id);

  return NextResponse.json({ ok: true });
}
