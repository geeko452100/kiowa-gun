import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { smsCampaignRecipients } from "@/lib/schema";

// SignalWire posts to a message's StatusCallback URL (set per-send in
// app/api/admin/sms/route.ts) as delivery status changes -- queued -> sent ->
// delivered, or -> failed/undelivered -- reported asynchronously by the
// carrier after the initial send response only confirmed SignalWire accepted
// the request. Same shared-secret auth pattern as the other webhooks here.
export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== env.SIGNALWIRE_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const form = await request.formData();
  const sid = form.get("MessageSid")?.toString();
  const status = form.get("MessageStatus")?.toString();
  const errorCode = form.get("ErrorCode")?.toString() ?? null;
  if (!sid || !status) return new Response("ok");

  const update: Partial<typeof smsCampaignRecipients.$inferInsert> = { status };
  if (status === "delivered") {
    update.deliveredAt = new Date().toISOString();
  } else if (status === "failed" || status === "undelivered") {
    update.failedAt = new Date().toISOString();
    update.errorCode = errorCode;
  }

  const db = await getDb();
  await db.update(smsCampaignRecipients).set(update).where(eq(smsCampaignRecipients.signalwireSid, sid));

  return new Response("ok");
}
