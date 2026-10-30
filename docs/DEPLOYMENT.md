# Deployment guide

## 1. Supabase (hosted)
1. Create a project at supabase.com (choose a region near your users).
2. Link and push migrations from your machine:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   Do **not** run `supabase/seed.sql` against production (demo users and passwords).
3. Auth settings (Dashboard → Authentication):
   - Site URL: `https://your-domain`; Redirect URLs: `https://your-domain/auth/confirm`.
   - Enable **Confirm email**; minimum password length 8, no password requirements.
   - Configure custom SMTP for reliable delivery.
   - Email templates: point confirmation and recovery links at `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/dashboard` (recovery redirects to `/reset-password` automatically).
4. Storage: the `wish-images` bucket and its policies are created by migrations.
5. Create the first administrator: sign up through the site, then run
   ```bash
   npm run make-admin -- you@example.com
   ```
   with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` set for the production project.

## 2. Web app (e.g. Vercel, or any Node 20+ host)
Environment variables:

| Variable | Exposed to browser | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Publishable (or legacy anon) key |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://your-domain` |
| `SUPABASE_SECRET_KEY` | **no** | Secret (or legacy service_role) key — server only |
| `PAYMENT_PROVIDER` | no | `simulated` |

Build: `npm ci && npm run build`; start: `npm run start`. Self-hosting: run behind HTTPS (HSTS is sent in production).

## 3. Post-deploy checks
- `npm run test:e2e` with `E2E_BASE_URL=https://staging.your-domain` against a **staging** project seeded with test data.
- Supabase Security Advisor and Performance Advisor.
- Confirm sign-up email, password reset, image upload, and admin access on staging.

## 4. Operations
- Enable Point-in-Time Recovery / backups.
- Schedule rate-limit cleanup (`pg_cron`): `delete from private.rate_limits where window_start < now() - interval '1 day';`
- Add a shared rate-limit store if running more than one app instance (see SECURITY.md).
- Email notifications: implement a worker that sends `notifications` rows where `email_sent_at is null` and the user opted in (see `src/lib/notifications/email.ts`).
