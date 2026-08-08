import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { matchPhotos } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { photoId } = await params;
  const db = await getDb();
  const [photo] = await db
    .select()
    .from(matchPhotos)
    .where(eq(matchPhotos.id, Number(photoId)))
    .limit(1);

  if (photo) {
    const { env } = await getCloudflareContext({ async: true });
    await env.DOCS.delete(photo.r2Key);
    await db.delete(matchPhotos).where(eq(matchPhotos.id, Number(photoId)));
  }

  return NextResponse.json({ ok: true });
}
