"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordField from "@/components/PasswordField";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not create account");
      return;
    }
    router.push("/portal");
    router.refresh();
  }

  return (
    <form className="portal-card" onSubmit={onSubmit}>
      <h1>Create Your Member Portal Login</h1>
      <p className="portal-note">
        Choose your own email and password. Once you&apos;re in, you can fill out or update your
        member info, documents, and dues payment.
      </p>
      <label>
        Name
        <input required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Email
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <PasswordField label="Password (10+ characters)" value={password} onChange={setPassword} minLength={10} autoComplete="new-password" />
      {error && <p className="portal-error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
      <Link className="portal-link" href="/portal/login">
        Already have an account? Log in
      </Link>
    </form>
  );
}
