document.addEventListener('DOMContentLoaded', () => {
    const calendarEl = document.getElementById('range-calendar');
    if (!calendarEl || typeof FullCalendar === 'undefined') return;

    function formatDate(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    // FullCalendar's built-in recurrence only supports fixed weekdays (e.g. "every Saturday"),
    // not "nth weekday of month", so the club's recurring events are expanded to explicit dates.
    function nthWeekdayOfMonth(year, month, weekday, n) {
        const first = new Date(year, month, 1);
        const offset = (weekday - first.getDay() + 7) % 7;
        return 1 + offset + (n - 1) * 7;
    }

    function buildRecurringEvents(startYear, yearSpan) {
        const events = [];
        for (let year = startYear; year < startYear + yearSpan; year++) {
            for (let month = 0; month < 12; month++) {
                if (year === startYear && month < 2) continue; // pistol shoots begin in March

                const pistolDay = nthWeekdayOfMonth(year, month, 6, 2); // 2nd Saturday
                events.push({
                    title: 'Defensive Pistol Shoot',
                    start: `${formatDate(year, month, pistolDay)}T13:00:00`,
                    color: '#8a1f11'
                });

                const memberDay = nthWeekdayOfMonth(year, month, 2, 4); // 4th Tuesday
                events.push({
                    title: 'Club Member Shooting Session',
                    start: `${formatDate(year, month, memberDay)}T18:00:00`,
                    color: '#2c3e1f'
                });
            }
        }
        return events;
    }

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 'auto',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
        },
        events: buildRecurringEvents(new Date().getFullYear(), 2)
    });

    calendar.render();
});
