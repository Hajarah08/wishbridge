/**
 * Payment-provider abstraction.
 *
 * The MVP ships only SimulatedProvider, which never contacts a payment network
 * and never moves money. A real provider must implement this interface and be
 * wired up only after the requirements in docs/PAYMENTS.md are met (legal
 * review, KYC/AML approach, refunds, disputes, webhooks).
 */
export type PaymentMode = "test" | "live";

export interface CreatePaymentInput {
  contributionId: string;
  amountMinor: number;
  currency: string;
  /** Opaque idempotency key; providers must deduplicate on it. */
  idempotencyKey: string;
  description: string;
}

export type PaymentResult =
  | { status: "succeeded"; providerReference: string }
  | { status: "failed"; providerReference: string; reason: string }
  /** Real providers usually confirm asynchronously via webhook. */
  | { status: "pending"; providerReference: string; clientAction?: { type: "redirect"; url: string } };

export interface RefundInput {
  providerReference: string;
  amountMinor: number;
  currency: string;
  reason: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly mode: PaymentMode;
  readonly displayName: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  refund(input: RefundInput): Promise<{ status: "succeeded" | "failed" | "pending"; providerReference: string }>;
  /** Verifies and parses a webhook. Simulated provider has none. */
  parseWebhook?(rawBody: string, signature: string | null): Promise<unknown>;
}
