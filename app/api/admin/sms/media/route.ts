import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentAdmin } from "@/lib/auth";
import { validateCalendarImage } from "@/lib/calendarImage";

// Uploads a picture the board wants sent as MMS. SignalWire fetches the
// image from the public URL this returns, so it's stored the same way as
// calendar/match photos rather than sent inline in the request.
export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  }
  const error = validateCalendarImage(image);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const key = `sms-media/${crypto.randomUUID()}-${image.name}`;
  await env.DOCS.put(key, await image.arrayBuffer(), {
    httpMetadata: { contentType: image.type },
  });

  const origin = new URL(request.url).origin;
  const url = `${origin}/api/sms-media/${key.slice("sms-media/".length)}`;
  return NextResponse.json({ ok: true, url });
}
