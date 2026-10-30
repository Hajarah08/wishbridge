import { randomUUID } from "node:crypto";
import type { CreatePaymentInput, PaymentProvider, PaymentResult, RefundInput } from "./types";

/**
 * TEST MODE ONLY. Pretends a payment succeeded so the contribution workflow can
 * be exercised end to end. It does not contact any bank or card network and
 * must never be presented as real money received or paid.
 */
export class SimulatedProvider implements PaymentProvider {
  readonly id = "simulated";
  readonly mode = "test" as const;
  readonly displayName = "Simulated payments (test mode — no real money)";

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    // Deterministic failure hook for testing: an amount ending in 13 minor units fails.
    const providerReference = `sim_${randomUUID().replace(/-/g, "")}`;
    if (input.amountMinor % 100 === 13) {
      return { status: "failed", providerReference, reason: "Simulated decline (amount ending in .13)" };
    }
    return { status: "succeeded", providerReference };
  }

  async refund(input: RefundInput) {
    void input;
    return { status: "succeeded" as const, providerReference: `sim_refund_${randomUUID().replace(/-/g, "")}` };
  }
}
