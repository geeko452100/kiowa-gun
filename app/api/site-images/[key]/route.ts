import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { siteImages } from "@/lib/schema";

// Deliberately unauthenticated: these are board-swapped replacements for
// images shown on public pages (nav logo/hero, rules photo, matches flyer).
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const db = await getDb();
  const [row] = await db.select().from(siteImages).where(eq(siteImages.key, key)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "No image set for this slot" }, { status: 404 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const object = await env.DOCS.get(row.r2Key);
  if (!object) {
    return NextResponse.json({ error: "Image missing from storage" }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=300",
    },
  });
}
