import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { siteImages } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { validateCalendarImage } from "@/lib/calendarImage";

// Any board-swappable spot in the layout is a fixed, known key (see
// lib/siteImages.ts) -- not free text, so a typo'd URL can't be used to
// write an arbitrary key into this table.
const VALID_KEYS = new Set(["nav-logo", "nav-hero", "rules-photo", "matches-flyer"]);

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { key } = await params;
  if (!VALID_KEYS.has(key)) {
    return NextResponse.json({ error: "Unknown image slot" }, { status: 400 });
  }

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  }
  const error = await validateCalendarImage(image);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const db = await getDb();
  const { env } = await getCloudflareContext({ async: true });

  const [existing] = await db.select().from(siteImages).where(eq(siteImages.key, key)).limit(1);
  if (existing) await env.DOCS.delete(existing.r2Key);

  const ext = image.name.split(".").pop()?.toLowerCase() || "jpg";
  const r2Key = `site-images/${key}-${crypto.randomUUID()}.${ext}`;
  await env.DOCS.put(r2Key, await image.arrayBuffer(), {
    httpMetadata: { contentType: image.type },
  });

  await db
    .insert(siteImages)
    .values({ key, r2Key, fileName: image.name })
    .onConflictDoUpdate({
      target: siteImages.key,
      set: { r2Key, fileName: image.name, updatedAt: new Date().toISOString() },
    });

  return NextResponse.json({ ok: true, url: `/api/site-images/${key}` });
}

// Removes a board-uploaded replacement so the spot reverts to its bundled
// default asset.
export async function DELETE(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { key } = await params;

  const db = await getDb();
  const [existing] = await db.select().from(siteImages).where(eq(siteImages.key, key)).limit(1);
  if (existing) {
    const { env } = await getCloudflareContext({ async: true });
    await env.DOCS.delete(existing.r2Key);
    await db.delete(siteImages).where(eq(siteImages.key, key));
  }

  return NextResponse.json({ ok: true });
}
