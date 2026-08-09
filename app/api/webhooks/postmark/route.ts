import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { emailCampaignRecipients } from "@/lib/schema";

// Postmark has no built-in webhook signature, so the webhook URL configured
// in Server > Webhooks must include this secret as a query param, e.g.
// https://.../api/webhooks/postmark?secret=<POSTMARK_WEBHOOK_SECRET>.
//
// Configure one webhook per event type (Delivery, Open, Click, Bounce, Spam
// Complaint) all pointed at this same URL -- RecordType tells them apart.
type PostmarkWebhookPayload = {
  RecordType: "Delivery" | "Open" | "Click" | "Bounce" | "SpamComplaint";
  MessageID: string;
  Type?: string; // Bounce's specific type, e.g. "HardBounce"
};

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== env.POSTMARK_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as PostmarkWebhookPayload;
  if (!payload.MessageID) {
    return NextResponse.json({ error: "Missing MessageID" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const update: Partial<typeof emailCampaignRecipients.$inferInsert> = {};
  switch (payload.RecordType) {
    case "Delivery":
      update.deliveredAt = now;
      break;
    case "Open":
      update.openedAt = now;
      break;
    case "Click":
      update.clickedAt = now;
      break;
    case "Bounce":
      update.bouncedAt = now;
      update.bounceType = payload.Type ?? null;
      break;
    case "SpamComplaint":
      update.spamComplaintAt = now;
      break;
    default:
      return NextResponse.json({ error: "Unknown RecordType" }, { status: 400 });
  }

  const db = await getDb();
  await db
    .update(emailCampaignRecipients)
    .set(update)
    .where(eq(emailCampaignRecipients.postmarkMessageId, payload.MessageID));

  return NextResponse.json({ received: true });
}
