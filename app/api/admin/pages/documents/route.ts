import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentAdmin } from "@/lib/auth";
import { validateCalendarDocument } from "@/lib/calendarImage";

// Documents attached via the in-place page-section editor (EditableSection),
// uploaded here then referenced by the returned public URL in the saved body_html.
export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("document");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A document file is required" }, { status: 400 });
  }
  const error = await validateCalendarDocument(file);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const key = `page-documents/${crypto.randomUUID()}.pdf`;
  await env.DOCS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const origin = new URL(request.url).origin;
  const url = `${origin}/api/page-documents/${key.slice("page-documents/".length)}`;
  return NextResponse.json({ ok: true, url });
}
