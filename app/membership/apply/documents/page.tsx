"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApplyWizard } from "@/components/apply/ApplyWizardContext";
import ApplyProgressBar from "@/components/apply/ApplyProgressBar";
import FileField from "@/components/FileField";

function formatDisplayDate(rawValue: string) {
  if (!rawValue || !/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return "";
  }

  const [year, month, day] = rawValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
}

function parseMmDdYyyy(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return "";
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function DocumentsStep() {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const {
    applicantType,
    name,
    email,
    phone,
    smsOptIn,
    address,
    nraNumber,
    nraExpirationDate,
    signed,
    nraProofFile,
    backgroundCheckFile,
    discountCardFile,
    update,
  } = useApplyWizard();
  const [dateText, setDateText] = useState(() => formatDisplayDate(nraExpirationDate));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const backgroundCheckRequired = applicantType === "waitlist";

  useEffect(() => {
    setDateText(formatDisplayDate(nraExpirationDate));
  }, [nraExpirationDate]);

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
  };

  const handleDateTextChange = (value: string) => {
    const cleaned = value.replace(/[^\d/]/g, "");
    setDateText(cleaned);
    const isoDate = parseMmDdYyyy(cleaned);
    update({ nraExpirationDate: isoDate });
  };

  useEffect(() => {
    if (!signed) router.replace("/membership/apply/rules-4");
  }, [signed, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!nraProofFile) {
      setError("Please upload proof of your current NRA membership to continue.");
      return;
    }
    if (!nraExpirationDate) {
      setError("Please enter your NRA membership expiration date to continue.");
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
    formData.append("nraExpirationDate", nraExpirationDate);
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
      router.push("/membership/apply/pending");
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="apply-step">
      <ApplyProgressBar step={6} label="Document Uploads" />
      <h1>Document Uploads</h1>
      <form className="apply-form" onSubmit={onSubmit}>
        <FileField
          label="NRA membership proof (card or magazine mailing label)"
          accept="application/pdf,image/jpeg,image/png,image/avif"
          required
          onChange={(file) => update({ nraProofFile: file })}
        />
        <label>
          NRA membership expiration date
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={dateText}
              onChange={(e) => handleDateTextChange(e.target.value)}
              inputMode="numeric"
              placeholder="MM/DD/YYYY"
              pattern="^(0?[1-9]|1[0-2])/(0?[1-9]|[12][0-9]|3[01])/(\d{4})$"
              title="MM/DD/YYYY"
              required
              style={{ flex: 1 }}
              aria-label="NRA membership expiration date"
            />
            <input
              ref={dateInputRef}
              type="date"
              value={nraExpirationDate}
              onChange={(e) => {
                const nextValue = e.target.value;
                update({ nraExpirationDate: nextValue });
                setDateText(formatDisplayDate(nextValue));
              }}
              aria-label="Choose an NRA expiration date"
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
              }}
            />
            <button
              type="button"
              aria-label="Open calendar"
              title="Choose a date"
              onClick={openDatePicker}
              style={{
                minWidth: 42,
                height: 42,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.04)",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              📅
            </button>
          </div>
        </label>
        <FileField
          label={`Background-check cover page or CCL (any state)${backgroundCheckRequired ? "" : " (optional)"}`}
          accept="application/pdf,image/jpeg,image/png,image/avif"
          required={backgroundCheckRequired}
          onChange={(file) => update({ backgroundCheckFile: file })}
        />
        <FileField
          label="Cleanup-day discount card (optional)"
          accept="application/pdf,image/jpeg,image/png,image/avif"
          onChange={(file) => update({ discountCardFile: file })}
        />
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
