// One-off dev helper: seeds a single test member you can use to exercise
// BOTH payment paths against sandbox NMI --
//   1) first-time invoice payment (app/membership/pay/[token]) -- member
//      starts "Pending Review" + background-check-cleared, so it's payable,
//      with no portal account yet (password_hash left NULL) since a real
//      first-time applicant never has one. Paying flips status to "Member"
//      and emails the /portal/signup link (app/api/payments/invoice) --
//      that's the step to actually create the portal account, not something
//      this script should pre-seed.
//   2) renewal payment via the portal (app/portal -> Pay Dues) -- reuses the
//      same row once step 1's signup has set a password and made it a
//      "Member" with canPay still true.
//
// Local DB only -- writes to the same D1 instance `next dev` / wrangler dev
// reads from. Re-running replaces the row (ON CONFLICT by email) and clears
// any password set by a previous run, so step 1 starts fresh each time.
//
// Usage: node scripts/seed-test-member.mjs

import { webcrypto as crypto } from "node:crypto";
import { execSync } from "node:child_process";

const EMAIL = "admin@prairiewebstudio.com";
const NAME = "Test Member";

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

function run(sql) {
  const quoted = `"${sql.replace(/"/g, '\\"')}"`;
  execSync(`npx wrangler d1 execute kiowa-gun-club --local --command ${quoted}`, { stdio: "inherit" });
}

const invoiceToken = randomToken();
const escapedEmail = EMAIL.toLowerCase().trim().replace(/'/g, "''");
const escapedName = NAME.replace(/'/g, "''");

run(
  `INSERT INTO members (name, email, status, background_check_cleared, nra_active, can_pay, email_verified) ` +
    `VALUES ('${escapedName}', '${escapedEmail}', 'Pending Review', 1, 1, 1, 1) ` +
    `ON CONFLICT(email) DO UPDATE SET status='Pending Review', background_check_cleared=1, nra_active=1, can_pay=1, ` +
    `email_verified=1, password_hash=NULL, salt=NULL, renewal_date=NULL, terminated_at=NULL;`
);

run(
  `INSERT INTO membership_invoices (member_id, token) ` +
    `SELECT id, '${invoiceToken}' FROM members WHERE email = '${escapedEmail}';`
);

console.log(`\nTest member ready: ${EMAIL} (local DB, no portal account yet)`);
console.log(`\nStep 1 -- first-time payment (invoice link):`);
console.log(`  http://localhost:3000/membership/pay/${invoiceToken}`);
console.log(`  Paying emails a /portal/signup link -- follow that to create the portal account.`);
console.log(`\nStep 2 -- after step 1's signup, renewal payment via portal:`);
console.log(`  http://localhost:3000/portal (log in with the email/password you just set, then Pay Dues)`);
