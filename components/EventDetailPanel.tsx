"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export type PanelEvent = {
  id: number;
  title: string;
  start: string;
  color: string;
  description?: string | null;
  imageUrl?: string | null;
};

export type EventDetailPanelHandle = {
  open: (dateLabel: string, events: PanelEvent[]) => void;
};

// Side panel shown when a board member or visitor clicks a date/event on the
// public calendar -- native <dialog> like FlyerModal, but a slide-in panel
// (full-screen on mobile) instead of an image lightbox.
const EventDetailPanel = forwardRef<EventDetailPanelHandle>(function EventDetailPanel(_props, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dateLabel, setDateLabel] = useState("");
  const [events, setEvents] = useState<PanelEvent[]>([]);

  useImperativeHandle(ref, () => ({
    open(label, evs) {
      setDateLabel(label);
      setEvents(evs);
      dialogRef.current?.showModal();
    },
  }));

  return (
    <dialog ref={dialogRef} className="event-detail-dialog" aria-label="Event details">
      <button
        type="button"
        className="event-detail-close"
        aria-label="Close event details"
        onClick={() => dialogRef.current?.close()}
      >
        &times;
      </button>
      <h2 className="event-detail-date">{dateLabel}</h2>
      {events.length === 0 ? (
        <p className="event-detail-empty">No events scheduled on this date.</p>
      ) : (
        <ul className="event-detail-list">
          {events.map((ev) => (
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
              {ev.description && <p className="event-detail-description">{ev.description}</p>}
              {ev.imageUrl && (
                <img src={ev.imageUrl} alt="" className="event-detail-image" />
              )}
            </li>
          ))}
        </ul>
      )}
    </dialog>
  );
});

export default EventDetailPanel;
