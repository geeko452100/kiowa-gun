"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CardFields from "@/components/nmi/CardFields";

type PortalInitialValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  rulesAcknowledgedName: string | null;
  rulesAcknowledgedAt: string | null;
  documents: { field: string; label: string; fileName: string | null; reviewed: boolean }[];
};

export default function MembershipForm({
  mode = "apply",
  initialValues,
  onSaved,
  tokenizationKey,
}: {
  mode?: "apply" | "portal";
  // Only used in portal mode, to pre-fill the logged-in member's own info
  // instead of starting from a blank public application.
  initialValues?: PortalInitialValues;
  onSaved?: () => void;
  // Only used in apply mode, for the Collect.js payment step shown after the
  // application itself is saved.
  tokenizationKey?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState("");
  const [nraProof, setNraProof] = useState<File | null>(null);
  const [discountCard, setDiscountCard] = useState<File | null>(null);
  const [backgroundCheck, setBackgroundCheck] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  // Apply mode only: once the application itself is saved, switch to the
  // payment step instead of redirecting off-site the way Stripe Checkout did.
  const [readyForPayment, setReadyForPayment] = useState(false);

  const docByField = new Map((initialValues?.documents ?? []).map((d) => [d.field, d]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("address", address);
    if (nraProof) formData.append("nraProof", nraProof);
    if (discountCard) formData.append("discountCard", discountCard);
    if (backgroundCheck) formData.append("backgroundCheck", backgroundCheck);

    if (mode === "portal") {
      try {
        const res = await fetch("/api/portal/profile", { method: "PATCH", body: formData });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Something went wrong. Please try again.");
          setSubmitting(false);
          return;
        }
        setSaved(true);
        setSubmitting(false);
        onSaved?.();
      } catch {
        setError("Couldn't reach the server. Check your internet connection and try again.");
        setSubmitting(false);
      }
      return;
    }

    formData.append("email", email);
    formData.append("agree", String(agree));
    formData.append("rulesAcknowledgedName", signature);

    try {
      const submitRes = await fetch("/api/membership/submit", { method: "POST", body: formData });
      const submitData = (await submitRes.json()) as { ok?: boolean; email?: string; error?: string };
      if (!submitRes.ok || !submitData.ok) {
        setError(submitData.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setReadyForPayment(true);
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setSubmitting(false);
    }
  }

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
      router.push("/dues/success");
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setSubmitting(false);
    }
  }

  if (mode === "apply" && readyForPayment) {
    return (
      <div className="membership-form">
        <p>Your application was saved. Enter your card info to pay your first year&apos;s dues and set up automatic renewal.</p>
        <CardFields
          tokenizationKey={tokenizationKey ?? ""}
          onToken={onPaymentToken}
          onError={setError}
          submitLabel={submitting ? "Processing…" : "Pay Dues"}
          disabled={submitting}
        />
        {error && <p className="membership-form-error">{error}</p>}
      </div>
    );
  }

  return (
    <form className="membership-form" onSubmit={submit}>
      <fieldset>
        <legend>Range Rules Acknowledgement</legend>
        {mode === "portal" ? (
          <p className="membership-form-note">
            {initialValues?.rulesAcknowledgedName && initialValues?.rulesAcknowledgedAt
              ? `Signed by ${initialValues.rulesAcknowledgedName} on ${new Date(initialValues.rulesAcknowledgedAt).toLocaleDateString()}.`
              : "Not yet signed."}
          </p>
        ) : (
          <>
            <label className="membership-form-checkbox">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
              I have read and agree to the Range Rules above.
            </label>
            <label>
              Type your full name as your signature
              <input value={signature} onChange={(e) => setSignature(e.target.value)} required />
            </label>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>Member Info</legend>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={mode === "apply"}
            readOnly={mode === "portal"}
          />
        </label>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          Home Address
          <input value={address} onChange={(e) => setAddress(e.target.value)} required />
        </label>
      </fieldset>

      <fieldset>
        <legend>Document Uploads</legend>
        <label>
          NRA membership proof (card or magazine mailing label)
          {mode === "portal" && (
            <span className="membership-form-note">
              {docByField.get("nraProof")?.fileName
                ? `On file: ${docByField.get("nraProof")?.fileName}${docByField.get("nraProof")?.reviewed ? "" : " (pending review)"}`
                : "None on file yet."}
            </span>
          )}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/avif"
            onChange={(e) => setNraProof(e.target.files?.[0] ?? null)}
            required={mode === "apply"}
          />
        </label>
        <label>
          Cleanup-day discount card (optional)
          {mode === "portal" && (
            <span className="membership-form-note">
              {docByField.get("discountCard")?.fileName
                ? `On file: ${docByField.get("discountCard")?.fileName}${docByField.get("discountCard")?.reviewed ? "" : " (pending review)"}`
                : "None on file yet."}
            </span>
          )}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/avif"
            onChange={(e) => setDiscountCard(e.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          Background-check cover page or CCL (any state)
          {mode === "portal" && (
            <span className="membership-form-note">
              {docByField.get("backgroundCheck")?.fileName
                ? `On file: ${docByField.get("backgroundCheck")?.fileName}${docByField.get("backgroundCheck")?.reviewed ? "" : " (pending review)"}`
                : "None on file yet."}
            </span>
          )}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/avif"
            onChange={(e) => setBackgroundCheck(e.target.files?.[0] ?? null)}
            required={mode === "apply"}
          />
        </label>
        <p className="membership-form-note">
          Need a background check? Request one at{" "}
          <a href="https://www.criminalwatchdog.com" target="_blank" rel="noopener noreferrer">
            criminalwatchdog.com
          </a>
          .
        </p>
      </fieldset>

      {error && <p className="membership-form-error">{error}</p>}
      {saved && !error && <p className="portal-saved">Saved.</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : mode === "portal" ? "Save Changes" : "Submit Application"}
      </button>
    </form>
  );
}
