"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "../../styles/portal.css";

export default function PortalForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/portal/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    setMessage(
      body.message ?? body.error ?? "If that email has a portal login, we've sent a link to reset the password."
    );
  }

  return (
    <>
      <Header active="portal" />
      <main className="container" id="main">
        <form className="portal-card" onSubmit={onSubmit}>
          <h1>Reset your password</h1>
          {message ? (
            <p>{message}</p>
          ) : (
            <>
              <p className="portal-note">
                Enter the email you use to log in and we&apos;ll send you a link to set a new password.
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
          <Link className="portal-link" href="/portal/login">
            Back to login
          </Link>
        </form>
      </main>
      <Footer />
    </>
  );
}
