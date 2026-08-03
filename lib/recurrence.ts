// Computes the date of the nth occurrence of a weekday in a given month.
// weekday: 0=Sunday..6=Saturday. Used by the admin "recurring series" helper
// to expand e.g. "2nd Saturday of every month" into individual event rows.
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

function fmt(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function buildRecurringSeries(options: {
  title: string;
  weekday: number;
  nth: number;
  time: string; // "HH:MM"
  color: string;
  startYear: number;
  startMonth: number; // 0-11
  monthCount: number;
}) {
  const { title, weekday, nth, time, color, startYear, startMonth, monthCount } = options;
  const events: { title: string; start: string; color: string }[] = [];

  let year = startYear;
  let month = startMonth;
  for (let i = 0; i < monthCount; i++) {
    const day = nthWeekdayOfMonth(year, month, weekday, nth);
    events.push({ title, start: `${fmt(year, month, day)}T${time}:00`, color });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return events;
}
