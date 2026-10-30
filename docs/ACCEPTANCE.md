# Acceptance checklist (spec §16)

All automated. `I` = `tests/integration/acceptance.test.ts` (real Supabase API), `S` = `tests/integration/storage.test.ts`, `D` = `tests/integration/database.test.ts` (SQL invariants), `E` = `tests/e2e/workflow.spec.ts` (browser), `U` = `tests/unit/lib.test.ts`.

| # | Criterion | Covered by |
|---|---|---|
| 1 | A new user registers | I "1. registration", E (UI sign-up) |
| 2 | The user creates a wish | I "2-3", E (form incl. validation errors) |
| 3 | The wish enters the review queue | I "2-3", E |
| 4 | An administrator approves the wish | I "4" (incl. non-admin refusal, audit row), E |
| 5 | The wish appears in public listings | I "5-6", E (search on Explore) |
| 6 | A second user views the wish | I "5-6", E |
| 7 | The second user submits a fulfilment offer | I "7 & 15", E |
| 8 | The wisher can accept or decline | I "8-10" (only wisher can respond; one accepted offer at a time), E |
| 9 | Giver anonymity respected | I (offers, notifications, thread JSON contain no giver id/username/email), E (page HTML) |
| 10 | Notifications generated correctly | I (submitted, approved, offer received/accepted, cancelled, report update), E |
| 11 | Status changes only through authorised actions | I "11" (role checks, invalid transitions, direct writes refused, two-sided completion), D (trigger), U |
| 12 | Admin investigates a report | I "12" (report, investigate, suspend, resolve, audit) |
| 13 | Unauthorised users cannot read private data | I "13" (anon on 10 tables, cross-user rows, admin RPCs, service-only RPC), D (RLS everywhere, anon EXECUTE allow-list), S (private images) |
| 14 | Users cannot modify another user's wishes | I "14", S (uploads) |
| 15 | Duplicate requests handled safely | I (concurrent + replayed offers, contributions, reports, double accept, duplicate payment results) |
| 16 | Works on mobile, tablet, desktop | E (no horizontal overflow on 8 pages × 3 viewports) + manual screenshots |

Also covered: test-mode contribution flow and live-mode rejection, withdrawal closing offers, account restriction, Storage RLS lifecycle, open-redirect protection, password policy, honeypot.
