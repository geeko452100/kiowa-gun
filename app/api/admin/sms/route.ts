import { NextResponse } from "next/server";
import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members, smsCampaigns, smsCampaignRecipients } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { sendGatewaySms } from "@/lib/sms";
import { buildSafeMessage, findRiskyWords } from "@/lib/contentFilter";

const BATCH_SIZE = 20; // send concurrently in small batches so Resend isn't hit with hundreds of calls at once

export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(smsCampaigns).orderBy(desc(smsCampaigns.sentAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { body, memberIds } = (await request.json()) as {
    body: string;
    memberIds?: number[];
  };
  if (!body) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }
  if (!memberIds || memberIds.length === 0) {
    return NextResponse.json({ error: "Select at least one recipient" }, { status: 400 });
  }

  const db = await getDb();
  const selected = await db.select().from(members).where(inArray(members.id, memberIds));
  if (selected.length === 0) {
    return NextResponse.json({ error: "None of the selected members could be found" }, { status: 400 });
  }
  // Enforced here too, not just in the recipient picker's own filtering, so a
  // stale client-side list can't text someone who hasn't opted in.
  const recipients = selected.filter((m) => m.smsOptIn);
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "None of the selected contacts have opted in to receive texts" },
      { status: 400 }
    );
  }

  const admin = await getCurrentAdmin();

  // Carriers silently drop or delay SMS containing SHAFT-category (Sex,
  // Hate, Alcohol, Firearms, Tobacco) language. Rather than risk the send
  // being blocked, swap in a sanitized version and tell the sender why.
  const riskyWords = findRiskyWords(body);
  const outgoingBody = riskyWords.length > 0 ? buildSafeMessage(body) : body;

  let sentCount = 0;
  let failedCount = 0;
  const sendResults: {
    member: (typeof recipients)[number];
    error: string | null;
    gatewayEmail: string | null;
  }[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      chunk.map((m) => {
        if (!m.phone) return Promise.resolve({ error: "No valid phone number", gatewayEmail: null });
        return sendGatewaySms(m.id, m.phone, outgoingBody);
      })
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
  const isAllContacts =
    recipients.length === allContacts.length && allContacts.every((a) => memberIds.includes(a.id));

  const [campaign] = await db
    .insert(smsCampaigns)
    .values({
      body: outgoingBody,
      sentCount,
      failedCount,
      createdBy: admin?.email ?? null,
      recipientPhone: isAllContacts ? null : recipients.map((r) => r.phone ?? r.name).join(", "),
    })
    .returning({ id: smsCampaigns.id });

  await db.insert(smsCampaignRecipients).values(
    sendResults.map(({ member, error, gatewayEmail }) => ({
      campaignId: campaign.id,
      memberId: member.id,
      phone: member.phone ?? "",
      gatewayEmail,
      sendError: error,
    }))
  );

  return NextResponse.json({
    ok: true,
    sentCount,
    failedCount,
    riskyWords: riskyWords.length > 0 ? riskyWords : undefined,
    sentBody: riskyWords.length > 0 ? outgoingBody : undefined,
  });
}
