import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { hashPassword } from "@/lib/auth";
import { createMemberSession } from "@/lib/memberAuth";
import { sendVerificationEmail } from "@/lib/portalVerification";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

// Members pick their own email + password directly -- no emailed
// confirmation link gating account creation. Portal access is a privilege of
// active membership, not a way to become a member, so this only ever claims
// an existing "Member"-status row (e.g. one a board admin entered manually,
// or from an approved application) -- it never creates a new members row.
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
  if (!existing || existing.status !== "Member") {
    return NextResponse.json(
      { error: "No active membership found for that email. Contact the board for portal access." },
      { status: 403 }
    );
  }
  if (existing.passwordHash) {
    return NextResponse.json(
      { error: "An account already exists for that email. Log in instead." },
      { status: 409 }
    );
  }

  const { hash, salt } = await hashPassword(password);
  // Conditioned on passwordHash still being NULL so two concurrent signups
  // for the same member can't both "win" the earlier check and both claim
  // the row -- only the first UPDATE to land actually sets it.
  const [claimed] = await db
    .update(members)
    .set({ passwordHash: hash, salt, failedLoginCount: 0, lockedUntil: null, emailVerified: 0 })
    .where(and(eq(members.id, existing.id), isNull(members.passwordHash)))
    .returning({ id: members.id });
  if (!claimed) {
    return NextResponse.json(
      { error: "An account already exists for that email. Log in instead." },
      { status: 409 }
    );
  }
  const memberId = claimed.id;

  await createMemberSession(memberId);
  // Best-effort: a delivery hiccup shouldn't block account creation --
  // the portal dashboard's "resend" button covers a failed/missed send.
  await sendVerificationEmail(new URL(request.url).origin, memberId, normalizedEmail).catch(() => {});
  return NextResponse.json({ ok: true });
}
