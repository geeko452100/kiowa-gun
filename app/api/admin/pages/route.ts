import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

// Board-added content blocks (via the "+ Add a section" control) live in the
// same page_sections table as the fixed, seeded sections, distinguished only
// by a "custom-" section_key prefix -- that's what makes them safe to delete
// (see the [id] route) without a schema migration.
export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pageSlug, heading, bodyHtml } = (await request.json()) as {
    pageSlug?: string;
    heading?: string;
    bodyHtml?: string;
  };
  if (!pageSlug) return NextResponse.json({ error: "pageSlug is required" }, { status: 400 });

  const db = await getDb();
  const sectionKey = `custom-${crypto.randomUUID()}`;
  await db.insert(pageSections).values({
    pageSlug,
    sectionKey,
    heading: heading || null,
    bodyHtml: bodyHtml || "",
  });
  const [section] = await db
    .select()
    .from(pageSections)
    .where(eq(pageSections.sectionKey, sectionKey))
    .limit(1);

  return NextResponse.json({ ok: true, section });
}
