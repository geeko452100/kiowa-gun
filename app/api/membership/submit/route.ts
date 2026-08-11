import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, isUniqueConstraintError } from "@/lib/db";
import { members, documents } from "@/lib/schema";
import { MEMBERSHIP_ALLOWED_FILE_TYPES, MEMBERSHIP_FILE_FIELDS } from "@/lib/constants";

const ALLOWED_FILE_TYPES = MEMBERSHIP_ALLOWED_FILE_TYPES;

// Renewing members prove current NRA membership; waiting-list applicants
// (not yet members) prove they've passed a background check instead -- see
// requirement 5.c.i vs 5.c.iii. Neither is universally required.
export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const smsOptIn = formData.get("smsOptIn") === "1";
  const address = String(formData.get("address") ?? "").trim();
  const nraNumber = String(formData.get("nraNumber") ?? "").trim();
  const applicantType = String(formData.get("applicantType") ?? "");

  if (!name || !email || !address) {
    return NextResponse.json({ error: "Name, email, and address are required" }, { status: 400 });
  }
  if (applicantType !== "member" && applicantType !== "waitlist") {
    return NextResponse.json({ error: "Please choose whether you're a renewing member or a new applicant" }, { status: 400 });
  }
  if (phone && !/^\d+$/.test(phone)) {
    return NextResponse.json({ error: "Phone must contain only digits" }, { status: 400 });
  }
  if (nraNumber && !/^\d{5,12}$/.test(nraNumber)) {
    return NextResponse.json({ error: "NRA Number must be 5 to 12 digits" }, { status: 400 });
  }

  const FILE_FIELDS = MEMBERSHIP_FILE_FIELDS.map((f) => ({
    ...f,
    required:
      (f.field === "nraProof" && applicantType === "member") ||
      (f.field === "backgroundCheck" && applicantType === "waitlist"),
  }));

  const db = await getDb();
  const normalizedEmail = email.toLowerCase().trim();
  const [existing] = await db.select().from(members).where(eq(members.email, normalizedEmail));

  if (!existing || !existing.rulesAcknowledgedName || !existing.rulesAcknowledgedAt) {
    return NextResponse.json(
      {
        error:
          "Please sign the Range Rules Acknowledgement on this page using this same email address before applying.",
      },
      { status: 400 }
    );
  }

  for (const { field, label, required } of FILE_FIELDS) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) {
      if (required) {
        return NextResponse.json({ error: `${label} is required` }, { status: 400 });
      }
      continue;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `${label} must be a PDF, JPEG, or PNG file` }, { status: 400 });
    }
  }

  const memberId = existing.id;
  try {
    await db
      .update(members)
      .set({
        name,
        phone: phone || null,
        smsOptIn: smsOptIn ? 1 : 0,
        ...(smsOptIn && !existing.smsOptIn ? { smsOptInAt: sql`CURRENT_TIMESTAMP` } : {}),
        address,
        nraNumber: nraNumber || null,
      })
      .where(eq(members.id, memberId));
  } catch (err) {
    if (isUniqueConstraintError(err, "nra_number")) {
      return NextResponse.json(
        { error: "That NRA Number is already on file for another member. Double-check it and try again." },
        { status: 409 }
      );
    }
    throw err;
  }

  const { env } = await getCloudflareContext({ async: true });
  for (const { field, category, label } of FILE_FIELDS) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;

    const r2Key = `documents/${crypto.randomUUID()}-${file.name}`;
    await env.DOCS.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    await db.insert(documents).values({
      title: `${label} — ${name}`,
      category,
      r2Key,
      fileName: file.name,
      memberId,
      reviewed: 0,
    });
  }

  return NextResponse.json({ ok: true, email: normalizedEmail });
}
