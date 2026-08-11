"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alex_Brush } from "next/font/google";
import CardFields from "@/components/nmi/CardFields";

const signatureFont = Alex_Brush({ subsets: ["latin"], weight: "400" });

const NRA_NUMBER_PATTERN = /^\d{5,12}$/;
const digitsOnly = (value: string) => value.replace(/\D/g, "");

type PageSection = { heading: string | null; bodyHtml: string | null };
type RulesDocument = { id: number; title: string };

type PortalInitialValues = {
  name: string;
  email: string;
  phone: string;
  smsOptIn: boolean;
  address: string;
  nraNumber: string;
  nraExpirationDate: string;
  rulesAcknowledgedPrintedName: string | null;
  rulesAcknowledgedName: string | null;
  rulesAcknowledgedAt: string | null;
  documents: { field: string; label: string; fileName: string | null; reviewed: boolean }[];
};

export default function MembershipForm({
  mode = "apply",
  initialValues,
  onSaved,
  tokenizationKey,
  agreementIntro,
  agreementBody,
  rulesDocuments,
}: {
  mode?: "apply" | "portal";
  // Only used in portal mode, to pre-fill the logged-in member's own info
  // instead of starting from a blank public application.
  initialValues?: PortalInitialValues;
  onSaved?: () => void;
  // Only used in apply mode, for the Collect.js payment step shown after the
  // application itself is saved.
  tokenizationKey?: string;
  // Range Rules text and printable copy shown inline in the Range Rules
  // Acknowledgement fieldset while it's unsigned.
  agreementIntro?: PageSection;
  agreementBody?: PageSection;
  rulesDocuments?: RulesDocument[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [smsOptIn, setSmsOptIn] = useState(initialValues?.smsOptIn ?? false);
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [nraNumber, setNraNumber] = useState(initialValues?.nraNumber ?? "");
  const [nraExpirationDate, setNraExpirationDate] = useState(initialValues?.nraExpirationDate ?? "");
  const [nraProof, setNraProof] = useState<File | null>(null);
  const [discountCard, setDiscountCard] = useState<File | null>(null);
  const [backgroundCheck, setBackgroundCheck] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  // Apply mode only: once the application itself is saved, switch to the
  // payment step instead of redirecting off-site the way Stripe Checkout did.
  const [readyForPayment, setReadyForPayment] = useState(false);

  // Range Rules Acknowledgement (formerly its own page/form at /news) is now
  // signed inline here. `justSigned` covers a fresh signature from this
  // session; `resigning` lets an already-signed member reopen the fields
  // without navigating away.
  const [printedName, setPrintedName] = useState("");
  const [signature, setSignature] = useState("");
  const [agree, setAgree] = useState(false);
  const [signError, setSignError] = useState("");
  const [signSubmitting, setSignSubmitting] = useState(false);
  const [justSigned, setJustSigned] = useState(false);
  const [resigning, setResigning] = useState(false);

  const alreadySigned = Boolean(initialValues?.rulesAcknowledgedName && initialValues?.rulesAcknowledgedAt);
  const isSigned = (alreadySigned || justSigned) && !resigning;

  const docByField = new Map((initialValues?.documents ?? []).map((d) => [d.field, d]));

  async function signAgreement() {
    setSignError("");
    const signEmail = mode === "portal" ? (initialValues?.email ?? "") : email;

    if (!agree || !signEmail.trim() || !printedName.trim() || !signature.trim()) {
      setSignError(
        "Please check the box, then print and sign your name to confirm you've read and agree to the Range Rules."
      );
      return;
    }

    if (printedName.trim().split(/\s+/).length < 2) {
      setSignError("Please enter your full name (first and last) in the Printed Name field.");
      return;
    }

    if (signature.trim().toLowerCase() !== printedName.trim().toLowerCase()) {
      setSignError("Your typed signature must exactly match the name you entered in Printed Name.");
      return;
    }

    setSignSubmitting(true);
    try {
      const res = await fetch("/api/agreement/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signEmail, printedName, signature, agree }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setSignError(data.error ?? "Something went wrong. Please try again.");
        setSignSubmitting(false);
        return;
      }
      setJustSigned(true);
      setResigning(false);
      setSignSubmitting(false);
      if (mode === "portal") router.refresh();
    } catch {
      setSignError("Couldn't reach the server. Check your internet connection and try again.");
      setSignSubmitting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    if (nraNumber && !NRA_NUMBER_PATTERN.test(nraNumber)) {
      setError("NRA Number must be 5 to 12 digits.");
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("smsOptIn", smsOptIn ? "1" : "0");
    formData.append("address", address);
    formData.append("nraNumber", nraNumber);
    if (mode === "portal") formData.append("nraExpirationDate", nraExpirationDate);
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
        // The dashboard page (app/portal/(protected)/page.tsx) re-fetches the
        // member's row and documents server-side and passes them back down
        // as `initialValues` -- but this component's state was only seeded
        // from that prop on first mount, so without a remount (handled by
        // the `key` the dashboard page puts on this component) a freshly
        // uploaded document's "on file" status would stay stale until a
        // manual reload.
        router.refresh();
        onSaved?.();
      } catch {
        setError("Couldn't reach the server. Check your internet connection and try again.");
        setSubmitting(false);
      }
      return;
    }

    formData.append("email", email);

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
        <p>
          Thanks — your application has been saved. Enter your card info below to pay your first
          year&apos;s dues and set up automatic renewal.
        </p>
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
        <legend>Member Info</legend>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={mode === "portal" ? (initialValues?.email ?? "") : email}
            onChange={(e) => setEmail(e.target.value)}
            required={mode === "apply"}
            readOnly={mode === "portal"}
          />
        </label>
        <label>
          Phone
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(digitsOnly(e.target.value))}
          />
        </label>
        <label className="membership-form-checkbox">
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
          Yes, text me about matches, events, and dues renewal reminders.
        </label>
        <p className="membership-form-note">
          Texting is optional and won&apos;t affect your membership. Message and data rates may
          apply; message frequency varies. Reply STOP to any text to stop, or uncheck this anytime.
          We don&apos;t sell or share your phone number.
        </p>
        <label>
          Home Address
          <input value={address} onChange={(e) => setAddress(e.target.value)} required />
        </label>
        <label>
          NRA Number
          <input
            type="text"
            inputMode="numeric"
            value={nraNumber}
            onChange={(e) => setNraNumber(digitsOnly(e.target.value))}
            maxLength={12}
            pattern="\d{5,12}"
            title="5 to 12 digits"
          />
        </label>
        {mode === "portal" && (
          <label>
            NRA Expiration Date
            <input
              type="date"
              value={nraExpirationDate}
              onChange={(e) => setNraExpirationDate(e.target.value)}
            />
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>Range Rules Acknowledgement</legend>
        {isSigned ? (
          <>
            <p className="membership-form-note">
              Signed by {alreadySigned && !justSigned ? initialValues!.rulesAcknowledgedName : printedName} on{" "}
              {alreadySigned && !justSigned
                ? new Date(initialValues!.rulesAcknowledgedAt!).toLocaleDateString()
                : new Date().toLocaleDateString()}
              .
            </p>
            <button type="button" className="membership-form-link-button" onClick={() => setResigning(true)}>
              Re-sign (e.g. if the Range Rules have changed)
            </button>
          </>
        ) : (
          <>
            {agreementIntro?.bodyHtml && <div dangerouslySetInnerHTML={{ __html: agreementIntro.bodyHtml }} />}
            {agreementBody?.bodyHtml && (
              <div className="rules-text" dangerouslySetInnerHTML={{ __html: agreementBody.bodyHtml }} />
            )}
            {rulesDocuments?.map((doc) => (
              <p key={doc.id} className="membership-form-note">
                Prefer paper?{" "}
                <a href={`/api/documents/${doc.id}`} download>
                  Download {doc.title} (PDF)
                </a>{" "}
                to print and sign in person instead.
              </p>
            ))}
            <label className="membership-form-checkbox">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
              I have read and agree to the Range Rules above.
            </label>
            <label>
              Printed Name (first and last)
              <input value={printedName} onChange={(e) => setPrintedName(e.target.value)} required />
            </label>
            <label>
              Signature (type your full name exactly as printed above)
              <input
                className={`${signatureFont.className} membership-form-signature`}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Sign here"
                required
              />
            </label>
            {signError && <p className="membership-form-error">{signError}</p>}
            <button type="button" onClick={signAgreement} disabled={signSubmitting}>
              {signSubmitting ? "Signing…" : "Sign Agreement"}
            </button>
          </>
        )}
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
        {mode === "portal" && (
          <label>
            Cleanup-day discount card (optional)
            <span className="membership-form-note">
              {docByField.get("discountCard")?.fileName
                ? `On file: ${docByField.get("discountCard")?.fileName}${docByField.get("discountCard")?.reviewed ? "" : " (pending review)"}`
                : "None on file yet."}
            </span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/avif"
              onChange={(e) => setDiscountCard(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
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
          Need a background check? You can request one at{" "}
          <a href="https://www.criminalwatchdog.com" target="_blank" rel="noopener noreferrer">
            criminalwatchdog.com
          </a>
          .
        </p>
      </fieldset>

      {error && <p className="membership-form-error">{error}</p>}
      {saved && !error && <p className="portal-saved">Your info has been updated.</p>}
      <button type="submit" disabled={submitting || (mode === "apply" && !isSigned)}>
        {submitting ? "Saving…" : mode === "portal" ? "Save Changes" : "Submit Application"}
      </button>
    </form>
  );
}
