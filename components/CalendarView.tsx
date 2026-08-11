"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import EventDetailPanel, { type EventDetailPanelHandle, type PanelEvent } from "./EventDetailPanel";

declare global {
  interface Window {
    FullCalendar?: {
      Calendar: new (
        el: HTMLElement,
        options: Record<string, unknown>
      ) => {
        render: () => void;
        setOption: (name: string, value: unknown) => void;
      };
    };
  }
}

const DATE_HEADING = { weekday: "long", month: "long", day: "numeric", year: "numeric" } as const;

export default function CalendarView({ isAdmin = false }: { isAdmin?: boolean }) {
  const elRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<EventDetailPanelHandle>(null);
  const cancelledRef = useRef(false);
  const eventsRef = useRef<PanelEvent[]>([]);
  const calendarRef = useRef<{
    render: () => void;
    setOption: (name: string, value: unknown) => void;
  } | null>(null);

  useEffect(() => {
    // Dev-mode Strict Mode double-invokes this effect (mount, cleanup, mount)
    // to surface bugs -- without resetting here, that simulated cleanup
    // leaves cancelledRef stuck at `true` for the real mount, so init() (run
    // later by the Script's onLoad) would silently bail after fetching data
    // and never call calendar.render(), leaving the grid empty with no error.
    cancelledRef.current = false;

    // next/script only fires onLoad the first time the FullCalendar <script>
    // tag actually loads; it dedupes by src, so client-side navigating away
    // from /calendar and back (e.g. clicking a nav link) remounts this
    // component without the tag reloading, and onLoad never fires again. If
    // the script is already present from an earlier mount, run init() here
    // instead of waiting on an onLoad that isn't coming.
    if (window.FullCalendar) void init();

    return () => {
      cancelledRef.current = true;
    };
    // init() is intentionally excluded: it must only run once per mount
    // (on the conditions above), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPanelForDate(dateStr: string) {
    const dayEvents = eventsRef.current.filter((e) => e.start.slice(0, 10) === dateStr);
    const label = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", DATE_HEADING);
    panelRef.current?.open(dateStr, label, dayEvents);
  }

  // Re-fetches events after an admin edits/deletes one from the open drawer,
  // then refreshes both the calendar grid and (if a date is open) the
  // drawer's own list -- so the change is visible without a page reload.
  async function refreshEvents(dateStr?: string) {
    const res = await fetch("/api/calendar-events");
    const events = (await res.json()) as PanelEvent[];
    eventsRef.current = events;
    calendarRef.current?.setOption("events", events);
    if (dateStr) {
      const dayEvents = events.filter((e) => e.start.slice(0, 10) === dateStr);
      panelRef.current?.setEvents(dayEvents);
    }
  }

  async function init() {
    if (!elRef.current || !window.FullCalendar) return;
    const [eventsRes, settingsRes] = await Promise.all([
      fetch("/api/calendar-events"),
      fetch("/api/calendar-settings"),
    ]);
    const events = (await eventsRes.json()) as PanelEvent[];
    const settings = (await settingsRes.json()) as { sizePreset: string };
    if (cancelledRef.current || !elRef.current) return;

    eventsRef.current = events;
    elRef.current.dataset.size = settings.sizePreset;

    const isNarrow = window.matchMedia("(max-width: 599px)").matches;
    const calendar = new window.FullCalendar.Calendar(elRef.current, {
      initialView: "dayGridMonth",
      height: "auto",
      dayMaxEventRows: 2,
      dayHeaderFormat: isNarrow ? { weekday: "narrow" } : { weekday: "short" },
      displayEventTime: !isNarrow,
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,listMonth",
      },
      events,
      dateClick: (info: { dateStr: string }) => openPanelForDate(info.dateStr),
      eventClick: (info: { event: { startStr: string }; jsEvent: MouseEvent }) => {
        info.jsEvent.preventDefault();
        openPanelForDate(info.event.startStr.slice(0, 10));
      },
    });
    calendarRef.current = calendar;
    calendar.render();
  }

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js"
        strategy="afterInteractive"
        onLoad={() => void init()}
      />
      <div id="range-calendar" ref={elRef}></div>
      <EventDetailPanel ref={panelRef} isAdmin={isAdmin} onChanged={(dateStr) => void refreshEvents(dateStr)} />
    </>
  );
}
