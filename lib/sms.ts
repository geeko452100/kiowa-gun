import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";
import { lookupCarrier } from "@/lib/veriphone";
import { sendResendEmail } from "@/lib/email";

// Automated/gateway texts (admin broadcast + renewal-reminder cron) send
// under a distinct identity from regular member email (lib/email.ts) --
// see worker/dev-notes.md in Dispatcher-Micro-Plugin for the source of truth.
const SMS_FROM_NAME = "Prairie Web Automation";
const SMS_FROM_EMAIL = "host@kiowa.prairiewebstudio.com";

// Members' phone numbers are free-text (e.g. "(555) 123-4567"); Veriphone and
// the carrier gateways below require E.164. Assumes US/Canada numbers since
// that's this club's membership.
export function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return null;
}

function tenDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return null;
}

// Veriphone's `carrier` field is a free-text network name (e.g. "Verizon
// Wireless", "AT&T Mobility"), not a stable enum, so carriers are matched by
// substring rather than exact value. Order matters where one name is a
// substring of another -- "Metro by T-Mobile" must be checked before the
// generic T-Mobile pattern, since T-Mobile now owns that network too.
const CARRIER_GATEWAYS: { match: RegExp; domain: string }[] = [
  { match: /metro\s*pcs|metro\s*by\s*t-?mobile/i, domain: "mymetropcs.com" },
  { match: /t-?mobile/i, domain: "tmomail.net" },
  { match: /verizon/i, domain: "vtext.com" },
  { match: /at&?t/i, domain: "txt.att.net" },
  { match: /sprint/i, domain: "messaging.sprintpcs.com" },
  { match: /boost/i, domain: "sms.myboostmobile.com" },
  { match: /cricket/i, domain: "sms.cricketwireless.net" },
  { match: /u\.?s\.?\s*cellular/i, domain: "email.uscc.net" },
  { match: /google\s*fi/i, domain: "msg.fi.google.com" },
  { match: /virgin\s*mobile/i, domain: "vmobl.com" },
  { match: /republic\s*wireless/i, domain: "text.republicwireless.com" },
  { match: /straight\s*talk/i, domain: "vtext.com" },
  { match: /xfinity/i, domain: "vtext.com" },
];

export function gatewayDomainForCarrier(carrier: string): string | null {
  return CARRIER_GATEWAYS.find(({ match }) => match.test(carrier))?.domain ?? null;
}

export type GatewaySendResult = { error: string | null; gatewayEmail: string | null };

// Sends a text by emailing <number>@<carrier's SMS gateway domain> through
// Resend, instead of a shared SMS API -- this sidesteps A2P 10DLC campaign
// registration entirely (no synthetic sending number of ours is involved),
// at the cost of no delivery receipts and no MMS.
//
// Looks up and caches the member's carrier on first send (members.carrier)
// so repeat sends -- bulk campaigns, the renewal-reminder cron -- don't
// re-query Veriphone for a number that hasn't changed. The cache is cleared
// wherever the member's phone number is edited (see app/api/admin/members/[id]
// and app/api/portal/profile).
export async function sendGatewaySms(memberId: number, phone: string, text: string): Promise<GatewaySendResult> {
  const digits = tenDigits(phone);
  if (!digits) return { error: "Invalid phone number", gatewayEmail: null };

  const { env } = await getCloudflareContext({ async: true });
  const db = await getDb();
  const [member] = await db.select({ carrier: members.carrier }).from(members).where(eq(members.id, memberId));

  let carrier = member?.carrier ?? null;
  if (!carrier) {
    const e164 = toE164(phone);
    if (!e164) return { error: "Invalid phone number", gatewayEmail: null };
    const lookup = await lookupCarrier(env.VERIPHONE_API_KEY, e164);
    if (!lookup.carrier) return { error: lookup.error ?? "Carrier lookup failed", gatewayEmail: null };
    carrier = lookup.carrier;
    await db.update(members).set({ carrier }).where(eq(members.id, memberId));
  }

  const domain = gatewayDomainForCarrier(carrier);
  if (!domain) return { error: `Unsupported carrier: ${carrier}`, gatewayEmail: null };

  const gatewayEmail = `${digits}@${domain}`;
  const { error } = await sendResendEmail(env.RESEND_API, {
    from: { name: SMS_FROM_NAME, email: SMS_FROM_EMAIL },
    to: gatewayEmail,
    subject: "",
    text,
  });
  return { error, gatewayEmail };
}
