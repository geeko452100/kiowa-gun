import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, Number(id)))
    .limit(1);

  if (doc) {
    const { env } = await getCloudflareContext({ async: true });
    await env.DOCS.delete(doc.r2Key);
    await db.delete(documents).where(eq(documents.id, Number(id)));
  }

  return NextResponse.json({ ok: true });
}
