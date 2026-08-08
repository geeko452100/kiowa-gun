import { getCloudflareContext } from "@opennextjs/cloudflare";

// Members' phone numbers are free-text (e.g. "(555) 123-4567"); SignalWire requires
// E.164. Assumes US/Canada numbers since that's this club's membership.
export function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return null;
}

export async function sendAdminSms(to: string, text: string) {
  const { env } = await getCloudflareContext({ async: true });
  return sendSignalWireSms(
    env.SIGNALWIRE_SPACE_URL,
    env.SIGNALWIRE_PROJECT_ID,
    env.SIGNALWIRE_API_TOKEN,
    env.SIGNALWIRE_FROM_NUMBER,
    { to, text }
  );
}

export async function sendSignalWireSms(
  spaceUrl: string,
  projectId: string,
  apiToken: string,
  from: string,
  { to, text, mediaUrl }: { to: string; text: string; mediaUrl?: string }
) {
  const params = new URLSearchParams({ From: from, To: to, Body: text });
  // A public-URL MediaUrl is all Twilio-compatible APIs (incl. SignalWire)
  // need to turn a plain SMS into an MMS -- it fetches the image itself.
  if (mediaUrl) params.set("MediaUrl", mediaUrl);

  const res = await fetch(
    `https://${spaceUrl}/api/laml/2010-04-01/Accounts/${projectId}/Messages.json`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${btoa(`${projectId}:${apiToken}`)}`,
      },
      body: params,
    }
  );
  if (!res.ok) {
    return { error: await res.text() };
  }
  return { error: null };
}
