import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { calendarEvents } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { validateCalendarImage, validateCalendarDocument } from "@/lib/calendarImage";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();

  const [existing] = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, Number(id)))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "");
  const start = String(formData.get("start") ?? "");
  const color = String(formData.get("color") || "#2c3e1f");
  const description = String(formData.get("description") ?? "");
  const removeImage = formData.get("removeImage") === "true";
  const image = formData.get("image");
  const removeDocument = formData.get("removeDocument") === "true";
  const document = formData.get("document");
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  const linkLabel = String(formData.get("linkLabel") ?? "").trim();

  if (!title || !start) {
    return NextResponse.json({ error: "Title and date & time are required" }, { status: 400 });
  }
  if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
    return NextResponse.json({ error: "Link must start with http:// or https://" }, { status: 400 });
  }

  let imageR2Key = existing.imageR2Key;
  let imageFileName = existing.imageFileName;
  let documentR2Key = existing.documentR2Key;
  let documentFileName = existing.documentFileName;
  const { env } = await getCloudflareContext({ async: true });

  if (image instanceof File && image.size > 0) {
    const error = await validateCalendarImage(image);
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (existing.imageR2Key) await env.DOCS.delete(existing.imageR2Key);
    imageR2Key = `calendar/${crypto.randomUUID()}-${image.name}`;
    await env.DOCS.put(imageR2Key, await image.arrayBuffer(), {
      httpMetadata: { contentType: image.type },
    });
    imageFileName = image.name;
  } else if (removeImage && existing.imageR2Key) {
    await env.DOCS.delete(existing.imageR2Key);
    imageR2Key = null;
    imageFileName = null;
  }

  if (document instanceof File && document.size > 0) {
    const error = await validateCalendarDocument(document);
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (existing.documentR2Key) await env.DOCS.delete(existing.documentR2Key);
    documentR2Key = `calendar/${crypto.randomUUID()}-${document.name}`;
    await env.DOCS.put(documentR2Key, await document.arrayBuffer(), {
      httpMetadata: { contentType: "application/pdf" },
    });
    documentFileName = document.name;
  } else if (removeDocument && existing.documentR2Key) {
    await env.DOCS.delete(existing.documentR2Key);
    documentR2Key = null;
    documentFileName = null;
  }

  await db
    .update(calendarEvents)
    .set({
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
    })
    .where(eq(calendarEvents.id, Number(id)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();

  const [existing] = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, Number(id)))
    .limit(1);

  if (existing?.imageR2Key || existing?.documentR2Key) {
    const { env } = await getCloudflareContext({ async: true });
    if (existing.imageR2Key) await env.DOCS.delete(existing.imageR2Key);
    if (existing.documentR2Key) await env.DOCS.delete(existing.documentR2Key);
  }

  await db.delete(calendarEvents).where(eq(calendarEvents.id, Number(id)));
  return NextResponse.json({ ok: true });
}
