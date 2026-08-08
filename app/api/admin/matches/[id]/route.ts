import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { matches, matchPhotos } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { discipline, eventDate, eventTime, notes, resultsUrl, sortOrder } =
    (await request.json()) as {
      discipline?: string;
      eventDate: string;
      eventTime: string;
      notes?: string;
      resultsUrl?: string;
      sortOrder?: number;
    };
  const db = await getDb();
  await db
    .update(matches)
    .set({
      discipline: discipline || "Defensive Pistol",
      eventDate,
      eventTime,
      notes: notes || null,
      resultsUrl: resultsUrl || null,
      sortOrder: Number(sortOrder) || 0,
    })
    .where(eq(matches.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  const photos = await db
    .select()
    .from(matchPhotos)
    .where(eq(matchPhotos.matchId, Number(id)));
  if (photos.length > 0) {
    const { env } = await getCloudflareContext({ async: true });
    await Promise.all(photos.map((p) => env.DOCS.delete(p.r2Key)));
    await db.delete(matchPhotos).where(eq(matchPhotos.matchId, Number(id)));
  }
  await db.delete(matches).where(eq(matches.id, Number(id)));
  return NextResponse.json({ ok: true });
}
