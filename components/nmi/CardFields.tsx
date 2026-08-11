"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DUES_AMOUNT_CENTS } from "@/lib/constants";

declare global {
  interface Window {
    CollectJS?: {
      configure: (options: {
        paymentSelector: string;
        variant?: string;
        // Collect.js's ApplePayRequest.create() unconditionally validates
        // these three on every configure() call and console.errors "Could
        // not create PaymentRequestAbstraction..." if they're missing/
        // invalid (confirmed against the actual vendor source at
        // secure.nmi.com/token/Collect.js) -- but that function catches its
        // own failure and returns null rather than throwing, so this is
        // genuinely harmless noise, not a real error. Kept populated so it
        // logs conditionally (rarely) instead of unconditionally (always).
        country?: string;
        currency?: string;
        price?: string;
        // Collect.js's "style sniffer" (on by default) copies the computed
        // style of a bare <input> it drops inside each field div into the
        // iframe -- that's how our dark theme (site-wide `input {}` rule in
        // styles.css) ends up applied automatically. It doesn't cover
        // ::placeholder though, so without this the placeholder text falls
        // back to Collect.js's own washed-out gray, low-contrast against
        // our near-black field background.
        placeholderCss?: Record<string, string>;
        fields: Record<string, { selector: string; placeholder?: string }>;
        callback: (response: { token?: string; error?: string }) => void;
        // Fires once every configured iframe has actually loaded and
        // responded. Only fires reliably for the first configure() call an
        // instance ever receives (see the comment on ALL_FIELDS below) --
        // which is exactly why we only ever configure once.
        fieldsAvailableCallback?: () => void;
        // Clicking the pay button before every required field is valid sets
        // Collect.js's internal `inSubmission` flag and just waits -- it
        // never resets on its own, so an incomplete field that's later
        // finished ends up submitting with no further click (confirmed
        // against the vendor source: a second click on an already-armed
        // button is a silent no-op). timeoutDuration/timeoutCallback are the
        // only way to bound that wait: if it doesn't complete in time, this
        // resets inSubmission and lets `callback` fire an error instead of
        // leaving the click armed indefinitely.
        timeoutDuration?: number;
        timeoutCallback?: () => void;
      }) => void;
      // Wipes whatever the user has typed into every configured field via a
      // postMessage round trip to each iframe. Used when switching between
      // Card and Bank Account so stale input from the method the user left
      // doesn't linger.
      clearInputs: () => void;
    };
  }
}

type Method = "card" | "ach";

const COLLECT_JS_SRC = "https://secure.nmi.com/token/Collect.js";

// Module-level singleton so the vendor script is only ever injected/executed
// once for the whole page. Loading it per-component-instance inside a plain
// effect breaks under dev Strict Mode: the effect's mount/cleanup/remount
// simulation appends the <script> tag, removes it, then appends another --
// removing a <script> element doesn't cancel an already-started fetch, so
// the Collect.js bundle actually runs twice and redefines `window.CollectJS`
// out from under itself, corrupting its internal state before `configure()`
// is ever called (surfaces as "Could not create PaymentRequestAbstraction").
let collectScriptPromise: Promise<void> | null = null;
function loadCollectJs(tokenizationKey: string): Promise<void> {
  if (window.CollectJS) return Promise.resolve();
  if (collectScriptPromise) return collectScriptPromise;
  collectScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${COLLECT_JS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = COLLECT_JS_SRC;
    script.setAttribute("data-tokenization-key", tokenizationKey);
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
  return collectScriptPromise;
}

// Both Card and ACH fields are configured together in a single call, rather
// than reconfiguring when the user switches tabs. Two reasons:
//
// 1. Collect.js's own tokenization-readiness check (read directly out of its
//    minified source) is an OR across groups: it fires as soon as EITHER
//    ccnumber+ccexp+cvv is complete OR checkname+checkaba+checkaccount is
//    complete. So configuring all 6 fields at once and just letting the user
//    fill in whichever group they picked works natively -- Collect.js
//    figures out which one they used and tokenizes that.
// 2. Collect.js's internal `this.iframes` registry is only ever initialized
//    once (`this.iframes || (this.iframes = {})`) and never cleared between
//    configure() calls, so its "all fields loaded" check compares a
//    per-call response count against an ever-accumulating total. That means
//    `fieldsAvailableCallback` can only ever fire correctly for the very
//    first configure() call an instance receives -- reconfiguring for a
//    method switch leaves it permanently unable to fire again (confirmed by
//    testing: the fields got stuck looking like they never finish loading).
//
// Configuring once sidesteps both: no reconfigure ever happens, so neither
// issue comes up. Switching tabs is a pure CSS visibility toggle plus a
// clearInputs() call so data from the method the user left doesn't linger.
const ALL_FIELDS = {
  ccnumber: { selector: "#nmi-cc-number", placeholder: "Card Number" },
  ccexp: { selector: "#nmi-cc-exp", placeholder: "MM / YY" },
  cvv: { selector: "#nmi-cc-cvv", placeholder: "CVV" },
  checkname: { selector: "#nmi-ach-name", placeholder: "Name on Account" },
  checkaba: { selector: "#nmi-ach-aba", placeholder: "Routing Number" },
  checkaccount: { selector: "#nmi-ach-account", placeholder: "Account Number" },
};

// Renders NMI's Collect.js payment form: the input boxes below are iframes
// NMI injects itself, so raw card/bank details never touch our server or JS
// -- only the resulting single-use payment_token does.
export default function CardFields({
  tokenizationKey,
  onToken,
  onError,
  submitLabel,
  disabled,
}: {
  tokenizationKey: string;
  onToken: (token: string) => void;
  onError: (message: string) => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  const rawId = useId();
  const buttonId = `nmi-pay-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [method, setMethod] = useState<Method>("card");
  const [ready, setReady] = useState(false);
  const configuredRef = useRef(false);

  // onToken/onError are inline closures in the parent (they capture
  // per-render state like `submitting`), so a new reference lands on every
  // parent re-render. Reading them via ref instead of as effect deps below
  // keeps the configure effect from re-firing on unrelated re-renders.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onToken, onError]);

  useEffect(() => {
    let cancelled = false;
    loadCollectJs(tokenizationKey).then(() => {
      if (!cancelled) setScriptLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [tokenizationKey]);

  // Configures exactly once. `configuredRef` (rather than relying on the
  // effect's dependency array alone) guards against dev Strict Mode's
  // mount/cleanup/mount double-invocation calling configure() twice
  // back-to-back for the same instance, which Collect.js doesn't handle
  // cleanly.
  useEffect(() => {
    if (!scriptLoaded || configuredRef.current) return;
    configuredRef.current = true;
    window.CollectJS?.configure({
      paymentSelector: `#${buttonId}`,
      variant: "inline",
      country: "US",
      currency: "USD",
      price: (DUES_AMOUNT_CENTS / 100).toFixed(2),
      placeholderCss: { color: "rgba(242, 240, 234, 0.55)" },
      fields: ALL_FIELDS,
      callback: (response) => {
        if (response.token) onTokenRef.current(response.token);
        else onErrorRef.current(response.error ?? "Payment could not be processed. Check the details and try again.");
      },
      fieldsAvailableCallback: () => setReady(true),
      // Bounds how long a click can stay "armed" waiting on incomplete
      // fields (see the comment on timeoutDuration above) so an early click
      // fails with a clear message instead of silently finishing itself
      // once the user gets around to filling in the rest.
      timeoutDuration: 15000,
      timeoutCallback: () =>
        onErrorRef.current("Please fill in all the payment fields, then press Pay Dues again."),
    });
  }, [scriptLoaded, buttonId]);

  function switchMethod(next: Method) {
    if (next === method) return;
    setMethod(next);
    window.CollectJS?.clearInputs();
  }

  return (
    <div className="nmi-card-fields">
      <div className="nmi-method-tabs">
        <button
          type="button"
          className={method === "card" ? "nmi-method-tab active" : "nmi-method-tab"}
          disabled={disabled}
          onClick={() => switchMethod("card")}
        >
          Card
        </button>
        <button
          type="button"
          className={method === "ach" ? "nmi-method-tab active" : "nmi-method-tab"}
          disabled={disabled}
          onClick={() => switchMethod("ach")}
        >
          Bank Account (ACH)
        </button>
      </div>
      {/* Both groups stay mounted at all times -- Collect.js's iframes are
          injected into these divs via a raw appendChild() outside React's
          tracking, so unmounting/remounting them (as an earlier version of
          this component did per-tab) orphans or duplicates iframes. Only
          the active group is shown; the other is hidden via CSS. */}
      <div
        className={
          ready
            ? `nmi-card-field-group${method === "card" ? "" : " nmi-hidden"}`
            : `nmi-card-field-group loading${method === "card" ? "" : " nmi-hidden"}`
        }
      >
        <div id="nmi-cc-number" className="nmi-card-field" />
        <div id="nmi-cc-exp" className="nmi-card-field" />
        <div id="nmi-cc-cvv" className="nmi-card-field" />
      </div>
      <div
        className={
          ready
            ? `nmi-card-field-group${method === "ach" ? "" : " nmi-hidden"}`
            : `nmi-card-field-group loading${method === "ach" ? "" : " nmi-hidden"}`
        }
      >
        <div id="nmi-ach-name" className="nmi-card-field" />
        <div id="nmi-ach-aba" className="nmi-card-field" />
        <div id="nmi-ach-account" className="nmi-card-field" />
      </div>
      <button id={buttonId} type="button" disabled={disabled || !ready}>
        {ready ? submitLabel : "Loading payment form…"}
      </button>
    </div>
  );
}
