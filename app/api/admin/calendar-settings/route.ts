import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { calendarSettings } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

const VALID_PRESETS = new Set(["compact", "comfortable", "large"]);

export async function PUT(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sizePreset } = (await request.json()) as { sizePreset?: string };

  if (!sizePreset || !VALID_PRESETS.has(sizePreset)) {
    return NextResponse.json({ error: "Invalid display size" }, { status: 400 });
  }

  const db = await getDb();
  await db
    .update(calendarSettings)
    .set({ sizePreset, updatedAt: new Date().toISOString() })
    .where(eq(calendarSettings.id, 1));

  return NextResponse.json({ ok: true });
}
