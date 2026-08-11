"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "./adminFetch";

export default function UnlockAccountButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onUnlock() {
    setLoading(true);
    setError("");
    const result = await adminFetch(`/api/admin/board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlock" }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="dashboard-unlock">
      <button type="button" onClick={onUnlock} disabled={loading}>
        {loading ? "Unlocking…" : `Unlock ${name}`}
      </button>
      {error && <p className="admin-error">{error}</p>}
    </div>
  );
}
