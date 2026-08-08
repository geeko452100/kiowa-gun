import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members, MEMBER_STATUSES } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { name, email, phone, status, renewalDate } = (await request.json()) as {
    name: string;
    email: string;
    phone?: string;
    status: string;
    renewalDate?: string | null;
  };
  if (!MEMBER_STATUSES.includes(status as (typeof MEMBER_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const db = await getDb();
  await db
    .update(members)
    .set({
      name,
      email: String(email).toLowerCase().trim(),
      phone: phone || null,
      status,
      renewalDate: renewalDate || null,
    })
    .where(eq(members.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  await db.delete(members).where(eq(members.id, Number(id)));
  return NextResponse.json({ ok: true });
}
