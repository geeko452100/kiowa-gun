# Kiowa Gun Club

Website + admin CMS for the Kiowa Gun Club — one of the oldest established shooting clubs in
central Kansas, located near Great Bend, KS. Built so board members can update the calendar, page
text, news, match schedule, and downloadable forms, and send email to members, without editing
code.

## Stack

- **Next.js 16** (App Router, TypeScript), deployed to **Cloudflare Workers** via
  [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)
- **D1** (SQLite) via **Drizzle ORM** for the database — schema in `lib/schema.ts`, migrations in
  `migrations/`
- **R2** for uploaded PDF forms (`documents` table)
- **Postmark** for bulk member email, **SignalWire** for bulk/automated member SMS
- Session-based admin auth (email/password, PBKDF2 hashing, DB-backed sessions) — no third-party
  login provider

## Structure

```
app/                    Public pages (/, /calendar, /about, /rules, /membership, /matches,
                         /contact, /news) and /admin/* (login + protected CMS screens)
app/api/                Public API routes (calendar feed, document downloads) and
                         /api/admin/* CRUD + email-send routes
components/              Shared UI (Header, Footer, nav) + components/admin/* (CMS screens)
lib/                     schema.ts (Drizzle schema), db.ts, auth.ts, recurrence.ts
migrations/              D1 migrations — 0001 schema, 0002 seed content (ported from the old site)
public/assets/           Site images
scripts/seed-admin.mjs   One-off script to create/update the first admin login
```

## First-time setup

```bash
npm install

# Create the D1 database and R2 bucket, then paste the returned database_id into wrangler.jsonc
npx wrangler d1 create kiowa-gun-club
npx wrangler r2 bucket create kiowa-gun-club-docs

# Apply migrations locally, then create your admin login
npm run db:migrate:local
INITIAL_ADMIN_EMAIL=you@kiowagunclub.org INITIAL_ADMIN_PASSWORD='choose-a-password' \
  INITIAL_ADMIN_NAME="Your Name" node scripts/seed-admin.mjs --local

# Copy .dev.vars.example -> .dev.vars and fill in a Postmark server token for local email testing,
# plus SignalWire credentials and a from-number for local SMS testing
cp .dev.vars.example .dev.vars

npm run dev
```

Visit `http://localhost:3000` for the public site and `/admin/login` for the CMS.

## Deploying

```bash
npm run db:migrate:remote
INITIAL_ADMIN_EMAIL=... INITIAL_ADMIN_PASSWORD=... node scripts/seed-admin.mjs   # no --local = remote
npx wrangler secret put POSTMARK_SERVER_TOKEN
npx wrangler secret put NMI_ENVIRONMENT      # "sandbox" or "production"
npx wrangler secret put NMI_API_KEY
npx wrangler secret put NMI_TOKENIZATION_KEY
npx wrangler secret put NMI_WEBHOOK_SECRET   # from NMI Merchant Portal > Settings > Webhooks
npx wrangler secret put SIGNALWIRE_SPACE_URL
npx wrangler secret put SIGNALWIRE_PROJECT_ID
npx wrangler secret put SIGNALWIRE_API_TOKEN
npx wrangler secret put SIGNALWIRE_FROM_NUMBER
npx wrangler secret put CRON_SECRET   # also set as CRON_SECRET in ../kiowa-gun-cron — see below
npm run cf:deploy
```

## Automated renewal reminder texts

`/api/cron/renewal-reminders` texts members whose `renewal_date` (set per-member in
`/admin/members`) is 45 or 15 days out, once per threshold per renewal cycle. It's a normal
protected API route, not a Cron Trigger itself — OpenNext's generated Worker has no `scheduled`
handler to attach one to. A separate, minimal Worker at `../kiowa-gun-cron` has its own daily Cron
Trigger and calls this route with a shared `CRON_SECRET` bearer token. See that project's README
for its own setup/deploy steps.

> **Windows note:** `@opennextjs/cloudflare` builds a Workers bundle that relies on symlinks, which
> plain Windows accounts can't create. Either enable Windows *Developer Mode* (Settings → Privacy &
> security → For developers) or run the build from WSL. `next dev` and `next build` (this project's
> own scripts) work fine on Windows without either of those — only the Cloudflare bundling step
> (`npm run cf:build` / `cf:deploy`) needs it.

## Admin CMS

- `/admin/pages` — edit the text blocks on Home/About/Rules/Membership/Contact
- `/admin/calendar` — add single events or generate a recurring series (e.g. "2nd Saturday of
  every month"), which expands into individually editable rows
- `/admin/news` — publish/hide news posts
- `/admin/matches` — edit the match schedule table
- `/admin/documents` — upload a PDF (print/export to PDF from any app — no Word needed); it
  appears as a download link on the Membership page
- `/admin/members` — add members one at a time or bulk-import a CSV (`name,email,phone` header);
  each member can also have a renewal date, which drives the automated renewal reminder texts below
- `/admin/email` — compose and send to every active member via Postmark; every send is logged
- `/admin/sms` — compose and send a text to selected members via SignalWire; every send is logged

## Content notes

- `pages/calendar.html`'s old client-side recurrence logic (`nthWeekdayOfMonth`) now lives in
  `lib/recurrence.ts`, used by the `/admin/calendar` "recurring series" helper.
- The public `/calendar` page still uses [FullCalendar](https://fullcalendar.io/) from a CDN, now
  reading events from `/api/calendar-events` instead of a hardcoded script.
