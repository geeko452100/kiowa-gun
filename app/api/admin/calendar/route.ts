import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calendarEvents } from "@/lib/schema";
import { buildRecurringSeries } from "@/lib/recurrence";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.select().from(calendarEvents);
  return NextResponse.json(rows);
}

type CalendarPostBody = {
  mode?: "series";
  title: string;
  start?: string;
  color?: string;
  weekday?: number;
  nth?: number;
  time?: string;
  startYear?: number;
  startMonth?: number;
  monthCount?: number;
};

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as CalendarPostBody;
  const db = await getDb();

  if (body.mode === "series") {
    const events = buildRecurringSeries({
      title: body.title,
      weekday: Number(body.weekday),
      nth: Number(body.nth),
      time: body.time || "12:00",
      color: body.color || "#2c3e1f",
      startYear: Number(body.startYear),
      startMonth: Number(body.startMonth),
      monthCount: Number(body.monthCount),
    });
    if (events.length > 0) {
      await db.insert(calendarEvents).values(events);
    }
    return NextResponse.json({ ok: true, created: events.length });
  }

  if (!body.start) {
    return NextResponse.json({ error: "start is required" }, { status: 400 });
  }
  await db.insert(calendarEvents).values({
    title: body.title,
    start: body.start,
    color: body.color || "#2c3e1f",
  });
  return NextResponse.json({ ok: true });
}
