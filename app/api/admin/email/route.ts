import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { Resend } from "resend";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members, emailCampaigns } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

const FROM = "Kiowa Gun Club <newsletter@kiowa.prairiewebstudio.com>";
const BATCH_SIZE = 100; // Resend's batch send endpoint caps out per request; chunk to stay under it.

export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.sentAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { subject, bodyHtml, memberIds } = (await request.json()) as {
    subject: string;
    bodyHtml: string;
    memberIds?: number[];
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
  const resend = new Resend(env.RESEND_API_KEY);
  const admin = await getCurrentAdmin();

  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const { error } = await resend.batch.send(
      chunk.map((m) => ({
        from: FROM,
        to: m.email,
        subject,
        html: bodyHtml,
      }))
    );
    if (error) {
      failedCount += chunk.length;
    } else {
      sentCount += chunk.length;
    }
  }

  const activeMembers = await db.select({ id: members.id }).from(members).where(eq(members.status, "active"));
  const isAllActive =
    recipients.length === activeMembers.length &&
    activeMembers.every((a) => memberIds.includes(a.id));

  await db.insert(emailCampaigns).values({
    subject,
    bodyHtml,
    sentCount,
    failedCount,
    createdBy: admin?.email ?? null,
    recipientEmail: isAllActive ? null : recipients.map((r) => r.email).join(", "),
  });

  return NextResponse.json({ ok: true, sentCount, failedCount });
}
