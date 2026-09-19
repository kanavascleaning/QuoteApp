# Window Cleaning Quotes

A mobile-first PWA for window cleaners to maintain their standard job prices before quoting jobs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/window-cleaning-quotes run dev` — run the app preview
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

- `artifacts/window-cleaning-quotes/src/pages/home.tsx` — Home placeholder screen
- `artifacts/window-cleaning-quotes/src/pages/settings.tsx` — editable price settings screen
- `artifacts/window-cleaning-quotes/src/pages/quote.tsx` — new and editable quote form
- `artifacts/window-cleaning-quotes/src/pages/review.tsx` — read-only saved quote review
- `artifacts/window-cleaning-quotes/src/lib/prices.ts` — replaceable local price persistence layer
- `artifacts/window-cleaning-quotes/src/lib/quotes.ts` — replaceable saved quote persistence layer
- `artifacts/window-cleaning-quotes/src/components/app-shell.tsx` — shared app header and bottom navigation

## Architecture decisions

- Phase one is frontend-only and stores prices in browser local storage.
- Price persistence is isolated behind `src/lib/prices.ts` so a backend can replace it later without changing the screens.
- Saved quotes use a separate local storage layer and snapshot the prices used when each quote is saved.
- Editing a saved quote preserves its stable ID and creation timestamp instead of creating a duplicate.
- The app uses path-aware React Router navigation and a fixed mobile bottom navigation shell.

## Product

- Home screen placeholder with local/offline storage messaging.
- Settings screen with six editable prices in pounds and explicit save feedback.
- Values persist between refreshes and browser sessions on the same device.
- New quotes can be saved, reviewed, edited in place, and deleted with confirmation.

## User preferences

- Build the app in phases; keep quote forms and quote lists out until a later phase.

## Gotchas

- The Vite config requires `PORT` and `BASE_PATH` when running a direct production build; the managed workflow supplies them automatically.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
