import { RENEWAL_TERMINATION_CUTOFF } from "./constants";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// "YYYY-MM-DD" for the annual dues cutoff (RENEWAL_TERMINATION_CUTOFF) in a given year.
export function cutoffDate(year: number): string {
  return `${year}-${pad(RENEWAL_TERMINATION_CUTOFF.month)}-${pad(RENEWAL_TERMINATION_CUTOFF.day)}`;
}

export function todayStr(now: Date): string {
  return now.toISOString().slice(0, 10);
}

// Every member is due by the same clubwide cutoff each year (not a rolling
// anniversary of when they happen to pay) -- this is what lets the 45/15-day
// reminder cron and the termination sweep both key off one shared date. Given
// the cutoff a member has already paid through (their current renewalDate,
// if any), returns the cutoff a payment made "now" should count toward: the
// next cutoff that's still ahead of today, and strictly after whatever
// they've already paid through (so renewing early pushes them to the
// *following* cutoff instead of re-stamping the one they're already covered
// for).
export function nextCutoffAfterPayment(currentRenewalDate: string | null, now: Date): string {
  let year = now.getUTCFullYear();
  let candidate = cutoffDate(year);
  if (todayStr(now) > candidate) candidate = cutoffDate(++year);
  while (currentRenewalDate && currentRenewalDate >= candidate) {
    candidate = cutoffDate(++year);
  }
  return candidate;
}
