# WishBridge — Architecture (Phase 1)

## Stack and why

| Concern | Choice | Notes |
|---|---|---|
| Web app | Next.js 16 (App Router), React 19, TypeScript | Server Components for reads, Server Actions for writes. `src/proxy.ts` (formerly middleware) refreshes sessions. |
| Styling | Tailwind CSS 4 (PostCSS plugin) | Design tokens in `src/app/globals.css` (`@theme`). |
| Data | Supabase Postgres 17 | All business rules live in SQL: RLS, status machines, `SECURITY DEFINER` RPCs. |
| Auth | Supabase Auth (email + password) | Email confirmation and password recovery via `/auth/confirm`. |
| Files | Supabase Storage (private bucket) | Images re-encoded server-side with `sharp`, served via short-lived signed URLs. |
| Validation | Zod (client + server action) **and** SQL checks | The database is the final authority. |
| Tests | Vitest (unit, API integration, SQL invariants), Playwright (browser E2E) | Run against a real local Supabase stack. |

The recommended stack was kept; no change was warranted.

## Key design decisions

1. **Database-enforced authorisation.** `anon`/`authenticated` roles have `SELECT` only, restricted by RLS to the caller's own rows (or admins). Every write goes through a `SECURITY DEFINER` function in `public` that authenticates the caller, validates input, checks the status machine, writes notifications/audit rows, and runs in one transaction. Helpers live in a `private` schema that the Data API does not expose.
2. **Anonymity by construction.** Wishers never receive `giver_id`: they can't select `fulfilment_offers` at all and read offers through `get_wish_offers()` / `get_offer_thread()`, which return a display label (`An anonymous giver` or `@username`). Public pages read from views (`public_wishes`, `public_wish_images`, `public_wish_supporters`) with a fixed safe column list — no account ids. Notification text is composed in SQL from the same label helpers.
3. **Explicit status machines.** `wish_status_transitions` and `offer_status_transitions` tables define every allowed move and *who* may make it (`owner`/`wisher`/`giver`/`admin`/`system`). A trigger rejects any other change regardless of caller; `src/lib/domain.ts` mirrors the wish table for UI hints and a test asserts they match.
4. **Two-sided completion.** An offer only reaches `completed` when the giver has reported delivery and the wisher confirms (or an admin resolves a dispute) — enforced by a CHECK constraint, not just code.
5. **Payments behind an interface.** `PaymentProvider` (`src/lib/payments`) with a `SimulatedProvider`. Users can only create *pending* contribution intents; marking one `succeeded` is granted solely to `service_role` (server). CHECK constraints reject any `mode <> 'test'` row.
6. **Idempotency.** Offers and contributions carry client-generated idempotency keys (unique per user); partial unique indexes prevent duplicate live offers and more than one committed offer per wish; accept/confirm calls are safe to repeat; rows are locked with `FOR UPDATE` during transitions.

## Wish lifecycle

```
draft ──submit──▶ pending_review ──approve──▶ active ──accept offer / target met──▶ fulfilment_pending ──confirm──▶ fulfilled
  │                 │  │                         │  ▲                                  │
  │                 │  └─request changes─▶ changes_requested ─resubmit─┘               └─offer cancelled──▶ active
  │                 └─reject─▶ rejected          │
  └──── withdraw (owner, any open state) ────────┴──▶ withdrawn        admin: suspend ⇄ reinstate (suspended)
```
`approved` (approved but not yet published) is supported for wishes with `publish_on_approval = false`.

## Offer lifecycle

`offered → accepted | declined | cancelled` · `accepted → in_progress → awaiting_confirmation → completed` · any active state → `disputed` → admin resolves to `completed` or `cancelled`.

## Database schema (summary)

| Table | Purpose / notable constraints |
|---|---|
| `profiles` | Public handle + bio only. Case-insensitive unique username. |
| `accounts` | `role` (`user`/`admin`) and `status` (`active`/`restricted`/`suspended`). Read-own; never user-writable. |
| `user_settings` | Anonymity defaults, email preference. Column-level update grants. |
| `categories` | Reference data; admin-managed via RPC. |
| `wishes` | Content, type, method, country, money in minor units, status, anonymity, consent to show when fulfilled, generated `tsvector` for search. |
| `wish_images` | Storage path (`<wish_id>/<uuid>.webp`), max 4 per wish. |
| `wish_status_history` | Every transition with actor role and note. |
| `wish_status_transitions`, `offer_status_transitions` | Allowed moves by actor. |
| `fulfilment_offers` | Giver, anonymity, message, plan, confirmations, dispute fields; idempotency key; partial unique indexes. |
| `offer_messages` | Private coordination thread (accepted offers only). |
| `contributions` | Simulated contributions; `mode='test'` enforced; provider reference never exposed. |
| `refunds` | Future-ready refund records (test mode only today). |
| `notifications` | In-app notifications; `email_sent_at` reserved for an email worker. |
| `reports` | One open report per reporter per wish. |
| `support_requests` | Contact form; admin-only read (plus the signed-in sender). |
| `audit_logs` | Append-only (trigger blocks UPDATE/DELETE). |
| `private.rate_limits` | Fixed-window counters used by `private.check_rate_limit`. |

Migrations: `supabase/migrations/2026103000{01..05}00_*.sql`. Dev seed: `supabase/seed.sql`.

## Pages

Public: `/`, `/wishes`, `/wishes/[id]`, `/how-it-works`, `/safety`, `/legal/{terms,privacy,guidelines}`, `/support`, `/login`, `/signup`, `/forgot-password`, `/reset-password`.
Dashboard: `/dashboard`, `/dashboard/wishes` (tabs: drafts / review / active / fulfilled / closed), `/dashboard/wishes/new`, `/dashboard/wishes/[id]` (manage, offers, contributions, images, history), `/dashboard/wishes/[id]/edit`, `/dashboard/giving`, `/dashboard/offers/[id]` (private thread for giver, wisher or admin), `/dashboard/notifications`, `/dashboard/settings`.
Admin: `/admin` (stats), `/admin/wishes`, `/admin/wishes/[id]`, `/admin/reports`, `/admin/offers` (disputes), `/admin/users`, `/admin/payments`, `/admin/categories`, `/admin/support`, `/admin/audit`.

## Reusable components

`src/components/ui`: `Button`/`ButtonLink`, `Field`/`Input`/`Textarea`/`Select`/`Checkbox`, `Badge`/`TestModeBadge`, `Card`, `Notice`, `ProgressBar`, `EmptyState`, `PageHeader`, `Stat`, `Pagination`, `Dialog` (native `<dialog>`), `ActionForm` + `SubmitButton` (server-action forms with pending/error states). Domain: `WishCard`/`WishGrid`, `SiteHeader` (no-JS mobile menu), `SiteFooter`, `SideNav`, `Tabs`, `WishForm`, offer/contribution/report forms.

## Ambiguities resolved

| Spec point | Decision |
|---|---|
| "Approved" vs "Active" | Approval publishes immediately by default (`approved → active` recorded); an `approved` holding state exists for future "publish later". |
| Wisher vs giver accounts | One account type can do both; dashboards show both roles. Admin is a separate role. |
| Partial contributions vs offers | Determined by fulfilment method: `monetary_contribution` wishes take (simulated) contributions; all others take offers. |
| Physical gift addresses | Never collected. Coordination happens in a private thread with safety guidance (e-gift cards, click-and-collect, pickup points). |
| Reporting without an account | Requires sign-in to deter abuse; anonymous visitors can use the contact form. |
| Editing a live wish | Allowed only with no offers/contributions; sends the wish back to review. |
| Withdrawal with commitments | Allowed except while a delivery awaits confirmation or a dispute is open; open offers are cancelled with notifications; test contributions are reversed. |

## Risks

- Payments, KYC and payouts are regulated activities → kept simulated; see `PAYMENTS.md`.
- Child-safety and fraud risk → mandatory pre-publication moderation, reporting, account restriction, no addresses.
- `SECURITY DEFINER` functions concentrate trust → every one sets `search_path = ''`, authorises explicitly, and is covered by tests.
