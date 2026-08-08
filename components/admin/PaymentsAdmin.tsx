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
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100
  );
}

export default function PaymentsAdmin() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/payments")
      .then((res) => res.json())
      .then((data) => {
        setPayments(data as Payment[]);
        setLoaded(true);
      });
  }, []);

  const totalCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <div>
      <h1>Payments</h1>
      <p className="admin-note">
        {loaded
          ? `${payments.length} dues payment${payments.length === 1 ? "" : "s"} received, totaling ${formatAmount(totalCents, "usd")}.`
          : "Loading…"}
      </p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Method</th>
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
                <td data-label="Discount card on file">{p.hasDiscountCard ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
