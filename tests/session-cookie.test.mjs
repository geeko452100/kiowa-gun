import assert from "node:assert/strict";
import fs from "node:fs";

const adminAuth = fs.readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
const memberAuth = fs.readFileSync(new URL("../lib/memberAuth.ts", import.meta.url), "utf8");

assert.match(adminAuth, /secure:\s*process\.env\.NODE_ENV === "production"/);
assert.match(memberAuth, /secure:\s*process\.env\.NODE_ENV === "production"/);

console.log("session cookies are gated to production HTTPS only");
