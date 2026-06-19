# FIG Holiday Tracker

A shared time-off tracker for the combined FIG (Financial Institutions Group) banking team — book holidays from the calendar or roster, import an existing spreadsheet, and flag days where too many people are away.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API contract (source of truth): `lib/api-spec/openapi.yaml` — run codegen after edits.
- DB schema: `lib/db/src/schema/{people,holidays,settings}.ts`.
- API routes: `artifacts/api-server/src/routes/{people,holidays,insights,settings}.ts`; date helpers in `artifacts/api-server/src/lib/dates.ts`.
- Frontend: `artifacts/holiday-tracker/src/` — pages in `pages/`, dialogs in `components/{holidays,people}/`, theme in `src/index.css`.

## Architecture decisions

- Dates stored as `date(mode: "string")` in `YYYY-MM-DD` to avoid timezone shifts; never parse holiday dates through UTC `Date`.
- `holidays.person_id` has a FK to `people.id` with `ON DELETE CASCADE` — removing a person removes their bookings (no orphaned coverage counts).
- Server validates holiday writes (create/update/import): rejects malformed dates and `startDate > endDate`, and verifies `personId` exists.
- Coverage conflict flagging: a day is `overThreshold` when `awayCount > settings.maxAway`.
- Spreadsheet import is parsed client-side (xlsx) into rows, then matched server-side against person name OR initials (case-insensitive).

## Product

- Calendar dashboard: summary cards (away today/this week, upcoming, conflict days), month grid with color-coded per-person pills and conflict highlighting. Click a day to book.
- Team roster: add/edit/remove leads and bankers; click a person (or the calendar+ button) to book time off for them directly.
- Settings: configure team name and the max-people-away conflict threshold.
- Import: upload an Excel/CSV of existing holidays; unmatched names are reported back.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing any `lib/*` package (e.g. DB schema), run `pnpm run typecheck:libs` before typechecking artifacts, or you'll see stale "no exported member" errors.
- The font `@import` in `src/index.css` must come before the Tailwind `@import`s (CSS requires `@import` first).
- This app has no auth — it's an internal team tool. Add access control before exposing it publicly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
