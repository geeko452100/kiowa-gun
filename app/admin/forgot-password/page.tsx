"use client";

import { useState } from "react";
import Link from "next/link";
import "../admin.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    setMessage(
      body.message ?? body.error ?? "If that email is linked to an admin account, we've sent a link to reset your password."
    );
  }

  return (
    <div className="admin-shell admin-shell-centered">
      <form className="admin-card" onSubmit={onSubmit}>
        <h1>Reset your password</h1>
        {message ? (
          <p>{message}</p>
        ) : (
          <>
            <p className="admin-note">
              Enter the email you use to log in and we&apos;ll send you a link to set a new
              password.
            </p>
            <label>
              Email
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </>
        )}
        {!message && (
          <button type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        )}
        <Link className="admin-link" href="/admin/login">
          Back to login
        </Link>
      </form>
    </div>
  );
}
