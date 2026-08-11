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

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDINALS = ["1st", "2nd", "3rd", "4th"];

// Plain-language description of a recurrence rule, stored on every event row
// generated from it (calendar_events.recurrence_label) so the public
// calendar can show "Recurring — Every 2nd Saturday of the month" without
// re-deriving it from weekday/nth every time.
export function describeRecurrence(nth: number, weekday: number) {
  const ordinal = ORDINALS[nth - 1] ?? `${nth}th`;
  return `Every ${ordinal} ${WEEKDAY_NAMES[weekday]} of the month`;
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
  const seriesId = crypto.randomUUID();
  const recurrenceLabel = describeRecurrence(nth, weekday);
  const events: {
    title: string;
    start: string;
    color: string;
    seriesId: string;
    recurrenceLabel: string;
  }[] = [];

  let year = startYear;
  let month = startMonth;
  for (let i = 0; i < monthCount; i++) {
    const day = nthWeekdayOfMonth(year, month, weekday, nth);
    events.push({
      title,
      start: `${fmt(year, month, day)}T${time}:00`,
      color,
      seriesId,
      recurrenceLabel,
    });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return events;
}
