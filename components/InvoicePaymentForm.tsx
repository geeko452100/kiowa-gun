"use client";

import { useState } from "react";
import CardFields from "@/components/nmi/CardFields";

export default function InvoicePaymentForm({ token, tokenizationKey }: { token: string; tokenizationKey: string }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paid, setPaid] = useState(false);

  async function onPaymentToken(paymentToken: string) {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, paymentToken }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Your payment didn't go through. Try again below.");
        setSubmitting(false);
        return;
      }
      setPaid(true);
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setSubmitting(false);
    }
  }

  if (paid) {
    return (
      <div className="apply-complete">
        <div className="apply-complete-check" aria-hidden="true">
          ✓
        </div>
        <h3>Payment Complete</h3>
        <p>Welcome to Kiowa Gun Club! Watch your email for orientation details.</p>
      </div>
    );
  }

  return (
    <>
      <CardFields
        tokenizationKey={tokenizationKey}
        onToken={onPaymentToken}
        onError={setError}
        submitLabel={submitting ? "Processing…" : "Pay Dues"}
        disabled={submitting}
      />
      {error && <p className="apply-error">{error}</p>}
    </>
  );
}
