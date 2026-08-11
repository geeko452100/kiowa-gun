"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/components/admin/adminFetch";

export type MatchScheduleRow = {
  id: number;
  discipline: string;
  eventDate: string;
  eventTime: string;
  notes: string | null;
  resultsUrl: string | null;
  sortOrder: number;
};

// Public match-schedule table. For board members, each row gets an inline
// edit form (discipline, date, time, notes, results URL) using the same
// /api/admin/matches/[id] endpoint as the admin dashboard's Matches page, so
// they don't have to leave the page to fix a typo or add a results link.
export default function MatchScheduleTable({
  discipline,
  rows,
  isAdmin,
}: {
  discipline: string;
  rows: MatchScheduleRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MatchScheduleRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit(row: MatchScheduleRow) {
    setEditingId(row.id);
    setForm({ ...row });
    setError("");
  }

  function cancel() {
    setEditingId(null);
    setForm(null);
    setError("");
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError("");
    const result = await adminFetch(`/api/admin/matches/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    setForm(null);
    router.refresh();
  }

  return (
    <table className="match-schedule">
      <caption className="sr-only">{discipline} match schedule</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Time</th>
          <th scope="col">Notes</th>
          {isAdmin && <th scope="col"></th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Fragment key={row.id}>
            <tr>
              <td>{row.eventDate}</td>
              <td>{row.eventTime}</td>
              <td>{row.notes ?? ""}</td>
              {isAdmin && (
                <td>
                  <button type="button" onClick={() => startEdit(row)}>
                    Edit
                  </button>
                </td>
              )}
            </tr>
            {editingId === row.id && form && (
              <tr>
                <td colSpan={4}>
                  <div className="match-edit-form">
                    <label>
                      Discipline
                      <input
                        value={form.discipline}
                        onChange={(e) => setForm({ ...form, discipline: e.target.value })}
                        required
                      />
                    </label>
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
                      <input
                        value={form.notes ?? ""}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </label>
                    <label>
                      Results URL (e.g. a PractiScore link)
                      <input
                        type="url"
                        value={form.resultsUrl ?? ""}
                        onChange={(e) => setForm({ ...form, resultsUrl: e.target.value })}
                        placeholder="https://practiscore.com/..."
                      />
                    </label>
                    <div className="match-edit-actions">
                      <button type="button" onClick={save} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button type="button" className="match-edit-cancel" onClick={cancel} disabled={saving}>
                        Cancel
                      </button>
                      {error && <span className="match-edit-error">{error}</span>}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
