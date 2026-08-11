export const SESSION_COOKIE = "kgc_session";
export const MEMBER_SESSION_COOKIE = "kgc_member_session";

// Same minimum enforced for admin passwords (app/api/admin/reset-password).
export const MIN_PASSWORD_LENGTH = 10;

// Annual dues amount, in cents. Change here if the board changes the fee --
// nothing else needs updating since the Checkout Session line item is built
// from this at request time.
export const DUES_AMOUNT_CENTS = 15000; // $150.00

// `documents.category` values used by the public membership form uploader
// (app/api/membership/submit) and the portal profile update
// (app/api/portal/profile). "discountCard" is also read by
// app/api/admin/payments/route.ts to cross-check reduced payments.
export const MEMBERSHIP_DOC_CATEGORIES = {
  nraProof: "nra_membership",
  discountCard: "discount_card",
  backgroundCheck: "background_check",
} as const;

export const MEMBERSHIP_ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/avif"];

// Shared between the public application form (app/api/membership/submit,
// where nraProof/backgroundCheck are required) and the portal profile update
// (app/api/portal/profile, where all three are optional replacements).
export const MEMBERSHIP_FILE_FIELDS: { field: string; category: string; label: string }[] = [
  { field: "nraProof", category: MEMBERSHIP_DOC_CATEGORIES.nraProof, label: "NRA Proof" },
  { field: "backgroundCheck", category: MEMBERSHIP_DOC_CATEGORIES.backgroundCheck, label: "Background Check" },
  { field: "discountCard", category: MEMBERSHIP_DOC_CATEGORIES.discountCard, label: "Discount Card" },
];
