import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { getCurrentMember } from "@/lib/memberAuth";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = (await request.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  const currentOk =
    !!member.passwordHash && !!member.salt && (await verifyPassword(currentPassword, member.salt, member.passwordHash));
  if (!currentOk) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const { hash, salt } = await hashPassword(newPassword);
  const db = await getDb();
  await db.update(members).set({ passwordHash: hash, salt }).where(eq(members.id, member.id));

  return NextResponse.json({ ok: true });
}
