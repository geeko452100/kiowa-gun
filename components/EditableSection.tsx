"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { adminFetch } from "@/components/admin/adminFetch";
import { useConfirm } from "@/components/admin/useConfirm";
import "@/app/styles/editable-section.css";

// In-place editor for a page_sections row, rendered directly on the public
// page it belongs to. Logged-in board members see an "Edit" button instead
// of the plain content; everyone else gets exactly what was rendered before.
export default function EditableSection({
  id,
  heading,
  bodyHtml,
  isAdmin,
  className,
  headingTag: HeadingTag = "h2",
  deletable = false,
  onDeleted,
}: {
  id: number;
  heading?: string | null;
  bodyHtml: string;
  isAdmin: boolean;
  className?: string;
  headingTag?: "h1" | "h2" | "h3";
  deletable?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [headingVal, setHeadingVal] = useState(heading ?? "");
  const [bodyVal, setBodyVal] = useState(bodyHtml);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const hasHeading = heading !== undefined && heading !== null;
  const { confirm, dialog: confirmDialog } = useConfirm();

  if (!isAdmin) {
    return (
      <>
        {hasHeading && <HeadingTag>{heading}</HeadingTag>}
        <div className={className} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </>
    );
  }

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);
    const result = await adminFetch<{ url: string }>("/api/admin/pages/images", {
      method: "POST",
      body: formData,
    });
    if (!result.ok) throw new Error(result.error);
    return result.data.url;
  }

  async function uploadDocument(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("document", file);
    const result = await adminFetch<{ url: string }>("/api/admin/pages/documents", {
      method: "POST",
      body: formData,
    });
    if (!result.ok) throw new Error(result.error);
    return result.data.url;
  }

  async function remove() {
    const confirmed = await confirm("Delete this section? This can't be undone.");
    if (!confirmed) return;
    setDeleting(true);
    setError("");
    const result = await adminFetch(`/api/admin/pages/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (onDeleted) onDeleted();
    else router.refresh();
  }

  async function save() {
    setSaving(true);
    setError("");
    const result = await adminFetch(`/api/admin/pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heading: hasHeading ? headingVal : undefined, bodyHtml: bodyVal }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function cancel() {
    setHeadingVal(heading ?? "");
    setBodyVal(bodyHtml);
    setError("");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="editable-section-editing">
        {confirmDialog}
        {hasHeading && (
          <input
            className="editable-section-heading-input"
            value={headingVal}
            onChange={(e) => setHeadingVal(e.target.value)}
            placeholder="Heading"
            aria-label="Section heading"
          />
        )}
        <RichTextEditor
          value={bodyVal}
          onChange={setBodyVal}
          onImageUpload={uploadImage}
          onDocumentUpload={uploadDocument}
        />
        <div className="editable-section-actions">
          <button type="button" onClick={save} disabled={saving || deleting}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="editable-section-cancel"
            onClick={cancel}
            disabled={saving || deleting}
          >
            Cancel
          </button>
          {deletable && (
            <button
              type="button"
              className="editable-section-delete"
              onClick={remove}
              disabled={saving || deleting}
            >
              {deleting ? "Deleting…" : "Delete section"}
            </button>
          )}
          {error && <span className="editable-section-error">{error}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="editable-section-wrap">
      <button type="button" className="editable-section-edit-btn" onClick={() => setEditing(true)}>
        ✎ Edit this section
      </button>
      {hasHeading && <HeadingTag>{headingVal}</HeadingTag>}
      <div className={className} dangerouslySetInnerHTML={{ __html: bodyVal }} />
    </div>
  );
}
