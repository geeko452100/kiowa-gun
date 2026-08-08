import { NextResponse } from "next/server";
import { asc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { matches } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.select().from(matches).orderBy(asc(matches.sortOrder));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { discipline, eventDate, eventTime, notes, resultsUrl } = (await request.json()) as {
    discipline?: string;
    eventDate: string;
    eventTime: string;
    notes?: string;
    resultsUrl?: string;
  };
  const db = await getDb();
  // New matches always go to the end of the list; reordering happens via the up/down arrows.
  const [{ maxSortOrder }] = await db
    .select({ maxSortOrder: sql<number>`coalesce(max(${matches.sortOrder}), -1)` })
    .from(matches);
  await db.insert(matches).values({
    discipline: discipline || "Defensive Pistol",
    eventDate,
    eventTime,
    notes: notes || null,
    resultsUrl: resultsUrl || null,
    sortOrder: maxSortOrder + 1,
  });
  return NextResponse.json({ ok: true });
}
