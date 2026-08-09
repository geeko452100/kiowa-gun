"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CardFields from "@/components/nmi/CardFields";

export default function DuesForm({ tokenizationKey }: { tokenizationKey: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onToken(paymentToken: string) {
    if (!email) {
      setError("Enter your email first");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, paymentToken }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push("/dues/success");
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="dues-form">
      <label>
        Email on file with the club
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <CardFields
        tokenizationKey={tokenizationKey}
        onToken={onToken}
        onError={setError}
        submitLabel={submitting ? "Processing…" : "Pay Dues"}
        disabled={submitting || !email}
      />
      {error && <p className="dues-error">{error}</p>}
    </div>
  );
}
