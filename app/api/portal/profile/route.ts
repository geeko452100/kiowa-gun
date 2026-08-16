import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, isUniqueConstraintError } from "@/lib/db";
import { members, documents } from "@/lib/schema";
import { getCurrentMember } from "@/lib/memberAuth";
import { MEMBERSHIP_ALLOWED_FILE_TYPES, MEMBERSHIP_FILE_FIELDS } from "@/lib/constants";

// GET intentionally omitted -- the portal dashboard (app/portal/(protected)/page.tsx)
// is a server component that reads the member's info and documents directly
// from the DB to pre-fill the form, so no client-side fetch is needed.

export async function PATCH(request: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const smsOptIn = formData.get("smsOptIn") === "1";
  const address = String(formData.get("address") ?? "").trim();
  const nraNumber = String(formData.get("nraNumber") ?? "").trim();
  const nraExpirationDate = String(formData.get("nraExpirationDate") ?? "").trim();
  if (!name || !address) {
    return NextResponse.json({ error: "Name and address are required" }, { status: 400 });
  }
  if (phone && !/^\d+$/.test(phone)) {
    return NextResponse.json({ error: "Phone must contain only digits" }, { status: 400 });
  }
  if (nraNumber && !/^\d{5,12}$/.test(nraNumber)) {
    return NextResponse.json({ error: "NRA Number must be 5 to 12 digits" }, { status: 400 });
  }
  if (nraExpirationDate && !/^\d{4}-\d{2}-\d{2}$/.test(nraExpirationDate)) {
    return NextResponse.json({ error: "NRA Expiration Date must be a valid date" }, { status: 400 });
  }

  for (const { field, label } of MEMBERSHIP_FILE_FIELDS) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!MEMBERSHIP_ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `${label} must be a PDF, JPEG, or PNG file` }, { status: 400 });
    }
  }

  const db = await getDb();
  try {
    await db
      .update(members)
      .set({
        name,
        phone: phone || null,
        // See app/api/admin/members/[id]/route.ts for why a phone change
        // clears the cached carrier.
        ...((phone || null) !== member.phone ? { carrier: null } : {}),
        smsOptIn: smsOptIn ? 1 : 0,
        ...(smsOptIn && !member.smsOptIn ? { smsOptInAt: sql`CURRENT_TIMESTAMP` } : {}),
        address,
        nraNumber: nraNumber || null,
        ...(nraExpirationDate ? { nraExpirationDate } : {}),
      })
      .where(eq(members.id, member.id));
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
  for (const { field, category, label } of MEMBERSHIP_FILE_FIELDS) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;

    const r2Key = `documents/${crypto.randomUUID()}-${file.name}`;
    await env.DOCS.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    await db.insert(documents).values({
      title: `${label} — ${name}`,
      category,
      r2Key,
      fileName: file.name,
      memberId: member.id,
      reviewed: 0,
    });
  }

  return NextResponse.json({ ok: true });
}
