## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [app/dues/page.tsx](app/dues/page.tsx)
- [app/membership/pay/[token]/page.tsx](app/membership/pay/%5Btoken%5D/page.tsx)
- [cloudflare-env.d.ts](cloudflare-env.d.ts)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| STRIPE_PAYMENT_LINK_URL | not configured yet | Set to your Stripe hosted payment link URL from the Stripe Dashboard (for example, `https://buy.stripe.com/...`). |
| payment link button destination | not configured yet | Point the dues button at the Stripe hosted payment link for your club membership dues. |

## Configured Parameters

These parameters were configured for the no-code hosted Stripe Checkout flow and are already wired into the app.

**Files containing these parameters:**
- [app/dues/page.tsx](app/dues/page.tsx)
- [app/membership/pay/[token]/page.tsx](app/membership/pay/%5Btoken%5D/page.tsx)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted_page |
| billing_address_collection | auto |
| phone_number_collection | disabled |
| automatic_tax | disabled |
| allow_promotion_codes | false |
| payment_method_collection | always |
| submit_type | auto |
| integration_identifier | hosted_web_0001 |
| origin_context | web |
| mode | payment |

> This project uses a no-code Stripe Checkout payment link rather than a server-side `stripe.checkout.sessions.create(...)` call. The payment page button opens the hosted Stripe page directly, and the page also supports a prefilled email when available.

## Setup and Next Steps

- Set `STRIPE_PAYMENT_LINK_URL` in your Cloudflare environment or deployment secrets using the hosted Stripe Checkout payment link.
- Confirm the member-facing page is the one linked from approval and renewal text messages: [app/dues/page.tsx](app/dues/page.tsx).
- Confirm the approval and reminder text templates point to the same dues page and include a fully qualified site URL in the text message.
- Test the button in a browser with your Stripe test payment link before switching to production.
- Use Stripe test cards for validation, then replace the test payment link with the live one when ready.
- If you later add server-side Stripe Checkout Session creation, keep the same `payment` mode and `hosted_page` UI flow aligned with the current setup.

### Project structure relevant to this integration
- [app/dues/page.tsx](app/dues/page.tsx) — public dues payment page with the button that redirects to Stripe.
- [app/membership/pay/[token]/page.tsx](app/membership/pay/%5Btoken%5D/page.tsx) — approval-stage dues page.
- [app/api/admin/members/[id]/route.ts](app/api/admin/members/%5Bid%5D/route.ts) — approval text and email trigger.
- [app/api/cron/renewal-reminders/route.ts](app/api/cron/renewal-reminders/route.ts) — dues reminder text trigger.
- [cloudflare-env.d.ts](cloudflare-env.d.ts) — environment typing for the payment link.

### How the integration works
1. A member is approved or a renewal reminder is sent.
2. The text includes a link to the site dues page.
3. The dues page renders a single pay button.
4. Clicking the button opens the Stripe hosted payment page for the membership charge.
5. Once the payment is complete, Stripe redirects back to the configured success/cancel flow in the Stripe dashboard.

### Resources
- https://support.stripe.com
- https://docs.stripe.com/mcp
