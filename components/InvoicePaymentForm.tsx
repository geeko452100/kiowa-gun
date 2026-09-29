"use client";

import { useCallback } from "react";
import EmbeddedCheckout from "@/components/stripe/EmbeddedCheckout";

export default function InvoicePaymentForm({ token, publishableKey }: { token: string; publishableKey: string | null }) {
  const createSession = useCallback(async () => {
    const res = await fetch("/api/payments/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = (await res.json().catch(() => ({}))) as { clientSecret?: string; error?: string };
    if (!res.ok || !data.clientSecret) {
      throw new Error(data.error ?? "Couldn't start checkout. Try again shortly.");
    }
    return data.clientSecret;
  }, [token]);

  if (!publishableKey) {
    return <p className="membership-form-error">Online card payment isn&apos;t configured yet. Contact the club to pay dues another way.</p>;
  }

  return <EmbeddedCheckout publishableKey={publishableKey} createSession={createSession} />;
}
