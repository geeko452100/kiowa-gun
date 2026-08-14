"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CardFields from "@/components/nmi/CardFields";

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function PaymentSection({
  email,
  tokenizationKey,
  renewalDate,
  canPay,
}: {
  email: string;
  tokenizationKey: string;
  renewalDate: string | null;
  canPay: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function pay(paymentToken: string) {
    setError("");
    setSaved(false);
    setSubmitting(true);
    const res = await fetch("/api/payments/pay", {
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
    // renewalDate comes from the server component that renders this --
    // refresh so it re-fetches and shows the new paid-through date.
    router.refresh();
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
      <p>
        {renewalDate
          ? `Dues status: paid through ${formatDate(renewalDate)}.`
          : "You don't have a dues payment on file yet."}{" "}
        Nothing is billed automatically — pay below to cover your dues for the current period.
      </p>
      <CardFields
        tokenizationKey={tokenizationKey}
        onToken={pay}
        onError={setError}
        submitLabel={submitting ? "Processing…" : "Pay Dues"}
        disabled={submitting}
      />
      {error && <p className="portal-error">{error}</p>}
      {saved && !error && <p className="portal-saved">Your payment has been received.</p>}
    </div>
  );
}
