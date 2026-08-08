import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentAdmin } from "@/lib/auth";
import { validateCalendarImage } from "@/lib/calendarImage";

// Images embedded in the email composer are uploaded here first, then
// referenced by the returned absolute URL in the message HTML — recipients'
// mail clients fetch that URL directly, so it must be public and stable.
export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  }
  const error = validateCalendarImage(image);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const ext = image.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = `email-images/${crypto.randomUUID()}.${ext}`;
  await env.DOCS.put(key, await image.arrayBuffer(), {
    httpMetadata: { contentType: image.type },
  });

  const origin = new URL(request.url).origin;
  const url = `${origin}/api/email-images/${key.slice("email-images/".length)}`;
  return NextResponse.json({ ok: true, url });
}
