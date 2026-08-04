import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calendarEvents } from "@/lib/schema";

export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(calendarEvents);
  const events = rows.map((row) => ({
    id: row.id,
    title: row.title,
    start: row.start,
    color: row.color,
    description: row.description,
    imageUrl: row.imageR2Key ? `/api/calendar-events/${row.id}/image` : null,
  }));
  return NextResponse.json(events);
}
