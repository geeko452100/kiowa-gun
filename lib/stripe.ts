import Stripe from "stripe";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Cloudflare Workers has no Node net/http sockets, so Stripe's SDK must be
// pointed at its fetch-based HTTP client instead of the default Node one.
export async function getStripe() {
  const { env } = await getCloudflareContext({ async: true });
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
