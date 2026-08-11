import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

const VALID_SIZES = new Set(["compact", "comfortable", "large"]);

export async function PATCH(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { navTitle, navSubtitle, navTitleSize } = (await request.json()) as {
    navTitle?: string;
    navSubtitle?: string;
    navTitleSize?: string;
  };
  if (!navTitle?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!navTitleSize || !VALID_SIZES.has(navTitleSize)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }

  const db = await getDb();
  await db
    .update(siteSettings)
    .set({
      navTitle: navTitle.trim(),
      navSubtitle: navSubtitle?.trim() || "",
      navTitleSize,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(siteSettings.id, 1));

  return NextResponse.json({ ok: true });
}
