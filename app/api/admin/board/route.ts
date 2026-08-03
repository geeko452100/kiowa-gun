import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminUsers, members, passwordResetTokens } from "@/lib/schema";
import { getCurrentAdmin, hashRandomPlaceholderPassword, generateToken } from "@/lib/auth";
import { canManageBoard, canManageRole, normalizeRole } from "@/lib/roles";
import { sendAdminEmail } from "@/lib/email";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin || !canManageBoard(admin.role)) {
    return NextResponse.json({ error: "President or tech admin access required" }, { status: 403 });
  }
  const db = await getDb();
  const rows = await db
    .select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email, role: adminUsers.role, createdAt: adminUsers.createdAt })
    .from(adminUsers)
    .orderBy(desc(adminUsers.createdAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !canManageBoard(admin.role)) {
    return NextResponse.json({ error: "President or tech admin access required" }, { status: 403 });
  }

  const { name, email, role } = (await request.json()) as {
    name: string;
    email: string;
    role?: string;
  };
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }
  const finalRole = normalizeRole(role);
  if (!canManageRole(admin.role, finalRole)) {
    return NextResponse.json({ error: "Only a tech admin can create another tech admin login" }, { status: 403 });
  }

  const db = await getDb();
  const normalizedEmail = String(email).toLowerCase().trim();

  // Nobody — not even the admin creating this login — ever knows this
  // password. The new board member sets their own via the emailed link below.
  const { hash, salt } = await hashRandomPlaceholderPassword();

  try {
    await db.insert(adminUsers).values({
      name,
      email: normalizedEmail,
      passwordHash: hash,
      salt,
      role: finalRole,
    });
  } catch {
    return NextResponse.json({ error: "A board member with that email already exists" }, { status: 400 });
  }

  // Board members are club members too — make sure they show up on the Members
  // page and receive newsletters, without clobbering an existing member entry.
  await db.insert(members).values({ name, email: normalizedEmail, status: "active" }).onConflictDoNothing();

  const [created] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail))
    .limit(1);

  const token = generateToken();
  await db.insert(passwordResetTokens).values({
    adminUserId: created.id,
    token,
    expiresAt: Date.now() + INVITE_TTL_MS,
  });

  const origin = new URL(request.url).origin;
  const link = `${origin}/admin/reset-password?token=${token}`;
  await sendAdminEmail(
    normalizedEmail,
    "Set up your Kiowa Gun Club admin login",
    `<p>${admin.name} added you as a board member on the Kiowa Gun Club admin site.</p>
     <p><a href="${link}">Click here to set your password</a> and finish setting up your login.</p>
     <p>This link expires in 7 days.</p>`
  );

  return NextResponse.json({ ok: true, email: normalizedEmail });
}
