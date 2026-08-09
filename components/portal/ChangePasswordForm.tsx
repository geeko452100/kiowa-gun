"use client";

import { useState } from "react";
import PasswordField from "@/components/PasswordField";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    const res = await fetch("/api/portal/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not change password");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PasswordField
        label="Current password"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
      />
      <PasswordField
        label="New password (10+ characters)"
        value={newPassword}
        onChange={setNewPassword}
        minLength={10}
        autoComplete="new-password"
      />
      {error && <p className="portal-error">{error}</p>}
      {saved && !error && <p className="portal-saved">Password changed.</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Change Password"}
      </button>
    </form>
  );
}
