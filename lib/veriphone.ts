// Veriphone (https://veriphone.io) validates a phone number and returns the
// carrier network it's currently provisioned on. lib/sms.ts uses that carrier
// name to pick the right email-to-SMS gateway domain, since there's no
// SMS-API-wide way to send a text -- each carrier only accepts mail sent to
// its own gateway.
export type CarrierLookupResult = {
  carrier: string | null;
  error: string | null;
};

export async function lookupCarrier(apiKey: string, phoneE164: string): Promise<CarrierLookupResult> {
  const url = new URL("https://api.veriphone.io/v2/verify");
  url.searchParams.set("phone", phoneE164);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return { carrier: null, error: `Veriphone request failed: ${await res.text()}` };
  }

  const json = (await res.json()) as {
    status?: string;
    phone_valid?: boolean;
    carrier?: string;
    error?: string;
  };
  if (json.status === "error") {
    return { carrier: null, error: json.error ?? "Veriphone lookup failed" };
  }
  if (!json.phone_valid) {
    return { carrier: null, error: "Phone number is not valid" };
  }
  if (!json.carrier) {
    return { carrier: null, error: "Veriphone returned no carrier for this number" };
  }
  return { carrier: json.carrier, error: null };
}
