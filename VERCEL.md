# Deploying to Vercel

The repo ships Vercel-ready: a static React build (`artifacts/holiday-tracker`) plus the Express API exposed as a single serverless function (`api/index.ts`).

## One-time setup

1. **Provision Postgres.** Any provider works — [Neon](https://neon.tech) is the easiest fit for Vercel. Copy the connection string (must include `?sslmode=require` for hosted Postgres).
2. **Push schema:** locally run `pnpm install && DATABASE_URL=... pnpm --filter @workspace/db run push`.
3. **Import the repo on Vercel** (`vercel.com/new`). The included `vercel.json` sets build/output/install commands — no manual project-settings overrides needed.
4. **Add environment variable** in Project Settings → Environment Variables:
   - `DATABASE_URL` — the Postgres URL from step 1, applied to Production / Preview / Development.
5. **Deploy.** Subsequent pushes auto-deploy.

## How it's wired

- `vercel.json` — `buildCommand: pnpm run vercel-build`, `outputDirectory: artifacts/holiday-tracker/dist/public`, and a rewrite mapping `/api/*` → the function.
- `api/index.ts` — thin Vercel handler that imports the Express app from `@workspace/api-server/app`. Vercel's Node runtime accepts a `(req, res) => …` handler, which is exactly what an Express app is.
- `api/package.json` — a workspace package whose only job is to declare `@workspace/api-server` as a runtime dep so Vercel's function bundler resolves it.
- Express still mounts at `/api`, so client requests to `/api/people` hit the rewrite, land at the function, and `app.use("/api", router)` routes them.

## Caveats

- **Cold-start connections.** The api-server uses `pg.Pool`, which gets recreated on every cold start. Fine for low traffic; for production load swap to `@neondatabase/serverless` (HTTP-pooled) in `lib/db/src/index.ts`.
- **Replit Vite plugins.** `@replit/vite-plugin-runtime-error-modal` is always loaded; `cartographer` and `dev-banner` are guarded by `REPL_ID`. They're harmless on Vercel but can be removed if you no longer use Replit.
- **No auth.** Same caveat as the original `replit.md` — this is an internal team tool. Add access control (Vercel Password Protection, a middleware, etc.) before exposing publicly.
- **Pino logging.** `pino-pretty` is dev-only; production logs to stdout, which Vercel captures.
