import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DUES_AMOUNT_CENTS } from "./constants";

// NMI's v5 REST API is split across sandbox.nmi.com and secure.nmi.com --
// same API key format, different base URL. Defaults to sandbox so this
// doesn't accidentally start hitting production before that's intended;
// flip via the NMI_ENVIRONMENT secret ("sandbox" | "production").
async function getNmiBaseUrl() {
  const { env } = await getCloudflareContext({ async: true });
  const environment = env.NMI_ENVIRONMENT || "sandbox";
  return environment === "production" ? "https://secure.nmi.com/api/v5" : "https://sandbox.nmi.com/api/v5";
}

// Confirmed against a real sandbox account: a successful POST /subscriptions
// returns the subscription object directly (id, start_date,
// next_billing_date, amount, customer_vault_id, plan {...}) with no
// "response"/"transaction_id" field -- despite what NMI's own docs examples
// suggested. Errors come back as a distinct shaped object instead
// (type/message/ref_id), on a non-2xx status.
export type NmiSubscription = {
  object: "subscription";
  id: string;
  start_date: string;
  next_billing_date: string;
  amount: string;
  customer_vault_id: string;
  delayed_condition: string;
  paused_subscription: number;
  plan: { id: string; plan_amount: string; plan_payments: string; month_frequency: string; day_of_month: string };
};

export class NmiApiError extends Error {
  constructor(
    message: string,
    public refId?: string
  ) {
    super(message);
  }
}

export async function nmiRequest(
  path: string,
  method: "POST" | "PUT",
  body: Record<string, unknown>
): Promise<NmiSubscription> {
  const { env } = await getCloudflareContext({ async: true });
  const baseUrl = await getNmiBaseUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: env.NMI_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof data.message === "string" ? data.message : `NMI request failed (${res.status})`;
    const refId = typeof data.ref_id === "string" ? data.ref_id : typeof data.refId === "string" ? data.refId : undefined;
    throw new NmiApiError(message, refId);
  }
  return data as NmiSubscription;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? name, lastName: parts.slice(1).join(" ") || parts[0] || name };
}

// Starts a member's recurring annual dues subscription from an NMI
// Collect.js payment_token. Shared by app/api/payments/subscribe (renewals,
// via the member portal) and app/api/payments/invoice (a new applicant's
// first payment, via their emailed invoice link) so the subscription-shape
// logic only lives in one place.
export async function createDuesSubscription(member: { name: string; email: string }, paymentToken: string) {
  const { firstName, lastName } = splitName(member.name);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return nmiRequest("/subscriptions", "POST", {
    plan_amount: (DUES_AMOUNT_CENTS / 100).toFixed(2),
    // 0 = renews indefinitely until canceled, not a fixed number of payments.
    plan_payments: 0,
    month_frequency: 12,
    day_of_month: tomorrow.getDate(),
    start_date: toNmiDate(tomorrow),
    payment_details: { payment_token: paymentToken },
    billing_address: { first_name: firstName, last_name: lastName, email: member.email },
  });
}

// NMI wants dates as YYYYMMDD (no separators) for subscription start_date --
// confirmed against sandbox; ISO "YYYY-MM-DD" is rejected as "Invalid start date".
export function toNmiDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Webhook payloads are signed HMAC-SHA256 over the raw request body, using
// the signing secret shown when the webhook was created in the NMI Merchant
// Portal (Settings > Webhooks) -- sent back in the `Signature` header.
export async function verifyNmiWebhookSignature(rawBody: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = toHex(mac);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
