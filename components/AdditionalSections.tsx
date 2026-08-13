"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditableSection from "@/components/EditableSection";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { adminFetch } from "@/components/admin/adminFetch";

// Board members can append their own content blocks to any page on top of
// its fixed, seeded sections. Those extra blocks live in the same
// page_sections table, tagged by a "custom-" section_key prefix, and always
// render here at the end of the page.
export default function AdditionalSections({
  pageSlug,
  sections,
  isAdmin,
}: {
  pageSlug: string;
  sections: { id: number; sectionKey: string; heading: string | null; bodyHtml: string }[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const custom = sections.filter((s) => s.sectionKey.startsWith("custom-"));
  const [adding, setAdding] = useState(false);
  const [headingVal, setHeadingVal] = useState("");
  const [bodyVal, setBodyVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [removedIds, setRemovedIds] = useState<number[]>([]);

  if (!isAdmin && custom.length === 0) return null;

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

  async function addSection() {
    setSaving(true);
    setError("");
    const result = await adminFetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageSlug, heading: headingVal, bodyHtml: bodyVal }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setHeadingVal("");
    setBodyVal("");
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="additional-sections">
      {custom
        .filter((s) => !removedIds.includes(s.id))
        .map((s) => (
          <EditableSection
            key={s.id}
            id={s.id}
            heading={s.heading}
            bodyHtml={s.bodyHtml}
            isAdmin={isAdmin}
            deletable
            onDeleted={() => setRemovedIds((ids) => [...ids, s.id])}
          />
        ))}

      {isAdmin && (
        <div className="add-section">
          {adding ? (
            <div className="editable-section-editing">
              <input
                className="editable-section-heading-input"
                value={headingVal}
                onChange={(e) => setHeadingVal(e.target.value)}
                placeholder="Heading (optional)"
                aria-label="New section heading"
              />
              <RichTextEditor
                value={bodyVal}
                onChange={setBodyVal}
                onImageUpload={uploadImage}
                onDocumentUpload={uploadDocument}
              />
              <div className="editable-section-actions">
                <button type="button" onClick={addSection} disabled={saving}>
                  {saving ? "Saving…" : "Add section"}
                </button>
                <button
                  type="button"
                  className="editable-section-cancel"
                  onClick={() => {
                    setAdding(false);
                    setHeadingVal("");
                    setBodyVal("");
                    setError("");
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                {error && <span className="editable-section-error">{error}</span>}
              </div>
            </div>
          ) : (
            <button type="button" className="editable-section-edit-btn" onClick={() => setAdding(true)}>
              + Add a section
            </button>
          )}
        </div>
      )}
    </div>
  );
}
