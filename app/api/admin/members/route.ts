import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.select().from(members).orderBy(desc(members.createdAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, email, phone } = (await request.json()) as {
    name: string;
    email: string;
    phone?: string;
  };
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }
  const db = await getDb();
  await db.insert(members).values({ name, email: String(email).toLowerCase().trim(), phone: phone || null });
  return NextResponse.json({ ok: true });
}
