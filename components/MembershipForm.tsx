"use client";

import { useState } from "react";

export default function MembershipForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState("");
  const [nraProof, setNraProof] = useState<File | null>(null);
  const [discountCard, setDiscountCard] = useState<File | null>(null);
  const [backgroundCheck, setBackgroundCheck] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("address", address);
    formData.append("agree", String(agree));
    formData.append("rulesAcknowledgedName", signature);
    if (nraProof) formData.append("nraProof", nraProof);
    if (discountCard) formData.append("discountCard", discountCard);
    if (backgroundCheck) formData.append("backgroundCheck", backgroundCheck);

    try {
      const submitRes = await fetch("/api/membership/submit", { method: "POST", body: formData });
      const submitData = (await submitRes.json()) as { ok?: boolean; email?: string; error?: string };
      if (!submitRes.ok || !submitData.ok) {
        setError(submitData.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      const checkoutRes = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submitData.email }),
      });
      const checkoutData = (await checkoutRes.json()) as { url?: string; error?: string };
      if (!checkoutRes.ok || !checkoutData.url) {
        setError(checkoutData.error ?? "Your application was saved, but we couldn't start payment. Contact the club.");
        setSubmitting(false);
        return;
      }
      window.location.href = checkoutData.url;
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="membership-form" onSubmit={submit}>
      <fieldset>
        <legend>Range Rules Acknowledgement</legend>
        <label className="membership-form-checkbox">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
          I have read and agree to the Range Rules above.
        </label>
        <label>
          Type your full name as your signature
          <input value={signature} onChange={(e) => setSignature(e.target.value)} required />
        </label>
      </fieldset>

      <fieldset>
        <legend>Member Info</legend>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/avif"
            onChange={(e) => setNraProof(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        <label>
          Cleanup-day discount card (optional)
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/avif"
            onChange={(e) => setDiscountCard(e.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          Background-check cover page or CCL (any state)
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/avif"
            onChange={(e) => setBackgroundCheck(e.target.files?.[0] ?? null)}
            required
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
      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit & Continue to Payment"}
      </button>
    </form>
  );
}
