"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import "../admin.css";

function ResetPasswordForm() {
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
    const res = await fetch("/api/admin/reset-password", {
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
      <div className="admin-card">
        <h1>Link missing</h1>
        <p className="admin-error">
          This link is missing its reset code. Ask a board admin to send you a new one.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="admin-card">
        <h1>Password set</h1>
        <p>You can now log in with your new password.</p>
        <Link className="admin-link" href="/admin/login">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form className="admin-card" onSubmit={onSubmit}>
      <h1>Set your password</h1>
      <label>
        New password
        <input
          type="password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          required
          minLength={10}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>
      {error && <p className="admin-error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="admin-shell admin-shell-centered">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
