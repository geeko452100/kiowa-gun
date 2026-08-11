"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApplyWizard } from "@/components/apply/ApplyWizardContext";
import ApplyProgressBar from "@/components/apply/ApplyProgressBar";

export default function DocumentsStep() {
  const router = useRouter();
  const {
    applicantType,
    name,
    email,
    phone,
    smsOptIn,
    address,
    nraNumber,
    signed,
    nraProofFile,
    backgroundCheckFile,
    discountCardFile,
    update,
  } = useApplyWizard();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nraProofRequired = applicantType === "member";
  const backgroundCheckRequired = applicantType === "waitlist";

  useEffect(() => {
    if (!signed) router.replace("/membership/apply/rules-4");
  }, [signed, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (nraProofRequired && !nraProofFile) {
      setError("Please upload proof of your current NRA membership to continue.");
      return;
    }
    if (backgroundCheckRequired && !backgroundCheckFile) {
      setError("Please upload your background-check cover page or CCL to continue.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("applicantType", applicantType);
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("smsOptIn", smsOptIn ? "1" : "0");
    formData.append("address", address);
    formData.append("nraNumber", nraNumber);
    if (nraProofFile) formData.append("nraProof", nraProofFile);
    if (backgroundCheckFile) formData.append("backgroundCheck", backgroundCheckFile);
    if (discountCardFile) formData.append("discountCard", discountCardFile);

    try {
      const res = await fetch("/api/membership/submit", { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      update({ applicationSubmitted: true });
      router.push("/membership/apply/payment");
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="apply-step">
      <ApplyProgressBar step={6} label="Document Uploads" />
      <h2>Document Uploads</h2>
      <form className="apply-form" onSubmit={onSubmit}>
        <label>
          NRA membership proof (card or magazine mailing label){nraProofRequired ? "" : " (optional)"}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/avif"
            onChange={(e) => update({ nraProofFile: e.target.files?.[0] ?? null })}
            required={nraProofRequired}
          />
        </label>
        <label>
          Background-check cover page or CCL (any state){backgroundCheckRequired ? "" : " (optional)"}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/avif"
            onChange={(e) => update({ backgroundCheckFile: e.target.files?.[0] ?? null })}
            required={backgroundCheckRequired}
          />
        </label>
        <label>
          Cleanup-day discount card (optional)
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/avif"
            onChange={(e) => update({ discountCardFile: e.target.files?.[0] ?? null })}
          />
        </label>
        <p className="apply-step-note">
          Need a background check? You can request one at{" "}
          <a href="https://www.criminalwatchdog.com" target="_blank" rel="noopener noreferrer">
            criminalwatchdog.com
          </a>
          .
        </p>
        {error && <p className="apply-error">{error}</p>}
        <div className="apply-step-nav">
          <button type="button" className="apply-step-back" onClick={() => router.push("/membership/apply/rules-4")}>
            Back
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? "Uploading…" : "Continue"}
          </button>
        </div>
      </form>
    </section>
  );
}
