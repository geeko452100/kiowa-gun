import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { calendarSettings } from "@/lib/schema";

export async function GET() {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(calendarSettings)
    .where(eq(calendarSettings.id, 1))
    .limit(1);
  return NextResponse.json({ sizePreset: row?.sizePreset ?? "comfortable" });
}
