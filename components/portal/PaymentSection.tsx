"use client";

import { useCallback } from "react";
import EmbeddedCheckout from "@/components/stripe/EmbeddedCheckout";

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
  publishableKey,
  renewalDate,
  canPay,
}: {
  email: string;
  publishableKey: string | null;
  renewalDate: string | null;
  canPay: boolean;
}) {
  const createSession = useCallback(async () => {
    const res = await fetch("/api/payments/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => ({}))) as { clientSecret?: string; error?: string };
    if (!res.ok || !data.clientSecret) {
      throw new Error(data.error ?? "We couldn't start checkout. Please reach out to the club for help.");
    }
    return data.clientSecret;
  }, [email]);

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
      {publishableKey ? (
        <EmbeddedCheckout publishableKey={publishableKey} createSession={createSession} />
      ) : (
        <p className="portal-error">
          Online card payment isn&apos;t available yet. Contact the club to pay dues another way.
        </p>
      )}
    </div>
  );
}
