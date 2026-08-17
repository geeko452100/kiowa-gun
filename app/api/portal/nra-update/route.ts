import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members, documents } from "@/lib/schema";
import { getCurrentMember } from "@/lib/memberAuth";
import { MEMBERSHIP_ALLOWED_FILE_TYPES, MEMBERSHIP_DOC_CATEGORIES } from "@/lib/constants";
import { hasValidFileSignature } from "@/lib/fileSignature";

// Lets a member suspended for a lapsed NRA membership (app/portal/nra-expired,
// gated by the layout redirect in app/portal/(protected)/layout.tsx)
// resubmit proof. Saves the fields and queues the doc for review, but does
// NOT flip nraActive back on -- that's an admin-only action (MembersAdmin's
// "NRA active" checkbox) once the re-uploaded proof is actually verified.
export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const nraNumber = String(formData.get("nraNumber") ?? "").trim();
  const nraExpirationDate = String(formData.get("nraExpirationDate") ?? "").trim();
  const file = formData.get("nraProof");

  if (!/^\d{5,12}$/.test(nraNumber)) {
    return NextResponse.json({ error: "NRA Number must be 5 to 12 digits" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nraExpirationDate)) {
    return NextResponse.json({ error: "NRA Expiration Date must be a valid date" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please upload a photo of your current NRA card" }, { status: 400 });
  }
  if (!MEMBERSHIP_ALLOWED_FILE_TYPES.includes(file.type) || !(await hasValidFileSignature(file))) {
    return NextResponse.json({ error: "NRA card must be a PDF, JPEG, or PNG file" }, { status: 400 });
  }

  const db = await getDb();
  await db.update(members).set({ nraNumber, nraExpirationDate }).where(eq(members.id, member.id));

  const { env } = await getCloudflareContext({ async: true });
  const r2Key = `documents/${crypto.randomUUID()}-${file.name}`;
  await env.DOCS.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  await db.insert(documents).values({
    title: `NRA Proof — ${member.name}`,
    category: MEMBERSHIP_DOC_CATEGORIES.nraProof,
    r2Key,
    fileName: file.name,
    memberId: member.id,
    reviewed: 0,
  });

  return NextResponse.json({ ok: true });
}
