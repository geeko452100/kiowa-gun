import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { emailCampaignRecipients } from "@/lib/schema";

// Resend's webhooks are Svix-signed, but this app doesn't verify that
// signature -- same shared-secret-in-the-URL pattern already used for the
// other provider webhooks here (SignalWire has no built-in signature either),
// so the URL configured in Resend's dashboard must include this secret as a
// query param: https://.../api/webhooks/resend?secret=<RESEND_WEBHOOK_SECRET>.
//
// One webhook endpoint covers all event types Resend sends; `type` tells them
// apart. Only the ones the app tracks are handled -- everything else is
// acknowledged and ignored.
type ResendWebhookPayload = {
  type: "email.delivered" | "email.opened" | "email.clicked" | "email.bounced" | "email.complained" | string;
  data: {
    email_id: string;
    bounce?: { type?: string; subType?: string };
  };
};

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== env.RESEND_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await request.json()) as ResendWebhookPayload;
  const emailId = payload.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const update: Partial<typeof emailCampaignRecipients.$inferInsert> = {};
  switch (payload.type) {
    case "email.delivered":
      update.deliveredAt = now;
      break;
    case "email.opened":
      update.openedAt = now;
      break;
    case "email.clicked":
      update.clickedAt = now;
      break;
    case "email.bounced":
      update.bouncedAt = now;
      update.bounceType = payload.data.bounce?.subType ?? payload.data.bounce?.type ?? null;
      break;
    case "email.complained":
      update.spamComplaintAt = now;
      break;
    default:
      return NextResponse.json({ received: true, ignored: payload.type });
  }

  const db = await getDb();
  await db.update(emailCampaignRecipients).set(update).where(eq(emailCampaignRecipients.emailId, emailId));

  return NextResponse.json({ received: true });
}
