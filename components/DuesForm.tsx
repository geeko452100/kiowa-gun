"use client";

import { useState } from "react";

export default function DuesForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't reach the server. Check your internet connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form className="dues-form" onSubmit={submit}>
      <label>
        Email on file with the club
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      {error && <p className="dues-error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Redirecting to Stripe…" : "Pay Dues"}
      </button>
    </form>
  );
}
