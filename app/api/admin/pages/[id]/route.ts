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
