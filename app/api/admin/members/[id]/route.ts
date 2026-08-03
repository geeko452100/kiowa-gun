import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { name, email, phone, status } = (await request.json()) as {
    name: string;
    email: string;
    phone?: string;
    status: string;
  };
  const db = await getDb();
  await db
    .update(members)
    .set({ name, email: String(email).toLowerCase().trim(), phone: phone || null, status })
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
