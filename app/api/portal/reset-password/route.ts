import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members, memberPasswordResetTokens } from "@/lib/schema";
import { hashPassword } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

export async function POST(request: Request) {
  const { token, password } = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
  if (!token || !password) {
    return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  const db = await getDb();
  const [row] = await db
    .select()
    .from(memberPasswordResetTokens)
    .where(eq(memberPasswordResetTokens.token, token))
    .limit(1);
  if (!row || row.expiresAt < Date.now()) {
    return NextResponse.json(
      { error: "This link is invalid or has expired. Request a new one from the forgot-password page." },
      { status: 400 }
    );
  }

  const [member] = await db.select().from(members).where(eq(members.id, row.memberId)).limit(1);
  if (!member) {
    return NextResponse.json({ error: "This login no longer exists" }, { status: 400 });
  }

  const { hash, salt } = await hashPassword(password);
  await db
    .update(members)
    .set({ passwordHash: hash, salt, failedLoginCount: 0, lockedUntil: null })
    .where(eq(members.id, member.id));
  await db.delete(memberPasswordResetTokens).where(eq(memberPasswordResetTokens.memberId, member.id));

  return NextResponse.json({ ok: true });
}
