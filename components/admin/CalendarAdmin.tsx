"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";
import FileField from "@/components/FileField";

type EventRow = {
  id: number;
  title: string;
  start: string;
  color: string;
  description: string | null;
  imageR2Key: string | null;
  imageFileName: string | null;
  documentR2Key: string | null;
  documentFileName: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SIZE_PRESETS: { value: string; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable (recommended)" },
  { value: "large", label: "Large" },
];

export default function CalendarAdmin() {
  const { confirm, dialog } = useConfirm();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formResetKey, setFormResetKey] = useState(0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [color, setColor] = useState("#2c3e1f");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [existingImage, setExistingImage] = useState<{ id: number; fileName: string } | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [removeDocument, setRemoveDocument] = useState(false);
  const [existingDocument, setExistingDocument] = useState<{ id: number; fileName: string } | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");

  const [seriesTitle, setSeriesTitle] = useState("");
  const [weekday, setWeekday] = useState(6);
  const [nth, setNth] = useState(2);
  const [time, setTime] = useState("13:00");
  const [seriesColor, setSeriesColor] = useState("#8a1f11");
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(new Date().getMonth());
  const [monthCount, setMonthCount] = useState(12);

  const [sizePreset, setSizePreset] = useState("comfortable");
  const [sizeSaved, setSizeSaved] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/calendar");
    const data = (await res.json()) as EventRow[];
    data.sort((a, b) => a.start.localeCompare(b.start));
    setEvents(data);
    setLoading(false);
  }

  async function loadSettings() {
    const res = await fetch("/api/calendar-settings");
    const data = (await res.json()) as { sizePreset: string };
    setSizePreset(data.sizePreset);
  }

  useEffect(() => {
    void load();
    void loadSettings();
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setStart("");
    setColor("#2c3e1f");
    setDescription("");
    setImageFile(null);
    setRemoveImage(false);
    setExistingImage(null);
    setDocumentFile(null);
    setRemoveDocument(false);
    setExistingDocument(null);
    setLinkUrl("");
    setLinkLabel("");
    setFormResetKey((k) => k + 1);
  }

  function startEdit(ev: EventRow) {
    setEditingId(ev.id);
    setTitle(ev.title);
    setStart(ev.start.slice(0, 16));
    setColor(ev.color);
    setDescription(ev.description ?? "");
    setImageFile(null);
    setRemoveImage(false);
    setExistingImage(ev.imageR2Key ? { id: ev.id, fileName: ev.imageFileName ?? "image" } : null);
    setDocumentFile(null);
    setRemoveDocument(false);
    setExistingDocument(
      ev.documentR2Key ? { id: ev.id, fileName: ev.documentFileName ?? "document.pdf" } : null
    );
    setLinkUrl(ev.linkUrl ?? "");
    setLinkLabel(ev.linkLabel ?? "");
    setFormResetKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitEvent(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const formData = new FormData();
    formData.set("title", title);
    formData.set("start", start);
    formData.set("color", color);
    formData.set("description", description);
    formData.set("linkUrl", linkUrl.trim());
    formData.set("linkLabel", linkLabel.trim());
    if (imageFile) formData.set("image", imageFile);
    if (documentFile) formData.set("document", documentFile);
    if (editingId !== null) {
      formData.set("removeImage", removeImage ? "true" : "false");
      formData.set("removeDocument", removeDocument ? "true" : "false");
    }

    const result = editingId !== null
      ? await adminFetch(`/api/admin/calendar/${editingId}`, { method: "PATCH", body: formData })
      : await adminFetch("/api/admin/calendar", { method: "POST", body: formData });

    if (!result.ok) {
      setError(result.error);
      return;
    }
    resetForm();
    void load();
  }

  async function addSeries(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await adminFetch("/api/admin/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "series",
        title: seriesTitle,
        weekday,
        nth,
        time,
        color: seriesColor,
        startYear,
        startMonth,
        monthCount,
      }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSeriesTitle("");
    void load();
  }

  async function removeEvent(ev: EventRow) {
    const ok = await confirm(`Delete "${ev.title}" on ${ev.start.replace("T", " ")}? This cannot be undone.`);
    if (!ok) return;
    setError("");
    const result = await adminFetch(`/api/admin/calendar/${ev.id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (editingId === ev.id) resetForm();
    void load();
  }

  async function saveSizePreset(value: string) {
    setSizePreset(value);
    setSizeSaved(false);
    const result = await adminFetch("/api/admin/calendar-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sizePreset: value }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSizeSaved(true);
  }

  const now = new Date();
  const threeMonthsOut = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
  const upcoming = events.filter((ev) => {
    const d = new Date(ev.start);
    return d >= now && d < threeMonthsOut;
  });

  const groups = new Map<string, EventRow[]>();
  for (const ev of upcoming) {
    const d = new Date(ev.start);
    const monthLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups.has(monthLabel)) groups.set(monthLabel, []);
    groups.get(monthLabel)!.push(ev);
  }

  return (
    <div>
      {dialog}
      <h1>Calendar</h1>
      {error && <p className="admin-error">{error}</p>}

      <form className="admin-form" onSubmit={submitEvent}>
        <strong>{editingId !== null ? "Edit event" : "Add a single event"}</strong>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Date &amp; time
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
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
        <FileField
          key={`image-${formResetKey}`}
          label="Picture (optional)"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={setImageFile}
        />
        {existingImage && !imageFile && (
          <label className="admin-inline-check">
            <input
              type="checkbox"
              checked={removeImage}
              onChange={(e) => setRemoveImage(e.target.checked)}
            />
            Remove current picture ({existingImage.fileName})
          </label>
        )}
        <FileField
          key={`document-${formResetKey}`}
          label="Document (optional, PDF)"
          accept="application/pdf"
          onChange={setDocumentFile}
        />
        {existingDocument && !documentFile && (
          <label className="admin-inline-check">
            <input
              type="checkbox"
              checked={removeDocument}
              onChange={(e) => setRemoveDocument(e.target.checked)}
            />
            Remove current document ({existingDocument.fileName})
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
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit">{editingId !== null ? "Save changes" : "Add event"}</button>
          {editingId !== null && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <form className="admin-form" onSubmit={addSeries}>
        <strong>Add a recurring series (e.g. &quot;2nd Saturday of every month&quot;)</strong>
        <label>
          Title
          <input value={seriesTitle} onChange={(e) => setSeriesTitle(e.target.value)} required />
        </label>
        <label>
          Which occurrence
          <select value={nth} onChange={(e) => setNth(Number(e.target.value))}>
            <option value={1}>1st</option>
            <option value={2}>2nd</option>
            <option value={3}>3rd</option>
            <option value={4}>4th</option>
          </select>
        </label>
        <label>
          Weekday
          <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
            {WEEKDAYS.map((w, i) => (
              <option key={w} value={i}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label>
          Time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
        <label>
          Color
          <input
            type="color"
            value={seriesColor}
            onChange={(e) => setSeriesColor(e.target.value)}
          />
        </label>
        <label>
          Starting year/month
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              style={{ width: 90 }}
            />
            <select value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(2000, i, 1).toLocaleString("en-US", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label>
          How many months to generate
          <input
            type="number"
            min={1}
            max={36}
            value={monthCount}
            onChange={(e) => setMonthCount(Number(e.target.value))}
          />
        </label>
        <button type="submit">Generate series</button>
      </form>

      <div className="admin-form">
        <strong>Calendar display size</strong>
        <p className="admin-note">Changes how big the squares and text are on the public calendar page.</p>
        <label>
          Size
          <select value={sizePreset} onChange={(e) => void saveSizePreset(e.target.value)}>
            {SIZE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {sizeSaved && <p className="admin-saved">Saved ✓</p>}
      </div>

      <h2>Upcoming events (next 3 months)</h2>
      {loading ? (
        <p>Loading…</p>
      ) : upcoming.length === 0 ? (
        <p className="admin-note">No events scheduled in the next 3 months.</p>
      ) : (
        <div className="event-list">
          {Array.from(groups.entries()).map(([monthLabel, monthEvents]) => (
            <div key={monthLabel} className="event-month-group">
              <h3>{monthLabel}</h3>
              <ul>
                {monthEvents.map((ev) => (
                  <li key={ev.id} className="event-list-item">
                    <span className="event-swatch" style={{ backgroundColor: ev.color }} />
                    {ev.imageR2Key && (
                      <img
                        src={`/api/calendar-events/${ev.id}/image`}
                        alt=""
                        className="event-thumb"
                      />
                    )}
                    <span className="event-details">
                      <strong>{ev.title}</strong>
                      <br />
                      {new Date(ev.start).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(ev.start).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {ev.documentR2Key && " · document"}
                      {ev.linkUrl && " · link"}
                    </span>
                    <button type="button" onClick={() => startEdit(ev)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => removeEvent(ev)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
