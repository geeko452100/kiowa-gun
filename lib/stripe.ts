import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { members, membershipInvoices } from "./schema";
import { DUES_AMOUNT_CENTS } from "./constants";
import { recordDuesPayment, recomputeCanPay } from "./members";
import { sendAdminEmail } from "./email";

// ---------------------------------------------------------------------------
// Board decision (2026-08): dues are NEVER auto-billed and cards are NEVER
// stored. Every charge is a one-time Checkout Session a member (or, for a
// manual exception, an admin acting on their behalf) deliberately completes
// -- there is no Stripe subscription, no Customer vault, and no
// setup_future_usage anywhere in this codebase. Do not reintroduce
// mode: "subscription" or customer_creation: "always" to "simplify"
// renewals -- that's exactly the automatic billing the board rejected.
// Renewal cadence instead comes from the 45/15-day reminder cron
// (app/api/cron/renewal-reminders) and the annual cutoff termination sweep
// (app/api/cron/renewal-termination), both keyed off the member's own
// action, not Stripe's.
// ---------------------------------------------------------------------------

// Lightweight Stripe REST client. The official `stripe` SDK pulls in Node
// built-ins that don't play well on Workers, and we only need Checkout
// Session create/retrieve plus webhook signature verification.
const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2026-07-29.dahlia";

export class StripeConfigError extends Error {}
export class StripeApiError extends Error {}

async function stripeEnv() {
  const { env } = await getCloudflareContext({ async: true });
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new StripeConfigError("STRIPE_SECRET_KEY is not configured");
  return {
    secretKey,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  };
}

export async function getStripePublishableKey(): Promise<string | null> {
  const { env } = await getCloudflareContext({ async: true });
  return env.STRIPE_PUBLISHABLE_KEY || null;
}

// Flatten nested objects/arrays into Stripe's bracketed form-encoding, e.g.
// { line_items: [{ quantity: 1 }] } -> "line_items[0][quantity]=1".
function toForm(obj: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          parts.push(...toForm(item as Record<string, unknown>, `${name}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      parts.push(...toForm(value as Record<string, unknown>, name));
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

async function stripeRequest(method: "GET" | "POST", path: string, body?: Record<string, unknown>) {
  const { secretKey } = await stripeEnv();
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? toForm(body).join("&") : undefined,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      (json.error as { message?: string } | undefined)?.message ?? `Stripe error (${res.status})`;
    throw new StripeApiError(message);
  }
  return json;
}

export type CheckoutSession = {
  id: string;
  client_secret: string | null;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | null;
  metadata: Record<string, string> | null;
};

export function asCheckoutSession(json: Record<string, unknown>): CheckoutSession {
  return {
    id: json.id as string,
    client_secret: (json.client_secret as string | null) ?? null,
    payment_status: (json.payment_status as string) ?? "",
    amount_total: (json.amount_total as number | null) ?? null,
    currency: (json.currency as string | null) ?? null,
    payment_intent: typeof json.payment_intent === "string" ? json.payment_intent : null,
    metadata: (json.metadata as Record<string, string> | null) ?? null,
  };
}

function integrationIdentifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(bytes, (b) => String.fromCharCode(97 + (b % 26))).join("");
  return `kiowa-dues-${suffix}`;
}

export async function createDuesCheckoutSession(opts: {
  memberId: number;
  memberEmail: string;
  returnUrl: string;
  kind: "dues" | "invoice";
  invoiceToken?: string;
  origin: string;
}): Promise<{ id: string; clientSecret: string }> {
  const session = asCheckoutSession(
    await stripeRequest("POST", "/checkout/sessions", {
      mode: "payment",
      ui_mode: "embedded_page",
      // Guest checkout -- do not create a Stripe Customer or save a card.
      customer_email: opts.memberEmail,
      return_url: opts.returnUrl,
      submit_type: "pay",
      integration_identifier: integrationIdentifier(),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: DUES_AMOUNT_CENTS,
            product_data: { name: "Kiowa Gun Club annual membership dues" },
          },
        },
      ],
      metadata: {
        kind: opts.kind,
        member_id: String(opts.memberId),
        origin: opts.origin,
        ...(opts.invoiceToken ? { invoice_token: opts.invoiceToken } : {}),
      },
    })
  );
  if (!session.client_secret) {
    throw new StripeApiError("Stripe did not return a checkout client secret");
  }
  return { id: session.id, clientSecret: session.client_secret };
}

export async function retrieveCheckoutSession(sessionId: string): Promise<CheckoutSession> {
  return asCheckoutSession(await stripeRequest("GET", `/checkout/sessions/${encodeURIComponent(sessionId)}`));
}

// Idempotent: webhook and the return page both call this. A paid session is
// recorded once; later calls are no-ops.
export async function fulfillPaidCheckoutSession(session: CheckoutSession): Promise<void> {
  if (session.payment_status !== "paid") return;

  const memberId = Number(session.metadata?.member_id);
  if (!Number.isFinite(memberId) || memberId <= 0) return;

  const db = await getDb();
  const [member] = await db.select().from(members).where(eq(members.id, memberId));
  if (!member) return;

  await recordDuesPayment(db, member, {
    stripeCheckoutSessionId: session.id,
    paymentMethodType: "card",
  });

  if (session.metadata?.kind !== "invoice") return;

  const token = session.metadata.invoice_token;
  if (!token) return;

  const [invoice] = await db.select().from(membershipInvoices).where(eq(membershipInvoices.token, token));
  if (!invoice || invoice.paidAt) return;

  await db.update(members).set({ status: "Member" }).where(eq(members.id, member.id));
  await db
    .update(membershipInvoices)
    .set({ paidAt: new Date().toISOString() })
    .where(eq(membershipInvoices.id, invoice.id));
  await recomputeCanPay(db, member.id);

  const origin = (session.metadata.origin || "").replace(/\/$/, "");
  const signupLink = `${origin || ""}/portal/signup`;
  await sendAdminEmail(
    member.email,
    "Welcome to Kiowa Gun Club — Set Up Your Member Portal Account",
    `<p>Your membership is approved and your dues are paid. You're officially a Kiowa Gun Club member!</p>
     <p><a href="${signupLink}">Create your member portal account</a> to log in, manage your membership, and access member resources.</p>`
  );
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: CheckoutSession & Record<string, unknown> };
};

// Verify the `Stripe-Signature` header against the raw request body.
// Returns the parsed event on success, or null if the signature is invalid.
export async function verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<StripeEvent | null> {
  const { webhookSecret } = await stripeEnv();
  if (!webhookSecret || !signatureHeader) return null;

  const timestamp = signatureHeader
    .split(",")
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const signatures = signatureHeader
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return null;

  // Reject signatures older than 5 minutes to blunt replay attacks.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const actual = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!signatures.some((expected) => timingSafeEqual(actual, expected))) return null;
  return JSON.parse(rawBody) as StripeEvent;
}
