import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { positionOptions } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { canManageBoard } from "@/lib/roles";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin || !canManageBoard(admin.role)) {
    return NextResponse.json({ error: "President or tech admin access required" }, { status: 403 });
  }
  const db = await getDb();
  const rows = await db.select().from(positionOptions).orderBy(asc(positionOptions.label));
  return NextResponse.json(rows.map((r) => r.label));
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !canManageBoard(admin.role)) {
    return NextResponse.json({ error: "President or tech admin access required" }, { status: 403 });
  }
  const { label } = (await request.json().catch(() => ({}))) as { label?: string };
  const trimmed = label?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const db = await getDb();
  // Adding a title that already exists (case-sensitive match) is a no-op,
  // not an error -- the UI just wants this title selectable either way.
  await db.insert(positionOptions).values({ label: trimmed }).onConflictDoNothing();
  return NextResponse.json({ ok: true, label: trimmed });
}
