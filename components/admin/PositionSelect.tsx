"use client";

import { useState } from "react";

const ADD_NEW = "__add_new__";

// Renders as a plain <select> (same element as the Access dropdown, so it
// picks up identical styling) but the underlying value is always free text --
// "+ Add a new title..." just grows the shared suggestion list, it never
// restricts what a title can be.
export default function PositionSelect({
  value,
  options,
  onChange,
  onAddOption,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onAddOption: (label: string) => Promise<string | null>;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");

  async function confirmAdd() {
    const label = newLabel.trim();
    if (!label) {
      setAdding(false);
      return;
    }
    setError("");
    const err = await onAddOption(label);
    if (err) {
      setError(err);
      return;
    }
    onChange(label);
    setAdding(false);
    setNewLabel("");
  }

  if (adding) {
    return (
      <div className="admin-row-actions">
        <input
          autoFocus
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New title"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void confirmAdd();
            }
            if (e.key === "Escape") {
              setAdding(false);
              setNewLabel("");
              setError("");
            }
          }}
        />
        <button type="button" onClick={confirmAdd}>
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            setNewLabel("");
            setError("");
          }}
        >
          Cancel
        </button>
        {error && <span className="admin-error">{error}</span>}
      </div>
    );
  }

  // A title set directly (e.g. by an earlier free-text entry) might not be in
  // the shared list yet -- show it as selected anyway instead of silently
  // falling back to "No title".
  const allOptions = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === ADD_NEW) {
          setAdding(true);
        } else {
          onChange(e.target.value);
        }
      }}
    >
      <option value="">No title</option>
      {allOptions.map((label) => (
        <option key={label} value={label}>
          {label}
        </option>
      ))}
      <option value={ADD_NEW}>+ Add a new title…</option>
    </select>
  );
}
