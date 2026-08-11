"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CardFields from "@/components/nmi/CardFields";
import { useApplyWizard } from "@/components/apply/ApplyWizardContext";
import ApplyProgressBar from "@/components/apply/ApplyProgressBar";

export default function PaymentStep({ tokenizationKey }: { tokenizationKey: string }) {
  const router = useRouter();
  const { email, applicationSubmitted, update } = useApplyWizard();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!applicationSubmitted) router.replace("/membership/apply/documents");
  }, [applicationSubmitted, router]);

  async function onPaymentToken(paymentToken: string) {
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
        setError(data.error ?? "Your application was saved, but payment didn't go through. Try again below.");
        setSubmitting(false);
        return;
      }
      update({ paid: true });
      router.push("/membership/apply/complete");
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="apply-step">
      <ApplyProgressBar step={7} label="Pay & Submit" />
      <h2>Pay & Submit</h2>
      <p className="apply-step-intro">
        Your application has been saved. Pay with a card or bank account below to cover your first
        year&apos;s dues and set up automatic renewal.
      </p>
      <CardFields
        tokenizationKey={tokenizationKey}
        onToken={onPaymentToken}
        onError={setError}
        submitLabel={submitting ? "Processing…" : "Pay Dues"}
        disabled={submitting}
      />
      {error && <p className="apply-error">{error}</p>}
    </section>
  );
}
