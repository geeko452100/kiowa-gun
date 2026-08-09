"use client";

import { useEffect, useId, useState } from "react";

declare global {
  interface Window {
    CollectJS?: {
      configure: (options: {
        paymentSelector: string;
        variant?: string;
        fields: Record<string, { selector: string; placeholder?: string }>;
        callback: (response: { token?: string; error?: string }) => void;
      }) => void;
    };
  }
}

// Renders NMI's Collect.js card form: the card number/expiry/CVV inputs are
// iframes NMI injects into the divs below, so raw card data never touches
// our server or JS -- only the resulting single-use payment_token does.
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const script = document.createElement("script");
    script.src = "https://secure.nmi.com/token/Collect.js";
    script.setAttribute("data-tokenization-key", tokenizationKey);
    script.onload = () => {
      if (cancelled) return;
      window.CollectJS?.configure({
        paymentSelector: `#${buttonId}`,
        variant: "inline",
        fields: {
          ccnumber: { selector: "#nmi-cc-number", placeholder: "Card Number" },
          ccexp: { selector: "#nmi-cc-exp", placeholder: "MM / YY" },
          cvv: { selector: "#nmi-cc-cvv", placeholder: "CVV" },
        },
        callback: (response) => {
          if (response.token) onToken(response.token);
          else onError(response.error ?? "Card could not be processed. Check the details and try again.");
        },
      });
      setReady(true);
    };
    document.body.appendChild(script);
    return () => {
      cancelled = true;
      document.body.removeChild(script);
    };
  }, [tokenizationKey, buttonId, onToken, onError]);

  return (
    <div className="nmi-card-fields">
      <div id="nmi-cc-number" className="nmi-card-field" />
      <div id="nmi-cc-exp" className="nmi-card-field" />
      <div id="nmi-cc-cvv" className="nmi-card-field" />
      <button id={buttonId} type="button" disabled={disabled || !ready}>
        {ready ? submitLabel : "Loading payment form…"}
      </button>
    </div>
  );
}
