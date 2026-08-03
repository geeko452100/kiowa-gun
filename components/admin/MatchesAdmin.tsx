"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";

type MatchRow = {
  id: number;
  eventDate: string;
  eventTime: string;
  notes: string | null;
  resultsUrl: string | null;
  sortOrder: number;
};

const empty = { eventDate: "", eventTime: "", notes: "", resultsUrl: "" };

export default function MatchesAdmin() {
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [form, setForm] = useState(empty);
  const [savedRowId, setSavedRowId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/matches");
    setRows((await res.json()) as MatchRow[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await adminFetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(empty);
    void load();
  }

  function updateField(row: MatchRow, field: keyof MatchRow, value: string) {
    const updated = { ...row, [field]: value };
    setRows((rs) => rs.map((r) => (r.id === row.id ? updated : r)));
  }

  async function save(row: MatchRow) {
    setError("");
    const result = await adminFetch(`/api/admin/matches/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    if (!result.ok) {
      setError(result.error);
      void load();
      return;
    }
    void load();
    setSavedRowId(row.id);
    setTimeout(() => setSavedRowId(null), 3000);
  }

  async function remove(row: MatchRow) {
    const ok = await confirm(`Delete the ${row.eventDate} match? This cannot be undone.`);
    if (!ok) return;
    setError("");
    const result = await adminFetch(`/api/admin/matches/${row.id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  async function move(index: number, direction: -1 | 1) {
    const other = rows[index + direction];
    const current = rows[index];
    if (!other) return;
    const swapped = { ...current, sortOrder: other.sortOrder };
    const otherSwapped = { ...other, sortOrder: current.sortOrder };
    setRows((rs) =>
      rs.map((r) => (r.id === current.id ? swapped : r.id === other.id ? otherSwapped : r))
    );
    setError("");
    const results = await Promise.all([
      adminFetch(`/api/admin/matches/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(swapped),
      }),
      adminFetch(`/api/admin/matches/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(otherSwapped),
      }),
    ]);
    const failed = results.find((r) => !r.ok);
    if (failed && !failed.ok) setError(failed.error);
    void load();
  }

  return (
    <div>
      {dialog}
      <h1>Match Schedule</h1>

      <form className="admin-form" onSubmit={add}>
        <strong>Add a match date</strong>
        <label>
          Date (e.g. &quot;March 14th&quot;)
          <input
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
            required
          />
        </label>
        <label>
          Time (e.g. &quot;1:00pm&quot;)
          <input
            value={form.eventTime}
            onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
            required
          />
        </label>
        <label>
          Notes
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <label>
          Results URL
          <input
            value={form.resultsUrl}
            onChange={(e) => setForm({ ...form, resultsUrl: e.target.value })}
          />
        </label>
        <button type="submit">Add</button>
      </form>

      <p className="admin-note">
        This list shows in the order below on the website. Use the arrows to move a match up or
        down.
      </p>
      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Time</th>
            <th>Notes</th>
            <th>Results URL</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td className="admin-row-actions">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === rows.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
              </td>
              <td>
                <input
                  value={row.eventDate}
                  onChange={(e) => updateField(row, "eventDate", e.target.value)}
                />
              </td>
              <td>
                <input
                  value={row.eventTime}
                  onChange={(e) => updateField(row, "eventTime", e.target.value)}
                />
              </td>
              <td>
                <input
                  value={row.notes ?? ""}
                  onChange={(e) => updateField(row, "notes", e.target.value)}
                />
              </td>
              <td>
                <input
                  value={row.resultsUrl ?? ""}
                  onChange={(e) => updateField(row, "resultsUrl", e.target.value)}
                />
              </td>
              <td className="admin-row-actions">
                <button type="button" onClick={() => save(row)}>
                  Save
                </button>
                <button type="button" className="danger" onClick={() => remove(row)}>
                  Delete
                </button>
                {savedRowId === row.id && <span className="admin-saved">Saved ✓</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
