import { NextResponse } from "next/server";
import { desc, inArray } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members, smsCampaigns } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { sendSignalWireSms, toE164 } from "@/lib/sms";

const BATCH_SIZE = 20; // send concurrently in small batches to stay within SignalWire's rate limits

export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(smsCampaigns).orderBy(desc(smsCampaigns.sentAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { body, memberIds, mediaUrl } = (await request.json()) as {
    body: string;
    memberIds?: number[];
    mediaUrl?: string;
  };
  if (!body) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }
  if (!memberIds || memberIds.length === 0) {
    return NextResponse.json({ error: "Select at least one recipient" }, { status: 400 });
  }
  // mediaUrl comes straight from client JSON and gets handed to SignalWire,
  // which fetches whatever it points to and relays it to carriers under the
  // club's number -- it must stay inside our own upload namespace, not an
  // arbitrary attacker-supplied URL.
  if (mediaUrl) {
    const origin = new URL(request.url).origin;
    if (!mediaUrl.startsWith(`${origin}/api/sms-media/`)) {
      return NextResponse.json({ error: "Invalid picture reference." }, { status: 400 });
    }
  }

  const db = await getDb();
  const recipients = await db.select().from(members).where(inArray(members.id, memberIds));
  if (recipients.length === 0) {
    return NextResponse.json({ error: "None of the selected members could be found" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const admin = await getCurrentAdmin();

  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      chunk.map((m) => {
        const to = m.phone ? toE164(m.phone) : null;
        if (!to) return Promise.resolve({ error: "No valid phone number" });
        return sendSignalWireSms(
          env.SIGNALWIRE_SPACE_URL,
          env.SIGNALWIRE_PROJECT_ID,
          env.SIGNALWIRE_API_TOKEN,
          env.SIGNALWIRE_FROM_NUMBER,
          { to, text: body, mediaUrl }
        );
      })
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
  const isAllContacts =
    recipients.length === allContacts.length && allContacts.every((a) => memberIds.includes(a.id));

  await db.insert(smsCampaigns).values({
    body,
    sentCount,
    failedCount,
    createdBy: admin?.email ?? null,
    recipientPhone: isAllContacts ? null : recipients.map((r) => r.phone ?? r.name).join(", "),
    mediaUrl: mediaUrl || null,
  });

  return NextResponse.json({ ok: true, sentCount, failedCount });
}
