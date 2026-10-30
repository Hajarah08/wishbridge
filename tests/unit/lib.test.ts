import { describe, expect, it } from "vitest";
import { wishFormSchema, signUpSchema, passwordSchema, contributionSchema, supportSchema } from "@/lib/validation";
import { formatMoney, toMinor, fromMinor } from "@/lib/format";
import { safeNext } from "@/lib/safe-redirect";
import { canTransition } from "@/lib/domain";
import { friendlyError } from "@/lib/errors";
import { SimulatedProvider } from "@/lib/payments/simulated";

const validWish = {
  title: "A bicycle for my commute",
  description: "My commute is 6km each way and a secondhand bike would save me two hours a day.",
  category: "home",
  wishType: "physical_gift",
  fulfilmentMethod: "gift_purchase",
  country: "GB",
  intent: "submit",
};

describe("wish form validation", () => {
  it("accepts a valid wish", () => {
    expect(wishFormSchema.safeParse(validWish).success).toBe(true);
  });
  it.each([
    ["title", "Hi"],
    ["description", "Too short"],
    ["country", "XX"],
    ["wishType", "bribe"],
  ])("rejects invalid %s", (field, value) => {
    expect(wishFormSchema.safeParse({ ...validWish, [field]: value }).success).toBe(false);
  });
  it("requires a target and currency for contribution wishes", () => {
    const r = wishFormSchema.safeParse({ ...validWish, fulfilmentMethod: "monetary_contribution" });
    expect(r.success).toBe(false);
    const r2 = wishFormSchema.safeParse({ ...validWish, fulfilmentMethod: "monetary_contribution", targetAmount: "100" });
    expect(r2.error?.flatten().fieldErrors.currency).toBeTruthy();
    expect(wishFormSchema.safeParse({ ...validWish, fulfilmentMethod: "monetary_contribution", targetAmount: "100", currency: "GBP" }).success).toBe(true);
  });
  it("rejects malformed and out-of-range amounts", () => {
    expect(wishFormSchema.safeParse({ ...validWish, estimatedCost: "12.345", currency: "GBP" }).success).toBe(false);
    expect(wishFormSchema.safeParse({ ...validWish, targetAmount: "0.5", currency: "GBP" }).success).toBe(false);
    expect(wishFormSchema.safeParse({ ...validWish, estimatedCost: "-5", currency: "GBP" }).success).toBe(false);
  });
});

describe("account validation", () => {
  it("enforces password strength", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("seven77").success).toBe(false);
    expect(passwordSchema.safeParse("sunflower").success).toBe(true);
    expect(passwordSchema.safeParse("Strong-Pass-2026").success).toBe(true);
  });
  it("requires accepting terms and a safe username", () => {
    const base = { email: "a@b.co", password: "Strong-Pass-2026", username: "kind_one" };
    expect(signUpSchema.safeParse(base).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, acceptTerms: "on" }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...base, acceptTerms: "on", username: "<script>" }).success).toBe(false);
  });
  it("contribution requires test-mode acknowledgement", () => {
    const c = { wishId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), amount: "10" };
    expect(contributionSchema.safeParse(c).success).toBe(false);
    expect(contributionSchema.safeParse({ ...c, acknowledgeTestMode: "on" }).success).toBe(true);
  });
  it("support honeypot rejects bots", () => {
    const s = { email: "a@b.co", subject: "Help", message: "Please help me with my account" };
    expect(supportSchema.safeParse(s).success).toBe(true);
    expect(supportSchema.safeParse({ ...s, website: "spam.example" }).success).toBe(false);
  });
});

describe("money", () => {
  it("converts to and from minor units", () => {
    expect(toMinor("12.34", "GBP")).toBe(1234);
    expect(toMinor("1,000", "USD")).toBe(100000);
    expect(toMinor("500", "JPY")).toBe(500);
    expect(fromMinor(1250, "EUR")).toBe("12.5");
  });
  it("formats currency", () => {
    expect(formatMoney(45000, "GBP")).toBe("£450");
    expect(formatMoney(null, "GBP")).toBe("");
  });
});

describe("security helpers", () => {
  it("blocks open redirects", () => {
    expect(safeNext("/dashboard/wishes")).toBe("/dashboard/wishes");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
    expect(safeNext(undefined, "/x")).toBe("/x");
  });
  it("only surfaces deliberate database messages", () => {
    expect(friendlyError({ code: "22023", message: "Title too short" })).toBe("Title too short");
    expect(friendlyError({ code: "XX000", message: "internal: relation secret_table" })).toMatch(/Something went wrong/);
  });
});

describe("status machine mirror", () => {
  it("allows only defined transitions", () => {
    expect(canTransition("pending_review", "active", "admin")).toBe(true);
    expect(canTransition("pending_review", "active", "owner")).toBe(false);
    expect(canTransition("draft", "fulfilled", "owner")).toBe(false);
    expect(canTransition("withdrawn", "active", "admin")).toBe(false);
  });
});

describe("simulated payment provider", () => {
  it("is test mode and never real", async () => {
    const p = new SimulatedProvider();
    expect(p.mode).toBe("test");
    const ok = await p.createPayment({ contributionId: "c", amountMinor: 1000, currency: "GBP", idempotencyKey: "k", description: "d" });
    expect(ok.status).toBe("succeeded");
    expect(ok.providerReference).toMatch(/^sim_/);
    const fail = await p.createPayment({ contributionId: "c", amountMinor: 1013, currency: "GBP", idempotencyKey: "k", description: "d" });
    expect(fail.status).toBe("failed");
  });
});

describe("environment URL normalisation", async () => {
  const { normalizeUrl } = await import("@/lib/env");
  it("repairs common dashboard paste mistakes", () => {
    expect(normalizeUrl(" wishbridge.vercel.app/ ")).toBe("https://wishbridge.vercel.app");
    expect(normalizeUrl('"https://x.vercel.app"')).toBe("https://x.vercel.app");
    expect(normalizeUrl("https://abc.supabase.co/rest/v1/", { stripApiPath: true })).toBe("https://abc.supabase.co");
    expect(normalizeUrl("http://127.0.0.1:54321")).toBe("http://127.0.0.1:54321");
    expect(normalizeUrl("not a url at all")).toBe("");
    expect(normalizeUrl(undefined)).toBe("");
  });
});
