import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

// Quote any field containing a comma, quote, or newline; double up internal quotes.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const rows = await db.select().from(members).orderBy(desc(members.createdAt));

  const header = ["Name", "Email", "Phone", "Status"];
  const lines = [header.join(",")];
  for (const m of rows) {
    lines.push(
      [m.name, m.email, m.phone ?? "", m.status].map((v) => csvField(v)).join(",")
    );
  }

  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kiowa-gun-club-members.csv"`,
    },
  });
}
