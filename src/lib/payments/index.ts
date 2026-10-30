import "server-only";
import { SimulatedProvider } from "./simulated";
import type { PaymentProvider } from "./types";

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER ?? "simulated";
  if (configured !== "simulated") {
    // Deliberately refuse: live payments require the compliance work in docs/PAYMENTS.md.
    throw new Error(`Payment provider "${configured}" is not available in this build. Only "simulated" is supported.`);
  }
  return new SimulatedProvider();
}

export type { PaymentProvider } from "./types";
