import { NextResponse } from "next/server";
import { eq, ne, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminUsers, passwordResetTokens } from "@/lib/schema";
import { getCurrentAdmin, generateToken } from "@/lib/auth";
import { canManageBoard, canManageRole, normalizeRole } from "@/lib/roles";
import { sendAdminEmail } from "@/lib/email";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

async function countOtherWithRole(db: Awaited<ReturnType<typeof getDb>>, role: string, excludeId: number) {
  const rows = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(and(eq(adminUsers.role, role), ne(adminUsers.id, excludeId)));
  return rows.length;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canManageBoard(admin.role)) {
    return NextResponse.json({ error: "President or tech admin access required" }, { status: 403 });
  }
  const { id } = await params;
  const targetId = Number(id);
  const db = await getDb();

  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, targetId)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "Board member not found" }, { status: 404 });
  }
  if (!canManageRole(admin.role, target.role)) {
    return NextResponse.json({ error: "Only a tech admin can change this login" }, { status: 403 });
  }

  const body = (await request.json()) as {
    action: string;
    role?: string;
    position?: string;
    name?: string;
    email?: string;
    phone?: string;
  };

  if (body.action === "reset_password") {
    // Invalidate any outstanding links for this login, then email a fresh
    // one. The admin triggering this never sees the resulting password —
    // only whoever controls that inbox can complete the reset. Their current
    // password keeps working until they do.
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.adminUserId, targetId));
    const token = generateToken();
    await db.insert(passwordResetTokens).values({
      adminUserId: targetId,
      token,
      expiresAt: Date.now() + RESET_TTL_MS,
    });

    const origin = new URL(request.url).origin;
    const link = `${origin}/admin/reset-password?token=${token}`;
    await sendAdminEmail(
      target.email,
      "Reset your Kiowa Gun Club admin password",
      `<p>${admin.name} requested a password reset for your Kiowa Gun Club admin login.</p>
       <p><a href="${link}">Click here to set a new password</a>.</p>
       <p>This link expires in 1 hour. If you didn't expect this, you can ignore it — your current password still works.</p>`
    );

    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_role") {
    const nextRole = normalizeRole(body.role);
    if (!canManageRole(admin.role, nextRole)) {
      return NextResponse.json({ error: "Only a tech admin can grant tech admin access" }, { status: 403 });
    }
    if (
      target.role !== nextRole &&
      (target.role === "president" || target.role === "tech_admin") &&
      (await countOtherWithRole(db, target.role, targetId)) === 0
    ) {
      return NextResponse.json(
        { error: `Can't remove the last ${target.role === "tech_admin" ? "tech admin" : "president"} — promote someone else first` },
        { status: 400 }
      );
    }
    await db.update(adminUsers).set({ role: nextRole }).where(eq(adminUsers.id, targetId));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unlock") {
    await db
      .update(adminUsers)
      .set({ failedLoginCount: 0, lockedUntil: null })
      .where(eq(adminUsers.id, targetId));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_position") {
    const position = body.position?.trim() || null;
    await db.update(adminUsers).set({ position }).where(eq(adminUsers.id, targetId));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_details") {
    const updates: { name?: string; email?: string; phone?: string | null } = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      updates.name = name;
    }
    if (body.email !== undefined) {
      const normalizedEmail = body.email.toLowerCase().trim();
      if (!normalizedEmail) return NextResponse.json({ error: "Email is required" }, { status: 400 });
      updates.email = normalizedEmail;
    }
    if (body.phone !== undefined) {
      updates.phone = body.phone.trim() || null;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    try {
      await db.update(adminUsers).set(updates).where(eq(adminUsers.id, targetId));
    } catch {
      return NextResponse.json({ error: "Another login already uses that email" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...updates });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !canManageBoard(admin.role)) {
    return NextResponse.json({ error: "President or tech admin access required" }, { status: 403 });
  }
  const { id } = await params;
  const targetId = Number(id);

  if (targetId === admin.id) {
    return NextResponse.json({ error: "You can't remove your own login" }, { status: 400 });
  }

  const db = await getDb();
  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, targetId)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "Board member not found" }, { status: 404 });
  }
  if (!canManageRole(admin.role, target.role)) {
    return NextResponse.json({ error: "Only a tech admin can remove this login" }, { status: 403 });
  }
  if (
    (target.role === "president" || target.role === "tech_admin") &&
    (await countOtherWithRole(db, target.role, targetId)) === 0
  ) {
    return NextResponse.json(
      { error: `Can't remove the last ${target.role === "tech_admin" ? "tech admin" : "president"} — promote someone else first` },
      { status: 400 }
    );
  }

  await db.delete(adminUsers).where(eq(adminUsers.id, targetId));
  return NextResponse.json({ ok: true });
}
