"use client";

import { useState } from "react";

const NRA_NUMBER_PATTERN = /^\d{5,12}$/;

export default function NraUpdateForm({
  initialNraNumber,
  initialNraExpirationDate,
}: {
  initialNraNumber: string;
  initialNraExpirationDate: string;
}) {
  const [nraNumber, setNraNumber] = useState(initialNraNumber);
  const [nraExpirationDate, setNraExpirationDate] = useState(initialNraExpirationDate);
  const [nraProof, setNraProof] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!NRA_NUMBER_PATTERN.test(nraNumber)) {
      setError("NRA Number must be 5 to 12 digits.");
      return;
    }
    if (!nraExpirationDate) {
      setError("Please enter your NRA membership's new expiration date.");
      return;
    }
    if (!nraProof) {
      setError("Please upload a photo of your current NRA card.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("nraNumber", nraNumber);
    formData.append("nraExpirationDate", nraExpirationDate);
    formData.append("nraProof", nraProof);

    try {
      const res = await fetch("/api/portal/nra-update", { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setSubmitting(false);
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="portal-saved">
        Thanks — your updated NRA info has been submitted for review. A board member will restore
        your access once it's verified.
      </p>
    );
  }

  return (
    <form className="membership-form" onSubmit={onSubmit}>
      <label>
        NRA Number
        <input
          type="text"
          inputMode="numeric"
          value={nraNumber}
          onChange={(e) => setNraNumber(e.target.value.replace(/\D/g, ""))}
          maxLength={12}
          required
        />
      </label>
      <label>
        NRA Expiration Date
        <input
          type="date"
          value={nraExpirationDate}
          onChange={(e) => setNraExpirationDate(e.target.value)}
          required
        />
      </label>
      <label>
        Current NRA Card (photo)
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/avif"
          onChange={(e) => setNraProof(e.target.files?.[0] ?? null)}
          required
        />
      </label>
      {error && <p className="membership-form-error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit for Review"}
      </button>
    </form>
  );
}
