import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members, documents } from "@/lib/schema";
import { MEMBERSHIP_ALLOWED_FILE_TYPES, MEMBERSHIP_FILE_FIELDS } from "@/lib/constants";

const ALLOWED_FILE_TYPES = MEMBERSHIP_ALLOWED_FILE_TYPES;

const FILE_FIELDS = MEMBERSHIP_FILE_FIELDS.map((f) => ({
  ...f,
  required: f.field === "nraProof" || f.field === "backgroundCheck",
}));

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const rulesAcknowledgedName = String(formData.get("rulesAcknowledgedName") ?? "").trim();
  const agree = formData.get("agree") === "true";

  if (!name || !email || !address) {
    return NextResponse.json({ error: "Name, email, and address are required" }, { status: 400 });
  }
  if (!agree || !rulesAcknowledgedName) {
    return NextResponse.json(
      { error: "You must type your name and agree to the Range Rules to continue" },
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

  const db = await getDb();
  const normalizedEmail = email.toLowerCase().trim();
  const [existing] = await db.select().from(members).where(eq(members.email, normalizedEmail));

  const now = new Date().toISOString();
  let memberId: number;
  if (existing) {
    memberId = existing.id;
    await db
      .update(members)
      .set({
        name,
        phone: phone || null,
        address,
        rulesAcknowledgedName,
        rulesAcknowledgedAt: now,
      })
      .where(eq(members.id, memberId));
  } else {
    const [inserted] = await db
      .insert(members)
      .values({
        name,
        email: normalizedEmail,
        phone: phone || null,
        address,
        status: "Waiting List",
        rulesAcknowledgedName,
        rulesAcknowledgedAt: now,
      })
      .returning({ id: members.id });
    memberId = inserted.id;
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
