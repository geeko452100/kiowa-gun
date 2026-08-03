import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, Number(id)))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const object = await env.DOCS.get(doc.r2Key);
  if (!object) {
    return NextResponse.json({ error: "File missing from storage" }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/pdf",
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
