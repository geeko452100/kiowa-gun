import { NextResponse } from "next/server";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members, emailCampaigns, emailCampaignRecipients } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { sendResendBatch } from "@/lib/email";
import { buildEmailAttachments } from "@/lib/emailAttachments";

const FROM = { name: "Kiowa Gun Club", email: "newsletter@kiowa.prairiewebstudio.com" };
const BATCH_SIZE = 100; // Resend's per-request cap for the batch send endpoint

export async function GET() {
  const db = await getDb();
  const rows = await db
    .select({
      id: emailCampaigns.id,
      subject: emailCampaigns.subject,
      sentAt: emailCampaigns.sentAt,
      sentCount: emailCampaigns.sentCount,
      failedCount: emailCampaigns.failedCount,
      createdBy: emailCampaigns.createdBy,
      recipientEmail: emailCampaigns.recipientEmail,
      openedCount: sql<number>`count(distinct case when ${emailCampaignRecipients.openedAt} is not null then ${emailCampaignRecipients.id} end)`,
      clickedCount: sql<number>`count(distinct case when ${emailCampaignRecipients.clickedAt} is not null then ${emailCampaignRecipients.id} end)`,
      bouncedCount: sql<number>`count(distinct case when ${emailCampaignRecipients.bouncedAt} is not null then ${emailCampaignRecipients.id} end)`,
      spamCount: sql<number>`count(distinct case when ${emailCampaignRecipients.spamComplaintAt} is not null then ${emailCampaignRecipients.id} end)`,
    })
    .from(emailCampaigns)
    .leftJoin(emailCampaignRecipients, eq(emailCampaignRecipients.campaignId, emailCampaigns.id))
    .groupBy(emailCampaigns.id)
    .orderBy(desc(emailCampaigns.sentAt));
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
  const sendResults: { member: (typeof recipients)[number]; error: string | null; messageId: string | null }[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const results = await sendResendBatch(
      env.RESEND_API,
      chunk.map((m) => ({ from: FROM, to: m.email, subject, html: sendHtml, attachments }))
    );
    chunk.forEach((m, idx) => sendResults.push({ member: m, ...results[idx] }));
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

  const [campaign] = await db
    .insert(emailCampaigns)
    .values({
      subject,
      bodyHtml,
      sentCount,
      failedCount,
      createdBy: admin?.email ?? null,
      recipientEmail: isAllEligible ? null : recipients.map((r) => r.email).join(", "),
    })
    .returning({ id: emailCampaigns.id });

  await db.insert(emailCampaignRecipients).values(
    sendResults.map(({ member, error, messageId }) => ({
      campaignId: campaign.id,
      memberId: member.id,
      email: member.email,
      emailId: messageId,
      sendError: error,
    }))
  );

  // One-shot uploads, only ever referenced by this send -- nothing else in
  // the app reads them back, so clean them up now rather than let them pile
  // up in R2.
  if (fileAttachmentRefs && fileAttachmentRefs.length > 0) {
    await Promise.all(fileAttachmentRefs.map((ref) => env.DOCS.delete(ref.r2Key)));
  }

  return NextResponse.json({ ok: true, sentCount, failedCount });
}
