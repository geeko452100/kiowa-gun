import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { toE164 } from "@/lib/sms";

// SignalWire's inbound-message webhook (Twilio-LaML compatible) has no
// built-in signature the way NMI does, so -- same pattern as the Postmark
// webhook -- the URL configured on the number in the SignalWire dashboard
// must include this secret as a query param:
// https://.../api/webhooks/sms?secret=<SIGNALWIRE_WEBHOOK_SECRET>.
//
// Carriers require STOP/HELP to work on any A2P number, and campaign
// registration checks for it -- this is what makes that true, since nothing
// else in the app listens for inbound texts.
const STOP_KEYWORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_KEYWORDS = new Set(["START", "UNSTOP", "YES"]);
const HELP_KEYWORDS = new Set(["HELP", "INFO"]);

function laml(message?: string) {
  const body = message
    ? `<Response><Message>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Message></Response>`
    : "<Response></Response>";
  return new Response(body, { headers: { "content-type": "text/xml" } });
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== env.SIGNALWIRE_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const form = await request.formData();
  const from = form.get("From")?.toString();
  const rawBody = form.get("Body")?.toString() ?? "";
  const keyword = rawBody.trim().toUpperCase();
  if (!from) return laml();

  const db = await getDb();
  const contacts = await db.select().from(members);
  const match = contacts.find((m) => m.phone && toE164(m.phone) === from);
  if (!match) return laml();

  if (STOP_KEYWORDS.has(keyword)) {
    await db.update(members).set({ smsOptIn: 0 }).where(eq(members.id, match.id));
    return laml(
      "Kiowa Gun Club: You've been unsubscribed from texts and won't receive any more. Reply START to re-subscribe."
    );
  }

  if (START_KEYWORDS.has(keyword)) {
    await db
      .update(members)
      .set({ smsOptIn: 1, smsOptInAt: new Date().toISOString() })
      .where(eq(members.id, match.id));
    return laml("Kiowa Gun Club: You're re-subscribed to club texts. Reply STOP to opt out anytime.");
  }

  if (HELP_KEYWORDS.has(keyword)) {
    return laml(
      `Kiowa Gun Club club texts. Contact ${env.ADMIN_PROD} for help. Reply STOP to unsubscribe.`
    );
  }

  return laml();
}
