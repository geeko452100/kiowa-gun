import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DUES_AMOUNT_CENTS } from "./constants";

// ---------------------------------------------------------------------------
// Board decision (2026-08): dues are NEVER auto-billed and cards are NEVER
// stored. Every charge is a one-time sale a member (or, for a manual
// exception, an admin acting on their behalf) deliberately triggers -- there
// is no NMI subscription, no customer vault, and no scheduled recurring
// charge anywhere in this codebase. Do not reintroduce POST /subscriptions
// or a customer-vault "add_customer" action to "simplify" renewals -- that's
// exactly the automatic billing the board rejected. Renewal cadence instead
// comes from the 45/15-day reminder cron (app/api/cron/renewal-reminders)
// and the annual cutoff termination sweep (app/api/cron/renewal-termination),
// both keyed off the member's own action, not NMI's.
// ---------------------------------------------------------------------------

// NMI's v5 REST API is split across sandbox.nmi.com and secure.nmi.com --
// same API key format, different base URL. Defaults to sandbox so this
// doesn't accidentally start hitting production before that's intended;
// flip via the NMI_ENVIRONMENT secret ("sandbox" | "production").
async function getNmiBaseUrl() {
  const { env } = await getCloudflareContext({ async: true });
  const environment = env.NMI_ENVIRONMENT || "sandbox";
  return environment === "production" ? "https://secure.nmi.com/api/v5" : "https://sandbox.nmi.com/api/v5";
}

// A one-time sale transaction -- no plan, no customer_vault, nothing NMI will
// ever bill again on its own.
export type NmiTransaction = {
  object: "transaction";
  id: string;
  amount: string;
};

export class NmiApiError extends Error {
  constructor(
    message: string,
    public refId?: string
  ) {
    super(message);
  }
}

export async function nmiRequest<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: Record<string, unknown>
): Promise<T> {
  const { env } = await getCloudflareContext({ async: true });
  const baseUrl = await getNmiBaseUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: env.NMI_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof data.message === "string" ? data.message : `NMI request failed (${res.status})`;
    const refId = typeof data.ref_id === "string" ? data.ref_id : typeof data.refId === "string" ? data.refId : undefined;
    throw new NmiApiError(message, refId);
  }
  return data as T;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? name, lastName: parts.slice(1).join(" ") || parts[0] || name };
}

// Charges a member's dues as a single, immediate, non-recurring sale from an
// NMI Collect.js payment_token -- nothing is stored on NMI's side afterward.
// Shared by app/api/payments/pay (portal, existing members) and
// app/api/payments/invoice (a new applicant's first payment, via their
// emailed invoice link) so the charge-shape logic only lives in one place.
export async function chargeDues(member: { name: string; email: string }, paymentToken: string): Promise<NmiTransaction> {
  const { firstName, lastName } = splitName(member.name);
  return nmiRequest<NmiTransaction>("/payments/sale", "POST", {
    amount: (DUES_AMOUNT_CENTS / 100).toFixed(2),
    currency: "USD",
    payment_details: { payment_token: paymentToken },
    billing_address: { first_name: firstName, last_name: lastName, email: member.email },
  });
}

// Cancels a recurring subscription created before the board's no-auto-billing
// decision, so it stops NMI from auto-charging that member again. Only used
// by the one-time admin cleanup action for legacy rows -- nothing in the
// current charge flow ever creates a subscription to begin with.
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await nmiRequest(`/subscriptions/${subscriptionId}`, "DELETE");
}
