"use client";

import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";

// Replaces the browser's native "Choose File" button with a friendlier
// "Select File" button plus a readable filename, since the native label
// can't be relabeled with CSS/HTML alone.
//
// The trigger button lives outside the <label> (mirrors PasswordField's
// toggle button) so a click on the button can't be redirected by the
// label's own default action onto the hidden input.
export default function FileField({
  label,
  accept,
  required,
  disabled,
  note,
  onChange,
}: {
  label: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  note?: ReactNode;
  onChange: (file: File | null) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="file-field">
      <label htmlFor={id} className="file-field-label">
        {label}
      </label>
      {note}
      <div className="file-field-control">
        <button
          type="button"
          className="file-field-button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Select File
        </button>
        <span className="file-field-name">{fileName ?? "No file selected"}</span>
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          required={required}
          disabled={disabled}
          className="file-field-input"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setFileName(file?.name ?? null);
            onChange(file);
          }}
        />
      </div>
    </div>
  );
}
