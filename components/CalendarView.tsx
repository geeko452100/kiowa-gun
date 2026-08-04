"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import EventDetailPanel, { type EventDetailPanelHandle, type PanelEvent } from "./EventDetailPanel";

declare global {
  interface Window {
    FullCalendar?: {
      Calendar: new (el: HTMLElement, options: Record<string, unknown>) => {
        render: () => void;
      };
    };
  }
}

const DATE_HEADING = { weekday: "long", month: "long", day: "numeric", year: "numeric" } as const;

export default function CalendarView() {
  const elRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<EventDetailPanelHandle>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  async function init() {
    if (!elRef.current || !window.FullCalendar) return;
    const [eventsRes, settingsRes] = await Promise.all([
      fetch("/api/calendar-events"),
      fetch("/api/calendar-settings"),
    ]);
    const events = (await eventsRes.json()) as PanelEvent[];
    const settings = (await settingsRes.json()) as { sizePreset: string };
    if (cancelledRef.current || !elRef.current) return;

    elRef.current.dataset.size = settings.sizePreset;

    function openPanelForDate(dateStr: string) {
      const dayEvents = events.filter((e) => e.start.slice(0, 10) === dateStr);
      const label = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", DATE_HEADING);
      panelRef.current?.open(label, dayEvents);
    }

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
      <EventDetailPanel ref={panelRef} />
    </>
  );
}
