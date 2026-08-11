"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordTextRef = useRef<HTMLInputElement>(null);

  // Rendering two inputs and toggling which is visible -- rather than
  // mutating a single input's `type` -- avoids a Chrome/Edge quirk where
  // flipping type="password"/"text" on the same node makes it re-pop the
  // "Suggest strong password" popup even though the field already has a
  // value, since Chrome re-runs its "empty new field" heuristic on that
  // mutation. The type="text" twin was never a password field, so it's
  // never eligible for that suggestion.
  useEffect(() => {
    (showPassword ? passwordTextRef.current : passwordRef.current)?.focus();
  }, [showPassword]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "We couldn't sign you in. Check your email and password and try again.");
      return;
    }
    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <form className="admin-card" onSubmit={onSubmit}>
      <h1>Kiowa Gun Club Admin</h1>
      {expired && (
        <p className="admin-note">
          You were signed out after a period of inactivity. Please sign back in — if you had
          unsaved edits, you may need to redo them.
        </p>
      )}
      <label>
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Password
        <div className="admin-password-field">
          <input
            ref={passwordRef}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hidden={showPassword}
            tabIndex={showPassword ? -1 : undefined}
          />
          <input
            ref={passwordTextRef}
            type="text"
            required
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hidden={!showPassword}
            tabIndex={showPassword ? undefined : -1}
          />
          <button
            type="button"
            className="admin-password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg
                width="20"
                height="20"
                viewBox="0 -960 960 960"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 -960 960 960"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z" />
              </svg>
            )}
          </button>
        </div>
      </label>
      <label className="admin-remember">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        Remember me
      </label>
      {error && <p className="admin-error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <Link className="admin-link" href="/admin/forgot-password">
        Forgot your password?
      </Link>
    </form>
  );
}
