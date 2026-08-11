import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { heading, bodyHtml } = (await request.json()) as { heading?: string; bodyHtml: string };
  const db = await getDb();
  await db
    .update(pageSections)
    .set({ heading, bodyHtml, updatedAt: new Date().toISOString() })
    .where(eq(pageSections.id, Number(id)));
  return NextResponse.json({ ok: true });
}

// Only board-added sections (section_key prefixed "custom-", created via the
// "+ Add a section" control) can be deleted -- the fixed, seeded sections
// that make up each page's base layout are not removable here.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  const [section] = await db
    .select()
    .from(pageSections)
    .where(eq(pageSections.id, Number(id)))
    .limit(1);
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
  if (!section.sectionKey.startsWith("custom-")) {
    return NextResponse.json({ error: "This section can't be deleted" }, { status: 400 });
  }
  await db.delete(pageSections).where(eq(pageSections.id, Number(id)));
  return NextResponse.json({ ok: true });
}
