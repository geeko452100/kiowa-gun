// Creates the first admin login. Run once after migrations are applied.
//
// Usage:
//   INITIAL_ADMIN_EMAIL=you@club.org INITIAL_ADMIN_PASSWORD=... INITIAL_ADMIN_NAME="Your Name" \
//     node scripts/seed-admin.mjs --local
//   (drop --local to write to the remote/production database instead)

import { webcrypto as crypto } from "node:crypto";
import { execSync } from "node:child_process";

const email = process.env.INITIAL_ADMIN_EMAIL;
const password = process.env.INITIAL_ADMIN_PASSWORD;
const name = process.env.INITIAL_ADMIN_NAME || "Board Admin";
const target = process.argv.includes("--local") ? "--local" : "--remote";

if (!email || !password) {
  console.error(
    "Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD environment variables first."
  );
  process.exit(1);
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pw),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: toHex(derived), salt: toHex(salt) };
}

const { hash, salt } = await hashPassword(password);
const escapedEmail = email.toLowerCase().trim().replace(/'/g, "''");
const escapedName = name.replace(/'/g, "''");

// This script is the root bootstrap path (no in-CMS way to create the very first
// login), so the account it creates gets tech_admin — the top of the role
// hierarchy — and can appoint/replace the president from the Board Members page.
// On conflict this also clears any login lockout, so re-running this script
// doubles as a recovery path if you get locked out of your own account.
const sql = `INSERT INTO admin_users (email, password_hash, salt, name, role) VALUES ('${escapedEmail}', '${hash}', '${salt}', '${escapedName}', 'tech_admin') ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, salt=excluded.salt, name=excluded.name, failed_login_count=0, locked_until=NULL;`;

const quotedSql = `"${sql.replace(/"/g, '\\"')}"`;
execSync(`npx wrangler d1 execute kiowa-gun-club ${target} --command ${quotedSql}`, {
  stdio: "inherit",
});

console.log(`Admin user ${email} is ready (${target}).`);
