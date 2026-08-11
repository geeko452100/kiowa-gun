import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Deliberately unauthenticated: these images are embedded in public page
// content, so every site visitor's browser must be able to load them directly.
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.DOCS.get(`page-images/${key}`);
  if (!object) {
    return NextResponse.json({ error: "Image missing from storage" }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
