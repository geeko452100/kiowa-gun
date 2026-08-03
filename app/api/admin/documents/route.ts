import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.select().from(documents).orderBy(desc(documents.uploadedAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "");
  const category = String(formData.get("category") ?? "general");
  const description = String(formData.get("description") ?? "");

  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "A PDF file is required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const r2Key = `documents/${crypto.randomUUID()}-${file.name}`;
  await env.DOCS.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: "application/pdf" },
  });

  const db = await getDb();
  await db.insert(documents).values({
    title,
    description: description || null,
    category,
    r2Key,
    fileName: file.name,
  });

  return NextResponse.json({ ok: true });
}
