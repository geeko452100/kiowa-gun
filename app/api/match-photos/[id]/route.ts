import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { matchPhotos } from "@/lib/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [photo] = await db
    .select()
    .from(matchPhotos)
    .where(eq(matchPhotos.id, Number(id)))
    .limit(1);

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const object = await env.DOCS.get(photo.r2Key);
  if (!object) {
    return NextResponse.json({ error: "Image missing from storage" }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
      "Content-Disposition": `inline; filename="${photo.fileName}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
