"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";

type Doc = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  uploadedAt: string;
  memberId: number | null;
  reviewed: number;
  memberName: string | null;
  memberEmail: string | null;
};

export default function DocumentsAdmin() {
  const { confirm, dialog } = useConfirm();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("membership");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/documents");
    setDocs((await res.json()) as Doc[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("category", category);
    formData.append("description", description);
    const result = await adminFetch("/api/admin/documents", { method: "POST", body: formData });
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setDescription("");
    setFile(null);
    void load();
  }

  async function toggleReviewed(doc: Doc) {
    setError("");
    const result = await adminFetch(`/api/admin/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewed: doc.reviewed === 0 }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  async function remove(doc: Doc) {
    const ok = await confirm(
      `Delete "${doc.title}"? Anyone with the download link will lose access. This cannot be undone.`
    );
    if (!ok) return;
    setError("");
    const result = await adminFetch(`/api/admin/documents/${doc.id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  return (
    <div>
      {dialog}
      <h1>Documents</h1>
      <p className="admin-note">
        Upload a PDF (export/print-to-PDF from any program — no Microsoft Word needed) and it will
        appear as a download link on the site.
      </p>

      <form className="admin-form" onSubmit={upload}>
        <strong>Upload a PDF</strong>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="membership">Membership</option>
            <option value="rules">Rules</option>
            <option value="general">General</option>
          </select>
        </label>
        <label>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          PDF file
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>

      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>File</th>
            <th>Submitted By</th>
            <th>Review</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td>{d.title}</td>
              <td>{d.category}</td>
              <td>
                <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener">
                  {d.fileName}
                </a>
              </td>
              <td>
                {d.memberId ? (
                  <span>
                    {d.memberName} ({d.memberEmail})
                  </span>
                ) : (
                  <span className="admin-note">Board-managed</span>
                )}
              </td>
              <td>
                {d.memberId ? (
                  <button
                    type="button"
                    className={d.reviewed === 0 ? "danger" : ""}
                    onClick={() => toggleReviewed(d)}
                  >
                    {d.reviewed === 0 ? "Needs review" : "Reviewed"}
                  </button>
                ) : (
                  "—"
                )}
              </td>
              <td>
                <button type="button" className="danger" onClick={() => remove(d)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
