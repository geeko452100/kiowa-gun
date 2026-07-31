# Kiowa Gun Club

Static website for the Kiowa Gun Club — one of the oldest established shooting clubs in central Kansas, located near Great Bend, KS.

## Structure

```
index.html          Home page
pages/               About/Map, Calendar, Contact, Matches, Membership, News, Rules
css/                 styles.css (shared) + one stylesheet per page for page-specific styles
scripts/             Vanilla JS: calendar rendering, map embed, match flyer modal
assets/              Images (.avif) and downloadable PDFs
```

No build step or dependencies — it's plain HTML/CSS/JS. `pages/calendar.html` pulls in [FullCalendar](https://fullcalendar.io/) from a CDN for the range schedule.

## Running locally

Just open `index.html` in a browser, or serve the folder with any static file server, e.g.:

```
npx serve .
```

## Pages

- **Home** — welcome blurb, safety rules summary, upcoming matches
- **Calendar** — recurring monthly pistol shoots and member sessions (`scripts/calender.js`)
- **About Us / Map** — club officers and an embedded Google Map (`scripts/map.js`)
- **Range Rules** — full safety rules
- **Membership Info** — dues, requirements, and a downloadable membership agreement PDF
- **Matches** — match schedule, results links, and a flyer viewer modal (`scripts/matches.js`)
- **Contact Us** — mailing address and email
- **News** — club announcements
