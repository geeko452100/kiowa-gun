"use client";

import { useRef, useState } from "react";
import { adminFetch } from "@/components/admin/adminFetch";
import type { PanelEvent } from "./EventDetailPanel";

// Inline create/edit form for a single calendar event, embedded directly in
// the public event-detail drawer -- mirrors CalendarAdmin's form (same
// fields, same /api/admin/calendar endpoints) so board members don't need to
// leave the calendar they're already looking at. Pass `event` to edit an
// existing one (PATCH), or `defaultDate` with no `event` to add a new one on
// that date (POST).
export default function EventEditForm({
  event,
  defaultDate,
  onSaved,
  onCancel,
}: {
  event?: PanelEvent;
  defaultDate?: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [start, setStart] = useState(event ? event.start.slice(0, 16) : `${defaultDate}T12:00`);
  const [color, setColor] = useState(event?.color ?? "#2c3e1f");
  const [description, setDescription] = useState(event?.description ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [removeDocument, setRemoveDocument] = useState(false);
  const [linkUrl, setLinkUrl] = useState(event?.linkUrl ?? "");
  const [linkLabel, setLinkLabel] = useState(event?.linkLabel ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const formData = new FormData();
    formData.set("title", title);
    formData.set("start", start);
    formData.set("color", color);
    formData.set("description", description);
    formData.set("linkUrl", linkUrl.trim());
    formData.set("linkLabel", linkLabel.trim());
    if (event) {
      formData.set("removeImage", removeImage ? "true" : "false");
      formData.set("removeDocument", removeDocument ? "true" : "false");
    }
    if (imageFile) formData.set("image", imageFile);
    if (documentFile) formData.set("document", documentFile);

    const result = event
      ? await adminFetch(`/api/admin/calendar/${event.id}`, { method: "PATCH", body: formData })
      : await adminFetch("/api/admin/calendar", { method: "POST", body: formData });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <form className="event-edit-form" onSubmit={save}>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Date &amp; time
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
      </label>
      <label>
        Color
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </label>
      <label>
        Description (optional)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Details shown when someone clicks this date"
        />
      </label>
      <label>
        Picture (optional)
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {event?.imageUrl && !imageFile && (
        <label className="admin-inline-check">
          <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
          Remove current picture
        </label>
      )}
      <label>
        Document (optional, PDF)
        <input
          ref={documentInputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {event?.documentUrl && !documentFile && (
        <label className="admin-inline-check">
          <input
            type="checkbox"
            checked={removeDocument}
            onChange={(e) => setRemoveDocument(e.target.checked)}
          />
          Remove current document ({event.documentFileName || "document.pdf"})
        </label>
      )}
      <label>
        Link URL (optional)
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>
      <label>
        Link label (optional)
        <input
          value={linkLabel}
          onChange={(e) => setLinkLabel(e.target.value)}
          placeholder="Text shown for the link"
        />
      </label>
      <div className="event-edit-actions">
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="event-edit-cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        {error && <span className="event-edit-error">{error}</span>}
      </div>
    </form>
  );
}
