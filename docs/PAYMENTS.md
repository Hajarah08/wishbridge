# Payments — current state and requirements for going live

## Today (MVP): simulation only
- `PAYMENT_PROVIDER=simulated` is the only accepted value (`src/lib/payments/index.ts` throws otherwise).
- `SimulatedProvider` never contacts a payment network. Amounts ending in `.13` simulate a decline for testing.
- Database CHECK constraints (`contributions_mvp_test_mode_only`, `refunds_mvp_test_mode_only`) reject any row whose `mode` isn't `test` (and, for contributions, provider isn't `simulated`).
- Every UI surface showing amounts carries a **Test mode** badge and "no real money" copy.

## Transaction model (already in place)
1. User → `create_contribution_intent()` creates a `pending` contribution (validated: wish active, not own wish, within remaining amount, idempotency key).
2. Server → `PaymentProvider.createPayment()`.
3. Server (service role) → `record_contribution_result()` sets `succeeded`/`failed` exactly once; repeated calls return the existing status (safe for webhook retries).
4. Target reached → wish moves to `fulfilment_pending`; the wisher confirms fulfilment.
5. Refunds → `refunds` table; withdrawal/suspension reverses test contributions automatically.

Clearly distinguished records: offers (`fulfilment_offers`), confirmed deliveries (`giver_confirmed_at` + `wisher_confirmed_at`), contributions (`contributions.mode`), refunds (`refunds`), disputes (`fulfilment_offers.status = 'disputed'`).

## Do not build without a compliance review
Wallets, pooled balances, holding funds on behalf of users, or paying out to recipients can constitute money transmission / e-money / payment services and may require licences. Prefer a provider model where **funds go directly to the recipient's own verified account** (e.g. Stripe Connect, Adyen for Platforms, PayPal for Marketplaces) so WishBridge never holds funds.

## Checklist before enabling real payments
- [ ] Legal opinion per launch country (payment services, charity/fundraising rules, gift tax, consumer law, sanctions).
- [ ] Provider selected; platform terms signed; supported countries and currencies confirmed (start with a small set, e.g. GBP/EUR/USD).
- [ ] Recipient onboarding with provider-hosted KYC; WishBridge stores only provider account ids, never identity documents or bank details.
- [ ] Payer flow uses provider-hosted checkout/Elements — no card data touches our servers (PCI SAQ A).
- [ ] Webhook endpoint with signature verification, idempotent processing (`record_contribution_result`), and replay protection.
- [ ] Refund and chargeback process, including who bears fees and dispute evidence.
- [ ] Fee disclosure, receipts, and updated Terms/Privacy Policy.
- [ ] Fraud controls: velocity limits, provider risk scoring, manual review thresholds.
- [ ] Remove the `*_test_mode_only` constraints in a reviewed migration; add `live` handling to all reporting; keep test and live data separated.
- [ ] Anonymity copy updated: public identity stays private, but the provider (and WishBridge, where required by law) will know who paid.
