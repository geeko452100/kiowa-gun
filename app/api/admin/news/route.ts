import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { newsPosts } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.select().from(newsPosts).orderBy(desc(newsPosts.publishedAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, bodyHtml, isPublished } = (await request.json()) as {
    title: string;
    bodyHtml: string;
    isPublished: boolean;
  };
  const db = await getDb();
  await db.insert(newsPosts).values({
    title,
    bodyHtml,
    isPublished: isPublished ? 1 : 0,
    publishedAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
