"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alex_Brush } from "next/font/google";
import { useApplyWizard } from "@/components/apply/ApplyWizardContext";
import ApplyProgressBar from "@/components/apply/ApplyProgressBar";
import { RULES_AGREEMENT_CLAUSE } from "@/lib/rangeRules";

const signatureFont = Alex_Brush({ subsets: ["latin"], weight: "400" });

const NRA_NUMBER_PATTERN = /^\d{5,12}$/;
const digitsOnly = (value: string) => value.replace(/\D/g, "");

type RulesDocument = { id: number; title: string };

export default function SignStep({ rulesDocuments }: { rulesDocuments: RulesDocument[] }) {
  const router = useRouter();
  const { applicantType, email, address, printedName, signature, agree, nraNumber, update } = useApplyWizard();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nraNumberRequired = applicantType === "member";

  useEffect(() => {
    if (!email.trim() || !address.trim()) router.replace("/membership/apply");
  }, [email, address, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!agree || !printedName.trim() || !signature.trim() || (nraNumberRequired && !nraNumber.trim())) {
      setError(
        nraNumberRequired
          ? "Please check the box, then print and sign your name and enter your NRA number to continue."
          : "Please check the box, then print and sign your name to continue."
      );
      return;
    }

    if (printedName.trim().split(/\s+/).length < 2) {
      setError("Please enter your full name (first and last) in the Printed Name field.");
      return;
    }

    if (signature.trim().toLowerCase() !== printedName.trim().toLowerCase()) {
      setError("Your typed signature must exactly match the name you entered in Printed Name.");
      return;
    }

    if (nraNumber.trim() && !NRA_NUMBER_PATTERN.test(nraNumber.trim())) {
      setError("NRA Number must be 5 to 12 digits.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/agreement/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, printedName, signature, agree }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      update({ signed: true });
      router.push("/membership/apply/documents");
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="apply-step">
      <ApplyProgressBar step={5} label="Print & Sign" />
      <h2>Print & Sign</h2>
      <p className="apply-rules-clause">{RULES_AGREEMENT_CLAUSE}</p>
      {rulesDocuments.length > 0 && (
        <p className="apply-step-note">
          Prefer paper?{" "}
          {rulesDocuments.map((doc, i) => (
            <span key={doc.id}>
              <a href={`/api/documents/${doc.id}`} download>
                Download {doc.title} (PDF)
              </a>
              {i < rulesDocuments.length - 1 ? ", " : ""}
            </span>
          ))}{" "}
          to print and sign in person instead.
        </p>
      )}
      <form className="apply-form" onSubmit={onSubmit}>
        <label className="apply-checkbox">
          <input type="checkbox" checked={agree} onChange={(e) => update({ agree: e.target.checked })} />
          I have read and agree to the Range Rules.
        </label>
        <label>
          Printed Name (first and last)
          <input value={printedName} onChange={(e) => update({ printedName: e.target.value })} />
        </label>
        <label>
          Signature (type your full name exactly as printed above)
          <input
            className={`${signatureFont.className} apply-signature`}
            value={signature}
            onChange={(e) => update({ signature: e.target.value })}
            placeholder="Sign here"
          />
        </label>
        <label>
          NRA Number{nraNumberRequired ? "" : " (optional)"}
          <input
            type="text"
            inputMode="numeric"
            value={nraNumber}
            onChange={(e) => update({ nraNumber: digitsOnly(e.target.value) })}
            maxLength={12}
            pattern="\d{5,12}"
            title="5 to 12 digits"
          />
        </label>
        {error && <p className="apply-error">{error}</p>}
        <div className="apply-step-nav">
          <button type="button" className="apply-step-back" onClick={() => router.push("/membership/apply/rules-3")}>
            Back
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? "Signing…" : "Sign & Continue"}
          </button>
        </div>
      </form>
    </section>
  );
}
