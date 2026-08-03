import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { matches } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { eventDate, eventTime, notes, resultsUrl, sortOrder } = (await request.json()) as {
    eventDate: string;
    eventTime: string;
    notes?: string;
    resultsUrl?: string;
    sortOrder?: number;
  };
  const db = await getDb();
  await db
    .update(matches)
    .set({
      eventDate,
      eventTime,
      notes: notes || null,
      resultsUrl: resultsUrl || null,
      sortOrder: Number(sortOrder) || 0,
    })
    .where(eq(matches.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  await db.delete(matches).where(eq(matches.id, Number(id)));
  return NextResponse.json({ ok: true });
}
