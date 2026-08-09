"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CardFields from "@/components/nmi/CardFields";

export default function PaymentSection({
  email,
  tokenizationKey,
  hasSubscription,
  subscriptionStatus,
}: {
  email: string;
  tokenizationKey: string;
  hasSubscription: boolean;
  subscriptionStatus: string | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  async function subscribe(paymentToken: string) {
    setError("");
    setSaved(false);
    setSubmitting(true);
    const res = await fetch("/api/payments/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, paymentToken }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setSubmitting(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Could not start payment. Contact the club.");
      return;
    }
    setSaved(true);
    // hasSubscription/subscriptionStatus come from the server component that
    // renders this -- refresh so it re-fetches and swaps to the "manage"
    // view instead of showing "Pay Dues" again.
    router.refresh();
  }

  async function updateMethod(paymentToken: string) {
    setError("");
    setSaved(false);
    setSubmitting(true);
    const res = await fetch("/api/payments/update-method", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentToken }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setSubmitting(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Could not update payment method. Contact the club.");
      return;
    }
    setSaved(true);
    setShowUpdateForm(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {hasSubscription ? (
        <>
          <p>
            Dues subscription status: <span className="portal-badge">{subscriptionStatus ?? "unknown"}</span>
          </p>
          {showUpdateForm ? (
            <CardFields
              tokenizationKey={tokenizationKey}
              onToken={updateMethod}
              onError={setError}
              submitLabel={submitting ? "Saving…" : "Save New Card"}
              disabled={submitting}
            />
          ) : (
            <button type="button" onClick={() => setShowUpdateForm(true)}>
              Update Payment Method
            </button>
          )}
        </>
      ) : (
        <>
          <p>No dues subscription on file yet. Enter your card info to pay and set up automatic annual renewal.</p>
          <CardFields
            tokenizationKey={tokenizationKey}
            onToken={subscribe}
            onError={setError}
            submitLabel={submitting ? "Processing…" : "Pay Dues"}
            disabled={submitting}
          />
        </>
      )}
      {error && <p className="portal-error">{error}</p>}
      {saved && !error && <p className="portal-saved">Saved.</p>}
    </div>
  );
}
