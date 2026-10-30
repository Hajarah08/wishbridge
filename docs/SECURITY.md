# Security checklist

Status key: ✅ implemented and tested · 🟡 implemented, needs production configuration · ⬜ outstanding before launch

## Authentication & sessions
- ✅ Supabase Auth email/password; passwords ≥8 characters, no composition rules, per NIST SP 800-63B (client, server, and Supabase minimum length). Consider enabling Supabase leaked-password protection (Pro plan).
- ✅ Sessions in HTTP-only cookies managed by `@supabase/ssr`; refreshed in `src/proxy.ts`; server code uses `auth.getUser()` (validated), never trusts `getSession()` alone.
- ✅ Account recovery: `/forgot-password` → email link → `/auth/confirm` → `/reset-password`. Responses don't reveal whether an email exists.
- ✅ Open-redirect protection on `next` parameters (`safeNext`, unit-tested).
- 🟡 Enable email confirmation in the hosted project (disabled locally for convenience) and configure custom SMTP.
- ⬜ Consider MFA for administrators (Supabase TOTP).

## Authorisation
- ✅ Row Level Security on every public table (test asserts none are missing).
- ✅ Table privileges revoked from `anon`/`authenticated`; only `SELECT` (+ narrow column `UPDATE` on own profile/settings/notification read state) re-granted.
- ✅ All writes via `SECURITY DEFINER` functions with `search_path = ''`, explicit caller checks, and per-actor status transitions.
- ✅ `EXECUTE` revoked by default; `anon` can run only `public_stats`, `username_available`, `submit_support_request` (tested).
- ✅ Admin role only grantable via SQL/`scripts/make-admin.mjs` with the server secret; admins cannot change their own status.
- ✅ Admin pages gated server-side (`requireAdmin`) **and** every admin RPC re-checks `private.require_admin()`.
- ✅ Restricted/suspended accounts blocked from creating wishes, offers, contributions.

## Privacy & anonymity
- ✅ Email/phone/payment data never copied into public tables; public views expose no account ids (tested).
- ✅ Wishers never receive giver ids via API, notifications, page HTML or offer threads (integration + E2E tests).
- ✅ Image EXIF/GPS stripped by re-encoding; private bucket; signed URLs (1 h) gated by Storage RLS.
- ✅ Only country is shown; addresses are never requested.

## Input & content
- ✅ Zod validation in server actions; SQL length/format/range checks; React escapes all user content (no `dangerouslySetInnerHTML`).
- ✅ Uploads: size limit (5 MB, also bucket-level), decode-based type check (JPEG/PNG/WebP), pixel-count limit, re-encode to WebP.
- ✅ Safe error messages: only deliberate SQL messages (known SQLSTATEs) are shown; everything else is generic.

## Abuse & integrity
- ✅ Durable rate limits in SQL (wish creation, offers, contributions, reports, messages, support).
- 🟡 In-memory per-instance limiter on sign-in/sign-up/reset/contact. Replace with a shared store (e.g. Upstash Redis) on multi-instance hosting. Supabase Auth also enforces its own limits.
- ✅ Idempotency keys + unique indexes + row locks prevent duplicate offers, contributions and double-processing; provider results are recorded once.
- ✅ Append-only audit log for admin and dispute actions.
- ✅ Honeypot on the contact form.

## Transport & headers
- ✅ CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS (production).
- ✅ CSRF: Server Actions are POST-only with Next.js origin checking; auth cookies are `SameSite=Lax`.
- ⬜ Move to nonce-based CSP to drop `'unsafe-inline'` for scripts.

## Secrets
- ✅ Only `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key reach the browser. `SUPABASE_SECRET_KEY` is imported only by `server-only` modules.
- ✅ `.env*` git-ignored (except `.env.example`).

## Before launch
- ⬜ Independent penetration test and Supabase Security Advisor review (expect deliberate "security definer view" notices for the public views).
- ⬜ Backups/PITR, log retention, incident-response runbook, abuse-reporting contact.
- ⬜ Scheduled cleanup of `private.rate_limits` (e.g. `pg_cron` daily delete of windows older than 1 day).
