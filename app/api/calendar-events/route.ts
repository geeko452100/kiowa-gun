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
    documentUrl: row.documentR2Key ? `/api/calendar-events/${row.id}/document` : null,
    documentFileName: row.documentFileName,
    linkUrl: row.linkUrl,
    linkLabel: row.linkLabel,
    seriesId: row.seriesId,
    recurrenceLabel: row.recurrenceLabel,
  }));
  return NextResponse.json(events);
}
