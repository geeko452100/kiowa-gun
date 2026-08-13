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
    <table className="w-full border-collapse">
      <caption className="sr-only">{discipline} match schedule</caption>
      <thead>
        <tr>
          <th scope="col" className="border-b border-border px-[12px] py-[4px] text-left">
            Date
          </th>
          <th scope="col" className="border-b border-border px-[12px] py-[4px] text-left">
            Time
          </th>
          <th scope="col" className="border-b border-border px-[12px] py-[4px] text-left">
            Notes
          </th>
          {isAdmin && (
            <th scope="col" className="border-b border-border px-[12px] py-[4px] text-left"></th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Fragment key={row.id}>
            <tr>
              <td className="border-b border-border px-[12px] py-[4px] text-left">{row.eventDate}</td>
              <td className="border-b border-border px-[12px] py-[4px] text-left">{row.eventTime}</td>
              <td className="border-b border-border px-[12px] py-[4px] text-left">{row.notes ?? ""}</td>
              {isAdmin && (
                <td className="border-b border-border px-[12px] py-[4px] text-left">
                  <button type="button" onClick={() => startEdit(row)}>
                    Edit
                  </button>
                </td>
              )}
            </tr>
            {editingId === row.id && form && (
              <tr>
                <td colSpan={4} className="border-b border-border px-[12px] py-[4px] text-left">
                  <div className="my-[6px] flex flex-col gap-[12px] rounded-[8px] border border-accent bg-[rgba(76,94,58,0.08)] p-[14px]">
                    <label className="flex flex-col gap-[6px] text-[0.92rem] font-semibold">
                      Discipline
                      <input
                        value={form.discipline}
                        onChange={(e) => setForm({ ...form, discipline: e.target.value })}
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-[6px] text-[0.92rem] font-semibold">
                      Date (e.g. &quot;March 14th&quot;)
                      <input
                        value={form.eventDate}
                        onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-[6px] text-[0.92rem] font-semibold">
                      Time (e.g. &quot;1:00pm&quot;)
                      <input
                        value={form.eventTime}
                        onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-[6px] text-[0.92rem] font-semibold">
                      Notes
                      <input
                        value={form.notes ?? ""}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </label>
                    <label className="flex flex-col gap-[6px] text-[0.92rem] font-semibold">
                      Results URL (e.g. a PractiScore link)
                      <input
                        type="url"
                        value={form.resultsUrl ?? ""}
                        onChange={(e) => setForm({ ...form, resultsUrl: e.target.value })}
                        placeholder="https://practiscore.com/..."
                      />
                    </label>
                    <div className="flex items-center gap-[10px]">
                      <button
                        type="button"
                        className="min-h-[44px] cursor-pointer rounded-[6px] border border-accent bg-primary px-[18px] py-[8px] font-semibold text-text [font-family:inherit] hover:bg-accent"
                        onClick={save}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="min-h-[44px] cursor-pointer rounded-[6px] border border-accent bg-transparent px-[18px] py-[8px] font-semibold text-text [font-family:inherit] hover:bg-accent"
                        onClick={cancel}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      {error && <span className="text-[0.9rem] text-[#ffb4a8]">{error}</span>}
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
