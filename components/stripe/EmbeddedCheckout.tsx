"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => {
      initEmbeddedCheckout?: (opts: { fetchClientSecret: () => Promise<string> }) => Promise<{
        mount: (selector: string) => void;
        destroy: () => void;
      }>;
      createEmbeddedCheckoutPage?: (opts: { fetchClientSecret: () => Promise<string> }) => Promise<{
        mount: (selector: string) => void;
        destroy: () => void;
      }>;
    };
  }
}

const STRIPE_JS_SRC = "https://js.stripe.com/v3/";

let stripeScriptPromise: Promise<void> | null = null;
function loadStripeJs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Stripe) return Promise.resolve();
  if (stripeScriptPromise) return stripeScriptPromise;
  stripeScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${STRIPE_JS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Stripe.js failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = STRIPE_JS_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Stripe.js failed to load"));
    document.body.appendChild(script);
  });
  return stripeScriptPromise;
}

export default function EmbeddedCheckout({
  publishableKey,
  createSession,
}: {
  publishableKey: string;
  createSession: () => Promise<string>;
}) {
  const [error, setError] = useState("");
  const createSessionRef = useRef(createSession);
  createSessionRef.current = createSession;

  useEffect(() => {
    let cancelled = false;
    let checkout: { destroy: () => void } | null = null;

    loadStripeJs()
      .then(async () => {
        if (cancelled) return;
        const stripe = window.Stripe?.(publishableKey);
        if (!stripe) throw new Error("Stripe.js did not initialize");
        const create = stripe.createEmbeddedCheckoutPage ?? stripe.initEmbeddedCheckout;
        if (!create) throw new Error("This Stripe.js build does not support Embedded Checkout");
        checkout = await create({ fetchClientSecret: () => createSessionRef.current() });
        if (cancelled) {
          checkout.destroy();
          return;
        }
        checkout.mount("#stripe-dues-checkout");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load the payment form. Try again shortly.");
        }
      });

    return () => {
      cancelled = true;
      checkout?.destroy();
    };
  }, [publishableKey]);

  return (
    <div className="stripe-checkout">
      <div id="stripe-dues-checkout" />
      {error && <p className="membership-form-error">{error}</p>}
    </div>
  );
}
