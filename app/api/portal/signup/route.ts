import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { hashPassword } from "@/lib/auth";
import { createMemberSession } from "@/lib/memberAuth";
import { sendVerificationEmail } from "@/lib/portalVerification";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

// Members pick their own email + password directly -- no emailed
// confirmation link gating account creation. If the email already matches an
// existing members row (e.g. one a board admin entered manually, or from a
// prior paper application) this claims it; otherwise it creates a new one.
export async function POST(request: Request) {
  const { name, email, password } = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
  };
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const db = await getDb();
  const [existing] = await db.select().from(members).where(eq(members.email, normalizedEmail));
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: "An account already exists for that email. Log in instead." },
      { status: 409 }
    );
  }

  const { hash, salt } = await hashPassword(password);
  let memberId: number;
  if (existing) {
    memberId = existing.id;
    await db
      .update(members)
      .set({ passwordHash: hash, salt, failedLoginCount: 0, lockedUntil: null, emailVerified: 0 })
      .where(eq(members.id, memberId));
  } else {
    const [inserted] = await db
      .insert(members)
      .values({ name: name.trim(), email: normalizedEmail, status: "Waiting List", passwordHash: hash, salt })
      .returning({ id: members.id });
    memberId = inserted.id;
  }

  await createMemberSession(memberId);
  // Best-effort: a delivery hiccup shouldn't block account creation --
  // the portal dashboard's "resend" button covers a failed/missed send.
  await sendVerificationEmail(new URL(request.url).origin, memberId, normalizedEmail).catch(() => {});
  return NextResponse.json({ ok: true });
}
