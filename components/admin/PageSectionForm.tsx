"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "./RichTextEditor";
import { adminFetch } from "./adminFetch";

export default function PageSectionForm({
  id,
  pageSlug,
  sectionKey,
  heading,
  bodyHtml,
}: {
  id: number;
  pageSlug: string;
  sectionKey: string;
  heading: string | null;
  bodyHtml: string;
}) {
  const router = useRouter();
  const [headingVal, setHeadingVal] = useState(heading ?? "");
  const [bodyVal, setBodyVal] = useState(bodyHtml);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setJustSaved(false);
    setError("");
    const result = await adminFetch(`/api/admin/pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heading: headingVal, bodyHtml: bodyVal }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setJustSaved(true);
    router.refresh();
    setTimeout(() => setJustSaved(false), 3000);
  }

  return (
    <div className="admin-form">
      <strong>
        {pageSlug} / {sectionKey}
      </strong>
      <label>
        Heading
        <input value={headingVal} onChange={(e) => setHeadingVal(e.target.value)} />
      </label>
      <RichTextEditor label="Body" value={bodyVal} onChange={setBodyVal} />
      <div className="admin-row-actions">
        <button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        {justSaved && <span className="admin-saved">Saved ✓</span>}
        {error && <span className="admin-error">{error}</span>}
      </div>
    </div>
  );
}
