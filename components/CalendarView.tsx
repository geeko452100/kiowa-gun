"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    FullCalendar?: {
      Calendar: new (el: HTMLElement, options: Record<string, unknown>) => {
        render: () => void;
      };
    };
  }
}

export default function CalendarView() {
  const elRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  async function init() {
    if (!elRef.current || !window.FullCalendar) return;
    const res = await fetch("/api/calendar-events");
    const events = await res.json();
    if (cancelledRef.current || !elRef.current) return;

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
    </>
  );
}
