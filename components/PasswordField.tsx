"use client";

import { useEffect, useId, useRef, useState } from "react";

// Shared show/hide password input used by the portal's signup, reset, and
// change-password forms (mirrors the show/hide toggle already duplicated
// between app/admin/login/LoginForm.tsx and app/admin/reset-password).
//
// The toggle button must NOT be a descendant of the <label> associated with
// the password input: clicking a labelable descendant (like this input)
// makes the browser redirect the label's click to that input instead of the
// button that was actually clicked, so the toggle silently misfires. Instead
// the label only wraps the text and points at whichever input is currently
// active via htmlFor/id.
//
// This also renders two inputs -- a real type="password" one and a
// type="text" twin -- and toggles which is visible, instead of mutating a
// single input's `type`. Chrome/Edge ties its "Suggest strong password"
// popup to a type="password" node's own attribute changes; flipping `type`
// on the same node makes Chrome forget the field already has a value and
// re-show the suggestion. Never touching that node's `type` avoids the
// retrigger, since the text twin was never a password field at all.
export default function PasswordField({
  label,
  value,
  onChange,
  minLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const baseId = useId();
  const passwordId = `${baseId}-pw`;
  const textId = `${baseId}-txt`;
  const passwordRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (show ? textRef.current : passwordRef.current)?.focus();
  }, [show]);

  return (
    <div className="portal-field">
      <label htmlFor={show ? textId : passwordId}>{label}</label>
      <div className="portal-password-field">
        <input
          id={passwordId}
          ref={passwordRef}
          type="password"
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          hidden={show}
          tabIndex={show ? -1 : undefined}
        />
        <input
          id={textId}
          ref={textRef}
          type="text"
          required
          minLength={minLength}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          hidden={!show}
          tabIndex={show ? undefined : -1}
        />
        <button
          type="button"
          className="portal-password-toggle"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
              <path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
              <path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
