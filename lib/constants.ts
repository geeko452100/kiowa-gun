export const SESSION_COOKIE = "kgc_session";

// Annual dues amount, in cents. Change here if the board changes the fee --
// nothing else needs updating since the Checkout Session line item is built
// from this at request time.
export const DUES_AMOUNT_CENTS = 15000; // $150.00

// `documents.category` values used by the public membership form uploader
// (app/api/membership/submit). "discountCard" is also read by
// app/api/admin/payments/route.ts to cross-check reduced payments.
export const MEMBERSHIP_DOC_CATEGORIES = {
  nraProof: "nra_membership",
  discountCard: "discount_card",
  backgroundCheck: "background_check",
} as const;
