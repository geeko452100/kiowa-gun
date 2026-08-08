import { NextResponse } from "next/server";
import { desc, inArray } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members, emailCampaigns } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { sendPostmarkEmail } from "@/lib/email";
import { buildEmailAttachments } from "@/lib/emailAttachments";

const FROM = { name: "Kiowa Gun Club", email: "newsletter@prairiewebstudio.com" };
const BATCH_SIZE = 20; // send concurrently in small batches to stay within Postmark's rate limits

export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.sentAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { subject, bodyHtml, memberIds, attachments: fileAttachmentRefs } = (await request.json()) as {
    subject: string;
    bodyHtml: string;
    memberIds?: number[];
    attachments?: { r2Key: string; fileName: string }[];
  };
  if (!subject || !bodyHtml) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }
  if (!memberIds || memberIds.length === 0) {
    return NextResponse.json({ error: "Select at least one recipient" }, { status: 400 });
  }

  const db = await getDb();
  const recipients = await db.select().from(members).where(inArray(members.id, memberIds));
  if (recipients.length === 0) {
    return NextResponse.json({ error: "None of the selected members could be found" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const admin = await getCurrentAdmin();

  // Rewrite composer images from public-URL references into inline (CID)
  // attachments, and resolve any true file attachments -- both done once, up
  // front (validated against a combined size budget), so the transform and
  // R2 reads aren't repeated per recipient.
  const built = await buildEmailAttachments(bodyHtml, fileAttachmentRefs ?? [], env.DOCS);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }
  const { html: sendHtml, attachments } = built;

  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      chunk.map((m) =>
        sendPostmarkEmail(env.POSTMARK_SERVER_TOKEN, {
          from: FROM,
          to: m.email,
          subject,
          html: sendHtml,
          attachments,
        })
      )
    );
    for (const { error } of results) {
      if (error) {
        failedCount += 1;
      } else {
        sentCount += 1;
      }
    }
  }

  const allContacts = await db.select({ id: members.id }).from(members);
  const isAllEligible =
    recipients.length === allContacts.length && allContacts.every((a) => memberIds.includes(a.id));

  await db.insert(emailCampaigns).values({
    subject,
    bodyHtml,
    sentCount,
    failedCount,
    createdBy: admin?.email ?? null,
    recipientEmail: isAllEligible ? null : recipients.map((r) => r.email).join(", "),
  });

  // One-shot uploads, only ever referenced by this send -- nothing else in
  // the app reads them back, so clean them up now rather than let them pile
  // up in R2.
  if (fileAttachmentRefs && fileAttachmentRefs.length > 0) {
    await Promise.all(fileAttachmentRefs.map((ref) => env.DOCS.delete(ref.r2Key)));
  }

  return NextResponse.json({ ok: true, sentCount, failedCount });
}
