"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordField from "@/components/PasswordField";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Login failed");
      return;
    }
    router.push("/portal");
    router.refresh();
  }

  return (
    <form className="portal-card" onSubmit={onSubmit}>
      <h1>Member Portal Login</h1>
      <label>
        Email
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
      {error && <p className="portal-error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <Link className="portal-link" href="/portal/forgot-password">
        Forgot your password?
      </Link>
      <Link className="portal-link" href="/portal/signup">
        Need an account? Sign up
      </Link>
    </form>
  );
}
