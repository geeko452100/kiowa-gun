import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentAdmin } from "@/lib/auth";
import { MAX_TOTAL_ATTACHMENT_BYTES } from "@/lib/emailAttachments";

// A single file can't usefully exceed the combined send-time budget --
// buildEmailAttachments enforces the real (combined, multi-file) limit at
// send time; this just rejects an obviously-too-big file immediately.
const MAX_BYTES = MAX_TOTAL_ATTACHMENT_BYTES;

// Uploads a file the board wants sent as a real, downloadable attachment
// (e.g. a flyer PDF) rather than shown inline in the message body. The
// returned key is only referenced by the send request that follows --
// nothing else reads it back.
export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File must be smaller than ${(MAX_BYTES / (1024 * 1024)).toFixed(0)}MB.` },
      { status: 400 }
    );
  }

  const { env } = await getCloudflareContext({ async: true });
  const r2Key = `email-attachments/${crypto.randomUUID()}-${file.name}`;
  await env.DOCS.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  return NextResponse.json({ ok: true, r2Key, fileName: file.name });
}
