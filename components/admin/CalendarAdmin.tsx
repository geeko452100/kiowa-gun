"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "./useConfirm";
import { adminFetch } from "./adminFetch";

type EventRow = { id: number; title: string; start: string; color: string };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function CalendarAdmin() {
  const { confirm, dialog } = useConfirm();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [color, setColor] = useState("#2c3e1f");

  const [seriesTitle, setSeriesTitle] = useState("");
  const [weekday, setWeekday] = useState(6);
  const [nth, setNth] = useState(2);
  const [time, setTime] = useState("13:00");
  const [seriesColor, setSeriesColor] = useState("#8a1f11");
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(new Date().getMonth());
  const [monthCount, setMonthCount] = useState(12);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/calendar");
    const data = (await res.json()) as EventRow[];
    data.sort((a, b) => a.start.localeCompare(b.start));
    setEvents(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await adminFetch("/api/admin/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, start, color }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setStart("");
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
    void load();
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

      <form className="admin-form" onSubmit={addEvent}>
        <strong>Add a single event</strong>
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
        <button type="submit">Add event</button>
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
                    </span>
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
