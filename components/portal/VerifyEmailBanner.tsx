"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

// Rendered by the (protected) layout in place of the dashboard until the
// member verifies -- reads the query string directly (rather than a prop)
// since layouts don't receive searchParams in the App Router.
export default function VerifyEmailBanner() {
  const searchParams = useSearchParams();
  const linkWasInvalid = searchParams.get("verifyError") === "1";
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/resend-verification", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "We couldn't send the email. Please try again in a moment.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="portal-card">
      <h1>Verify Your Email</h1>
      {linkWasInvalid && (
        <p className="portal-error">
          That verification link is invalid or has expired. You can send a new one below.
        </p>
      )}
      <p>
        Check your inbox for a verification link — you&apos;ll need to confirm your email before
        you can access the member portal.
        {sent && " We've sent it again — check your inbox."}
      </p>
      {error && <p className="portal-error">{error}</p>}
      <button type="button" onClick={resend} disabled={loading}>
        {loading ? "Sending…" : "Resend verification email"}
      </button>
    </div>
  );
}
