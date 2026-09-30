"use client";

import { useRef, useState } from "react";
import FileField from "@/components/FileField";

const NRA_NUMBER_PATTERN = /^\d{5,12}$/;

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

export default function NraUpdateForm({
  initialNraNumber,
  initialNraExpirationDate,
}: {
  initialNraNumber: string;
  initialNraExpirationDate: string;
}) {
  const [nraNumber, setNraNumber] = useState(initialNraNumber);
  const [nraExpirationDate, setNraExpirationDate] = useState(initialNraExpirationDate);
  const [dateText, setDateText] = useState(() => formatDisplayDate(initialNraExpirationDate));
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [nraProof, setNraProof] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
  };

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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={dateText}
            onChange={(e) => {
              const nextValue = e.target.value.replace(/[^\d/]/g, "");
              setDateText(nextValue);
              const normalized = parseMmDdYyyy(nextValue);
              setNraExpirationDate(normalized);
            }}
            inputMode="numeric"
            placeholder="MM/DD/YYYY"
            pattern="^(0?[1-9]|1[0-2])/(0?[1-9]|[12][0-9]|3[01])/(\d{4})$"
            title="MM/DD/YYYY"
            required
            style={{ flex: 1 }}
          />
          <input
            ref={dateInputRef}
            type="date"
            value={nraExpirationDate}
            onChange={(e) => {
              const nextValue = e.target.value;
              setNraExpirationDate(nextValue);
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
        label="Current NRA Card (photo)"
        accept="application/pdf,image/jpeg,image/png,image/avif"
        required
        onChange={setNraProof}
      />
      {error && <p className="membership-form-error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit for Review"}
      </button>
    </form>
  );
}
