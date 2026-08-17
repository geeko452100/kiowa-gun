import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

const VALID_SIZES = new Set(["compact", "comfortable", "large"]);

export async function PATCH(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    navTitle,
    navSubtitle,
    navTitleSize,
    contactPhone,
    contactEmail,
    contactAddress,
    socialFacebook,
    socialInstagram,
    socialYoutube,
  } = (await request.json()) as {
    navTitle?: string;
    navSubtitle?: string;
    navTitleSize?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactAddress?: string;
    socialFacebook?: string;
    socialInstagram?: string;
    socialYoutube?: string;
  };
  if (!navTitle?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!navTitleSize || !VALID_SIZES.has(navTitleSize)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  if (contactEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
    return NextResponse.json({ error: "Contact email looks invalid" }, { status: 400 });
  }
  for (const [label, value] of [
    ["Facebook", socialFacebook],
    ["Instagram", socialInstagram],
    ["YouTube", socialYoutube],
  ] as const) {
    if (value?.trim() && !/^https:\/\//.test(value.trim())) {
      return NextResponse.json({ error: `${label} link must start with https://` }, { status: 400 });
    }
  }

  const db = await getDb();
  await db
    .update(siteSettings)
    .set({
      navTitle: navTitle.trim(),
      navSubtitle: navSubtitle?.trim() || "",
      navTitleSize,
      contactPhone: contactPhone?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      contactAddress: contactAddress?.trim() || null,
      socialFacebook: socialFacebook?.trim() || null,
      socialInstagram: socialInstagram?.trim() || null,
      socialYoutube: socialYoutube?.trim() || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(siteSettings.id, 1));

  return NextResponse.json({ ok: true });
}
