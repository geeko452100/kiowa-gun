"use client";

import { Fragment, useEffect, useState } from "react";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";

type MatchRow = {
  id: number;
  discipline: string;
  eventDate: string;
  eventTime: string;
  notes: string | null;
  resultsUrl: string | null;
  sortOrder: number;
};

type PhotoRow = {
  id: number;
  matchId: number;
  fileName: string;
  sortOrder: number;
};

const empty = { discipline: "Defensive Pistol", eventDate: "", eventTime: "", notes: "", resultsUrl: "" };

export default function MatchesAdmin() {
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [form, setForm] = useState(empty);
  const [savedRowId, setSavedRowId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [photosRowId, setPhotosRowId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

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
    if (photosRowId === row.id) setPhotosRowId(null);
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

  async function loadPhotos(matchId: number) {
    const res = await fetch(`/api/admin/matches/${matchId}/photos`);
    setPhotos((await res.json()) as PhotoRow[]);
  }

  async function togglePhotos(row: MatchRow) {
    if (photosRowId === row.id) {
      setPhotosRowId(null);
      return;
    }
    setPhotosRowId(row.id);
    setPhotoFile(null);
    setError("");
    await loadPhotos(row.id);
  }

  async function uploadPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!photoFile || photosRowId === null) return;
    setError("");
    setPhotoUploading(true);
    const formData = new FormData();
    formData.set("image", photoFile);
    const result = await adminFetch(`/api/admin/matches/${photosRowId}/photos`, {
      method: "POST",
      body: formData,
    });
    setPhotoUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPhotoFile(null);
    await loadPhotos(photosRowId);
  }

  async function removePhoto(photo: PhotoRow) {
    if (photosRowId === null) return;
    const ok = await confirm(`Delete this picture (${photo.fileName})? This cannot be undone.`);
    if (!ok) return;
    setError("");
    const result = await adminFetch(`/api/admin/matches/${photosRowId}/photos/${photo.id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await loadPhotos(photosRowId);
  }

  return (
    <div>
      {dialog}
      <h1>Match Schedule</h1>

      <form className="admin-form" onSubmit={add}>
        <strong>Add a match date</strong>
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
        This list shows in the order below on the website, grouped by discipline. Use the arrows to
        move a match up or down within the full list.
      </p>
      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Discipline</th>
            <th>Date</th>
            <th>Time</th>
            <th>Notes</th>
            <th>Results URL</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <Fragment key={row.id}>
              <tr>
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
                    value={row.discipline}
                    onChange={(e) => updateField(row, "discipline", e.target.value)}
                  />
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
                  <button type="button" onClick={() => togglePhotos(row)}>
                    {photosRowId === row.id ? "Hide pictures" : "Pictures"}
                  </button>
                  <button type="button" className="danger" onClick={() => remove(row)}>
                    Delete
                  </button>
                  {savedRowId === row.id && <span className="admin-saved">Saved ✓</span>}
                </td>
              </tr>
              {photosRowId === row.id && (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-form">
                      <strong>Pictures for {row.eventDate}</strong>
                      {photos.length === 0 ? (
                        <p className="admin-note">No pictures uploaded for this match yet.</p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {photos.map((p) => (
                            <div key={p.id} style={{ textAlign: "center" }}>
                              <img
                                src={`/api/match-photos/${p.id}`}
                                alt=""
                                style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 4 }}
                              />
                              <br />
                              <button type="button" className="danger" onClick={() => removePhoto(p)}>
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <form onSubmit={uploadPhoto} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                        />
                        <button type="submit" disabled={!photoFile || photoUploading}>
                          {photoUploading ? "Uploading…" : "Upload"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
