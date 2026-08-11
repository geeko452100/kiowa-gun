"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import EventEditForm from "./EventEditForm";
import { useConfirm } from "@/components/admin/useConfirm";
import { adminFetch } from "@/components/admin/adminFetch";

export type PanelEvent = {
  id: number;
  title: string;
  start: string;
  color: string;
  description?: string | null;
  imageUrl?: string | null;
  documentUrl?: string | null;
  documentFileName?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  seriesId?: string | null;
  recurrenceLabel?: string | null;
};

export type EventDetailPanelHandle = {
  open: (dateStr: string, dateLabel: string, events: PanelEvent[]) => void;
  setEvents: (events: PanelEvent[]) => void;
};

// Side panel shown when a board member or visitor clicks a date/event on the
// public calendar -- native <dialog> like FlyerModal, but a slide-in panel
// (full-screen on mobile) instead of an image lightbox. When isAdmin, board
// members can edit or delete an event right here instead of going to
// /admin/calendar.
const EventDetailPanel = forwardRef<
  EventDetailPanelHandle,
  { isAdmin: boolean; onChanged: (dateStr: string) => void }
>(function EventDetailPanel({ isAdmin, onChanged }, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dateStr, setDateStr] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [events, setEvents] = useState<PanelEvent[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useImperativeHandle(ref, () => ({
    open(ds, label, evs) {
      setDateStr(ds);
      setDateLabel(label);
      setEvents(evs);
      setEditingId(null);
      setAdding(false);
      dialogRef.current?.showModal();
    },
    setEvents(evs) {
      setEvents(evs);
    },
  }));

  async function removeEvent(ev: PanelEvent) {
    const ok = await confirm(`Delete "${ev.title}"? This cannot be undone.`);
    if (!ok) return;
    const result = await adminFetch(`/api/admin/calendar/${ev.id}`, { method: "DELETE" });
    if (!result.ok) return;
    onChanged(dateStr);
  }

  return (
    <dialog ref={dialogRef} className="event-detail-dialog" aria-label="Event details">
      {confirmDialog}
      <button
        type="button"
        className="event-detail-close"
        aria-label="Close event details"
        onClick={() => dialogRef.current?.close()}
      >
        &times;
      </button>
      <h2 className="event-detail-date">{dateLabel}</h2>
      {events.length === 0 && !adding && (
        <p className="event-detail-empty">No events scheduled on this date.</p>
      )}
      {events.length > 0 && (
        <ul className="event-detail-list">
          {events.map((ev) =>
            editingId === ev.id ? (
              <li key={ev.id} className="event-detail-item">
                <EventEditForm
                  event={ev}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null);
                    onChanged(dateStr);
                  }}
                />
              </li>
            ) : (
              <li key={ev.id} className="event-detail-item">
                <div className="event-detail-title-row">
                  <span className="event-swatch" style={{ backgroundColor: ev.color }} />
                  <strong>{ev.title}</strong>
                </div>
                <p className="event-detail-time">
                  {new Date(ev.start).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {isAdmin && (
                  <p className="event-detail-recurrence">
                    {ev.seriesId ? `Recurring — ${ev.recurrenceLabel}` : "Not a recurring event"}
                  </p>
                )}
                {ev.description && <p className="event-detail-description">{ev.description}</p>}
                {ev.imageUrl && (
                  <img src={ev.imageUrl} alt="" className="event-detail-image" />
                )}
                {(ev.documentUrl || ev.linkUrl) && (
                  <p className="event-detail-links">
                    {ev.documentUrl && (
                      <a href={ev.documentUrl} target="_blank" rel="noopener noreferrer">
                        {ev.documentFileName || "View document"}
                      </a>
                    )}
                    {ev.linkUrl && (
                      <a href={ev.linkUrl} target="_blank" rel="noopener noreferrer">
                        {ev.linkLabel || ev.linkUrl}
                      </a>
                    )}
                  </p>
                )}
                {isAdmin && (
                  <div className="event-detail-admin-actions">
                    <button type="button" onClick={() => setEditingId(ev.id)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => removeEvent(ev)}>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            )
          )}
        </ul>
      )}
      {isAdmin &&
        (adding ? (
          <div className="event-detail-add">
            <EventEditForm
              defaultDate={dateStr}
              onCancel={() => setAdding(false)}
              onSaved={() => {
                setAdding(false);
                onChanged(dateStr);
              }}
            />
          </div>
        ) : (
          <button type="button" className="event-detail-add-btn" onClick={() => setAdding(true)}>
            + Add an event on this date
          </button>
        ))}
    </dialog>
  );
});

export default EventDetailPanel;
