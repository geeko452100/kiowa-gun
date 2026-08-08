import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { matchPhotos } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { validateCalendarImage } from "@/lib/calendarImage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  const rows = await db
    .select()
    .from(matchPhotos)
    .where(eq(matchPhotos.matchId, Number(id)))
    .orderBy(asc(matchPhotos.sortOrder));
  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  }
  const error = validateCalendarImage(image);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const db = await getDb();
  const [{ maxSortOrder }] = await db
    .select({ maxSortOrder: sql<number>`coalesce(max(${matchPhotos.sortOrder}), -1)` })
    .from(matchPhotos)
    .where(eq(matchPhotos.matchId, Number(id)));

  const { env } = await getCloudflareContext({ async: true });
  const r2Key = `match-photos/${crypto.randomUUID()}-${image.name}`;
  await env.DOCS.put(r2Key, await image.arrayBuffer(), {
    httpMetadata: { contentType: image.type },
  });

  await db.insert(matchPhotos).values({
    matchId: Number(id),
    r2Key,
    fileName: image.name,
    sortOrder: maxSortOrder + 1,
  });

  return NextResponse.json({ ok: true });
}
