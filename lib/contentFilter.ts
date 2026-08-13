// Carriers filter A2P/10DLC SMS under "SHAFT" categories (Sex, Hate, Alcohol,
// Firearms, Tobacco/drugs) and will silently drop or delay messages that trip
// their filters. This is a gun club, so plain firearms vocabulary (gun, rifle,
// ammo...) shows up in nearly every legitimate message -- expect most texts
// to get auto-rewritten. That's the accepted tradeoff of matching real SHAFT
// scope rather than narrowing it to avoid false positives.
type RiskEntry = { pattern: RegExp; label: string; replacement: string };

const RISK_ENTRIES: RiskEntry[] = [
  // Sex
  { pattern: /\bporn\w*\b/gi, label: "porn", replacement: "" },
  { pattern: /\bxxx\b/gi, label: "xxx", replacement: "" },
  { pattern: /\bnude\w*\b/gi, label: "nude", replacement: "" },
  { pattern: /\bescort\w*\b/gi, label: "escort", replacement: "" },
  { pattern: /\bsex\w*\b/gi, label: "sex", replacement: "" },
  // Hate
  { pattern: /\bhate speech\b/gi, label: "hate speech", replacement: "" },
  { pattern: /\bracist\w*\b/gi, label: "racist", replacement: "" },
  { pattern: /\bbigot\w*\b/gi, label: "bigot", replacement: "" },
  // Alcohol
  { pattern: /\balcohol\w*\b/gi, label: "alcohol", replacement: "refreshments" },
  { pattern: /\bbeer\b/gi, label: "beer", replacement: "refreshments" },
  { pattern: /\bwine\b/gi, label: "wine", replacement: "refreshments" },
  { pattern: /\bliquor\b/gi, label: "liquor", replacement: "refreshments" },
  { pattern: /\bwhiskey\b/gi, label: "whiskey", replacement: "refreshments" },
  { pattern: /\bvodka\b/gi, label: "vodka", replacement: "refreshments" },
  { pattern: /\bdrunk\w*\b/gi, label: "drunk", replacement: "" },
  { pattern: /\bopen bar\b/gi, label: "open bar", replacement: "refreshments provided" },
  // Firearms -- broad, matching real SHAFT/carrier scope rather than just
  // sale/marketing phrasing. Sale-specific phrases are matched first (longest
  // match wins in buildSafeMessage's ordering) so they get more specific
  // replacements before the generic noun rules below also strip them.
  { pattern: /\bguns? for sale\b/gi, label: "guns for sale", replacement: "items available at the club" },
  { pattern: /\bbuy (a )?guns?\b/gi, label: "buy gun(s)", replacement: "visit the club" },
  { pattern: /\bammo(?: for)? sale\b/gi, label: "ammo sale", replacement: "supplies available" },
  { pattern: /\bfirearms? for sale\b/gi, label: "firearms for sale", replacement: "items available at the club" },
  { pattern: /\bdiscount(?:ed)? ammo\b/gi, label: "discounted ammo", replacement: "member pricing" },
  { pattern: /\bguns?\b/gi, label: "gun", replacement: "equipment" },
  { pattern: /\brifles?\b/gi, label: "rifle", replacement: "equipment" },
  { pattern: /\bpistols?\b/gi, label: "pistol", replacement: "equipment" },
  { pattern: /\bshotguns?\b/gi, label: "shotgun", replacement: "equipment" },
  { pattern: /\bfirearms?\b/gi, label: "firearm", replacement: "equipment" },
  { pattern: /\bweapons?\b/gi, label: "weapon", replacement: "equipment" },
  { pattern: /\bammo\b/gi, label: "ammo", replacement: "supplies" },
  { pattern: /\bammunition\b/gi, label: "ammunition", replacement: "supplies" },
  { pattern: /\bexplosive\w*\b/gi, label: "explosive", replacement: "" },
  { pattern: /\bbomb\w*\b/gi, label: "bomb", replacement: "" },
  { pattern: /\bkill\w*\b/gi, label: "kill", replacement: "" },
  // Tobacco / drugs
  { pattern: /\btobacco\b/gi, label: "tobacco", replacement: "" },
  { pattern: /\bcigarette\w*\b/gi, label: "cigarette", replacement: "" },
  { pattern: /\bvap(?:e|es|ing)\b/gi, label: "vape", replacement: "" },
  { pattern: /\bmarijuana\b/gi, label: "marijuana", replacement: "" },
  { pattern: /\bcannabis\b/gi, label: "cannabis", replacement: "" },
  { pattern: /\bweed\b/gi, label: "weed", replacement: "" },
  { pattern: /\bcocaine\b/gi, label: "cocaine", replacement: "" },
  { pattern: /\bnarcotic\w*\b/gi, label: "narcotic", replacement: "" },
];

export function findRiskyWords(text: string): string[] {
  const found = new Set<string>();
  for (const { pattern, label } of RISK_ENTRIES) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) found.add(label);
  }
  return [...found];
}

const FALLBACK_MESSAGE = "Message from the board -- please check your email or the member portal for details.";

export function buildSafeMessage(text: string): string {
  let safe = text;
  for (const { pattern, replacement } of RISK_ENTRIES) {
    pattern.lastIndex = 0;
    safe = safe.replace(pattern, replacement);
  }
  safe = safe.replace(/\s{2,}/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
  return safe.length > 0 ? safe : FALLBACK_MESSAGE;
}
