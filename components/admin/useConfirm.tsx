"use client";

import { useCallback, useState } from "react";

// Promise-based replacement for window.confirm() styled to match the CMS,
// so board members see a clear on-brand dialog instead of a browser popup.
export function useConfirm() {
  const [state, setState] = useState<{
    message: string;
    confirmLabel: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((message: string, confirmLabel = "Yes, delete") => {
    return new Promise<boolean>((resolve) => {
      setState({ message, confirmLabel, resolve });
    });
  }, []);

  function respond(value: boolean) {
    state?.resolve(value);
    setState(null);
  }

  const dialog = state ? (
    <div className="confirm-overlay" role="alertdialog" aria-modal="true">
      <div className="confirm-box">
        <p>{state.message}</p>
        <div className="confirm-actions">
          <button type="button" onClick={() => respond(false)}>
            Cancel
          </button>
          <button type="button" className="danger" onClick={() => respond(true)}>
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
