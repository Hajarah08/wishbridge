# WishBridge

> Your wish. Someone's kindness. A world of possibilities.

WishBridge connects people who have wishes with people who want to fulfil them. Wishers post items, experiences, learning goals and more — under a username or anonymously. Givers browse moderated wishes and offer to help, optionally anonymously. Every wish is reviewed, addresses are never shared automatically, and a wish is only marked fulfilled after **both** sides confirm.

**This is a functional MVP.** Contributions are a clearly labelled **test-mode simulation** — no real money is collected, held or paid out. WishBridge never guarantees that a wish will be fulfilled.

## Features
- Email/password auth with password recovery; public profile separated from private account data.
- Wish creation (draft → review → live), editing, withdrawal, image uploads (EXIF stripped), 10-state status machine enforced in the database.
- Explore with full-text search, category/country/status filters, sorting and pagination.
- Fulfilment offers: accept/decline, private coordination thread, in-progress → delivered → wisher-confirmed, disputes resolved by admins.
- Simulated contributions with progress, idempotency, and automatic reversal on withdrawal/suspension.
- Anonymous giving and anonymous wishing enforced by RLS and SQL functions (no ids ever reach the other party).
- In-app notifications; email-ready structure.
- Admin area: stats, moderation queue, user restriction/suspension, reports, disputes, payment test records, categories, support inbox, append-only audit log.
- Draft legal pages (terms, privacy, community guidelines) clearly marked for professional review.

## Project structure
```
src/
  app/                 Next.js routes (public, auth, dashboard, admin) and server actions (app/actions)
  components/          UI system (components/ui) and domain components
  lib/                 Supabase clients, auth guards, validation, domain labels, payments, images
  proxy.ts             Session refresh + optimistic route protection
supabase/
  migrations/          Schema, RLS, functions, storage (apply to a clean database)
  seed.sql             Development/demo data only
tests/
  unit/                Pure logic
  integration/         Real Supabase API + SQL invariants
  e2e/                 Playwright browser tests
docs/                  ARCHITECTURE, SECURITY, PAYMENTS, DEPLOYMENT, ACCEPTANCE
scripts/make-admin.mjs Grant the admin role (server secret required)
```

## Local setup
Prerequisites: Node 20+ (22 recommended), Docker.

```bash
npm install
```

```bash
npx supabase start
```

`supabase start` prints the local URL and keys. Copy the template and fill them in:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` (http://127.0.0.1:54321) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `PUBLISHABLE_KEY` (or `ANON_KEY`) |
| `SUPABASE_SECRET_KEY` | `SECRET_KEY` (or `SERVICE_ROLE_KEY`) — server only |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `TEST_DATABASE_URL` | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Apply migrations and demo data, then run the app:

```bash
npm run db:reset
```

```bash
npm run dev
```

Open http://localhost:3000. Local emails (confirmation, password reset) appear in Mailpit at http://127.0.0.1:54324.

### Demo accounts (seed data, password `WishBridge2026`)
| Email | Role |
|---|---|
| admin@wishbridge.test | Administrator |
| amara@wishbridge.test | Wisher with offers waiting |
| ben@wishbridge.test | Giver |
| chen@wishbridge.test, dana@wishbridge.test | Wishers / givers |

## Testing
```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run test:integration
```

Integration tests need the local stack running and seeded (`npm run db:reset`).

```bash
npm run test:e2e
```

E2E builds and starts the app automatically (or set `E2E_BASE_URL` to an already running server). If your environment provides its own Chromium, set `PLAYWRIGHT_CHROMIUM_PATH`; otherwise run `npx playwright install chromium` once. Re-run `npm run db:reset` between E2E runs for a clean queue. Each E2E run signs up two users; the app limits sign-ups to 5 per IP per 10 minutes, so restart the server if you run the suite more than twice in quick succession.

Current results: 63 Vitest tests (unit + API integration + SQL invariants) and 5 Playwright tests passing. See `docs/ACCEPTANCE.md` for the mapping to the acceptance criteria.

## Deployment
See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). In short: create a Supabase project, `supabase db push`, configure Auth URLs/SMTP, deploy the Next.js app with the variables above, then `npm run make-admin -- you@example.com`.

## Security
See [`docs/SECURITY.md`](docs/SECURITY.md) for the checklist. Never put `SUPABASE_SECRET_KEY` in a `NEXT_PUBLIC_` variable or client code.

## Known limitations and launch requirements
- **Payments are simulated.** Real payments need a regulated provider and the compliance work in [`docs/PAYMENTS.md`](docs/PAYMENTS.md). No wallet, pooled funds or payouts exist.
- **Legal pages are drafts** and must be reviewed by a qualified professional for each launch jurisdiction.
- **Email notifications** are not sent yet (in-app only); the schema and seam for an email worker are in place.
- **Auth-route rate limiting** is per server instance; use a shared store when scaling horizontally. Database-backed limits apply to all business actions.
- **CSP** allows inline scripts (Next.js runtime); move to nonces for a stricter policy.
- No realtime updates (pages refresh after actions), no public user profiles, no admin MFA, no account self-deletion UI (requests go to support).
- Moderation is human-only; no automated content classification yet.
- Countries/currencies are a curated subset; extend `src/lib/countries.ts` as needed.
