"use client";

import { useEffect, useState } from "react";

type Payment = {
  id: number;
  memberId: number;
  memberName: string;
  memberEmail: string;
  amountCents: number;
  currency: string;
  paymentMethodType: string | null;
  paidAt: string;
  hasDiscountCard: boolean;
  subscriptionStatus: string | null;
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100
  );
}

export default function PaymentsAdmin() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState("");
  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/payments")
      .then((res) => res.json())
      .then((data) => {
        setPayments(data as Payment[]);
        setLoaded(true);
      });
  }, []);

  async function cancelLegacySubscriptions() {
    if (
      !confirm(
        "Cancel any leftover auto-renewing NMI subscriptions from before dues went manual-only? This won't affect one-time payments."
      )
    ) {
      return;
    }
    setCleaningUp(true);
    setCleanupMessage("");
    const res = await fetch("/api/admin/payments/cancel-legacy-subscriptions", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      canceledCount?: number;
      failedCount?: number;
      error?: string;
    };
    setCleaningUp(false);
    if (!res.ok || !data.ok) {
      setCleanupMessage(data.error ?? "Couldn't reach the payment processor. Try again shortly.");
      return;
    }
    setCleanupMessage(
      `Canceled ${data.canceledCount} legacy subscription${data.canceledCount === 1 ? "" : "s"}.` +
        (data.failedCount ? ` ${data.failedCount} failed — try again shortly.` : "")
    );
  }

  const totalCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <div>
      <h1>Payments</h1>
      <p className="admin-note">
        {loaded
          ? `${payments.length} dues payment${payments.length === 1 ? "" : "s"} received, totaling ${formatAmount(totalCents, "usd")}.`
          : "Loading…"}
      </p>
      <p className="admin-note">
        Dues are never billed automatically — every payment above is a one-time charge the member
        (or, for cash/check, a board member) made deliberately.
      </p>
      <p>
        <button type="button" onClick={cancelLegacySubscriptions} disabled={cleaningUp}>
          {cleaningUp ? "Canceling…" : "Cancel legacy auto-renew subscriptions"}
        </button>
      </p>
      {cleanupMessage && <p className="admin-note">{cleanupMessage}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Method</th>
              <th>Subscription</th>
              <th>Discount card on file</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td data-label="Member">
                  {p.memberName}
                  <br />
                  <span className="admin-note">{p.memberEmail}</span>
                </td>
                <td data-label="Amount">{formatAmount(p.amountCents, p.currency)}</td>
                <td data-label="Date">{new Date(p.paidAt).toLocaleDateString()}</td>
                <td data-label="Method">{p.paymentMethodType ?? "—"}</td>
                <td data-label="Subscription">{p.subscriptionStatus ?? "—"}</td>
                <td data-label="Discount card on file">{p.hasDiscountCard ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
