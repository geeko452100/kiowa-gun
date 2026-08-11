import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Deliberately unauthenticated: these documents are linked from public page
// content, so every site visitor's browser must be able to load them directly.
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.DOCS.get(`page-documents/${key}`);
  if (!object) {
    return NextResponse.json({ error: "Document missing from storage" }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
