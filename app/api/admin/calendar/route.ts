import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { calendarEvents } from "@/lib/schema";
import { buildRecurringSeries } from "@/lib/recurrence";
import { getCurrentAdmin } from "@/lib/auth";
import { validateCalendarImage, validateCalendarDocument } from "@/lib/calendarImage";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.select().from(calendarEvents);
  return NextResponse.json(rows);
}

type SeriesPostBody = {
  mode: "series";
  title: string;
  weekday?: number;
  nth?: number;
  time?: string;
  color?: string;
  startYear?: number;
  startMonth?: number;
  monthCount?: number;
};

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const title = String(formData.get("title") ?? "");
    const start = String(formData.get("start") ?? "");
    const color = String(formData.get("color") || "#2c3e1f");
    const description = String(formData.get("description") ?? "");
    const image = formData.get("image");
    const document = formData.get("document");
    const linkUrl = String(formData.get("linkUrl") ?? "").trim();
    const linkLabel = String(formData.get("linkLabel") ?? "").trim();

    if (!title || !start) {
      return NextResponse.json({ error: "Title and date & time are required" }, { status: 400 });
    }
    if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
      return NextResponse.json({ error: "Link must start with http:// or https://" }, { status: 400 });
    }

    const { env } = await getCloudflareContext({ async: true });

    let imageR2Key: string | null = null;
    let imageFileName: string | null = null;
    if (image instanceof File && image.size > 0) {
      const error = validateCalendarImage(image);
      if (error) return NextResponse.json({ error }, { status: 400 });
      imageR2Key = `calendar/${crypto.randomUUID()}-${image.name}`;
      await env.DOCS.put(imageR2Key, await image.arrayBuffer(), {
        httpMetadata: { contentType: image.type },
      });
      imageFileName = image.name;
    }

    let documentR2Key: string | null = null;
    let documentFileName: string | null = null;
    if (document instanceof File && document.size > 0) {
      const error = validateCalendarDocument(document);
      if (error) return NextResponse.json({ error }, { status: 400 });
      documentR2Key = `calendar/${crypto.randomUUID()}-${document.name}`;
      await env.DOCS.put(documentR2Key, await document.arrayBuffer(), {
        httpMetadata: { contentType: "application/pdf" },
      });
      documentFileName = document.name;
    }

    await db.insert(calendarEvents).values({
      title,
      start,
      color,
      description: description || null,
      imageR2Key,
      imageFileName,
      documentR2Key,
      documentFileName,
      linkUrl: linkUrl || null,
      linkLabel: linkUrl ? linkLabel || null : null,
    });
    return NextResponse.json({ ok: true });
  }

  const body = (await request.json()) as SeriesPostBody;
  if (body.mode !== "series") {
    return NextResponse.json({ error: "Unsupported request" }, { status: 400 });
  }
  const events = buildRecurringSeries({
    title: body.title,
    weekday: Number(body.weekday),
    nth: Number(body.nth),
    time: body.time || "12:00",
    color: body.color || "#2c3e1f",
    startYear: Number(body.startYear),
    startMonth: Number(body.startMonth),
    monthCount: Number(body.monthCount),
  });
  if (events.length > 0) {
    await db.insert(calendarEvents).values(events);
  }
  return NextResponse.json({ ok: true, created: events.length });
}
