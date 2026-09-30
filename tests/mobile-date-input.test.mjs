import assert from "node:assert/strict";
import fs from "node:fs";

const documentsPage = fs.readFileSync(new URL("../app/membership/apply/documents/page.tsx", import.meta.url), "utf8");

assert.match(documentsPage, /type="text"/i);
assert.match(documentsPage, /placeholder="MM\/DD\/YYYY"/i);
assert.match(documentsPage, /showPicker\s*\(|calendar/i);
assert.match(documentsPage, /title="MM\/DD\/YYYY"/i);
assert.match(documentsPage, /MM\/DD\/YYYY/i);

console.log("documents page uses an explicit MM/DD/YYYY text field with a calendar fallback for mobile users");
