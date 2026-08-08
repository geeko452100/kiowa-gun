import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Deliberately unauthenticated: SignalWire fetches this directly to relay
// it to carriers, with no session of its own.
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.DOCS.get(`sms-media/${key}`);
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
