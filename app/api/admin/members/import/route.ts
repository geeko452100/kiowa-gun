import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

// Expects a CSV with a header row containing at least "name" and "email" columns
// (a "phone" column is optional). Existing emails are skipped, not overwritten.
export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { csv } = (await request.json()) as { csv: string };
  if (typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ error: "CSV text is required" }, { status: 400 });
  }

  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const phoneIdx = header.indexOf("phone");

  if (nameIdx === -1 || emailIdx === -1) {
    return NextResponse.json(
      { error: 'CSV header must include "name" and "email" columns' },
      { status: 400 }
    );
  }

  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return {
      name: cols[nameIdx],
      email: (cols[emailIdx] ?? "").toLowerCase(),
      phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
      status: "Member" as const,
    };
  }).filter((r) => r.name && r.email);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows found" }, { status: 400 });
  }

  const db = await getDb();
  await db.insert(members).values(rows).onConflictDoNothing({ target: members.email });

  return NextResponse.json({ ok: true, imported: rows.length });
}
