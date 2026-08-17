import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// The account-level lockout in lib/auth.ts (MAX_FAILED_LOGIN_ATTEMPTS) only
// throttles repeated guesses against one account. It does nothing to stop
// credential stuffing spread across many different accounts, or plain
// request flooding of signup/forgot-password, from a single IP. This adds
// that missing per-IP layer using Cloudflare's edge Rate Limiting binding
// (see AUTH_RATE_LIMITER in wrangler.jsonc), enforced before the request
// ever reaches the DB.
export async function checkRateLimit(routeKey: string, request: Request): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { env } = await getCloudflareContext({ async: true });
  const { success } = await env.AUTH_RATE_LIMITER.limit({ key: `${routeKey}:${ip}` });
  return success;
}

export const RATE_LIMITED_RESPONSE_BODY = {
  error: "Too many requests. Please wait a bit and try again.",
} as const;
