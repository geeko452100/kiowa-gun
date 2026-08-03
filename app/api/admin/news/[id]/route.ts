import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { newsPosts } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { title, bodyHtml, isPublished } = (await request.json()) as {
    title: string;
    bodyHtml: string;
    isPublished: boolean;
  };
  const db = await getDb();
  await db
    .update(newsPosts)
    .set({ title, bodyHtml, isPublished: isPublished ? 1 : 0 })
    .where(eq(newsPosts.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  await db.delete(newsPosts).where(eq(newsPosts.id, Number(id)));
  return NextResponse.json({ ok: true });
}
