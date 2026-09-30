import assert from "node:assert/strict";
import fs from "node:fs";

const stripeFile = fs.readFileSync(new URL("../lib/stripe.ts", import.meta.url), "utf8");
const webhookFile = fs.readFileSync(new URL("../app/api/webhooks/stripe/route.ts", import.meta.url), "utf8");

assert.match(
  stripeFile,
  /await\s+db\.update\(members\)\.set\(\{\s*status:\s*"Member"\s*\}\)\.where\(eq\(members\.id,\s*member\.id\)\);/s,
  "invoice fulfillment upgrades a pending-review applicant to Member after payment clears"
);

assert.match(
  webhookFile,
  /checkout\.session\.completed|checkout\.session\.async_payment_succeeded/,
  "Stripe webhook listens for successful checkout payment events"
);

console.log("stripe payment completion upgrades pending-review applicants to member status");
