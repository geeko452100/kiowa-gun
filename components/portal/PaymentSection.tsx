"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CardFields from "@/components/nmi/CardFields";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  past_due: "Payment past due",
};

export default function PaymentSection({
  email,
  tokenizationKey,
  hasSubscription,
  subscriptionStatus,
  canPay,
}: {
  email: string;
  tokenizationKey: string;
  hasSubscription: boolean;
  subscriptionStatus: string | null;
  canPay: boolean;
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
      setError(data.error ?? "We couldn't process your payment. Please reach out to the club for help.");
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
      setError(data.error ?? "We couldn't update your payment method. Please reach out to the club for help.");
      return;
    }
    setSaved(true);
    setShowUpdateForm(false);
  }

  if (!canPay) {
    return (
      <p className="portal-error">
        Dues payment is currently unavailable on your account. Contact the club if you believe
        this is a mistake.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {hasSubscription ? (
        <>
          <p>
            Dues status:{" "}
            <span className="portal-badge">
              {(subscriptionStatus && STATUS_LABELS[subscriptionStatus]) ?? "Status unavailable"}
            </span>
          </p>
          {showUpdateForm ? (
            <CardFields
              tokenizationKey={tokenizationKey}
              onToken={updateMethod}
              onError={setError}
              submitLabel={submitting ? "Saving…" : "Save Payment Method"}
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
          <p>
            You don&apos;t have a dues payment on file yet. Pay with a card or bank account below
            to set up automatic renewal each year.
          </p>
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
      {saved && !error && <p className="portal-saved">Your payment info has been saved.</p>}
    </div>
  );
}
