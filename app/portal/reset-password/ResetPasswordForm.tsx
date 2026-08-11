"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PasswordField from "@/components/PasswordField";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/portal/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not set password");
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <div className="portal-card">
        <h1>Link missing</h1>
        <p className="portal-error">
          This link is missing its reset code. Head back and request a new one.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="portal-card">
        <h1>Password set</h1>
        <p>You can now log in with your new password.</p>
        <Link className="portal-link" href="/portal/login">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form className="portal-card" onSubmit={onSubmit}>
      <h1>Set your password</h1>
      <PasswordField label="New password" value={password} onChange={setPassword} minLength={10} autoComplete="new-password" />
      <PasswordField
        label="Confirm password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        minLength={10}
        autoComplete="new-password"
      />
      {error && <p className="portal-error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
