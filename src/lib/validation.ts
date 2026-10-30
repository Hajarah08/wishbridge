import { z } from "zod";
import { COUNTRY_CODES, CURRENCIES } from "@/lib/countries";
import { toMinor } from "@/lib/format";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v ? v : undefined));

const amount = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || /^\d{1,7}(\.\d{1,2})?$/.test(v.replace(/,/g, "")), "Enter an amount like 25 or 25.50");

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{3,24}$/, "3–24 characters: letters, numbers and underscores only");

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  acceptTerms: z.literal("on", { message: "Please accept the Terms and Community Guidelines" }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const wishFormSchema = z
  .object({
    title: z.string().trim().min(5, "Title needs at least 5 characters").max(120, "Keep the title under 120 characters"),
    description: z
      .string()
      .trim()
      .min(20, "Tell people a little more (at least 20 characters)")
      .max(5000, "Keep the description under 5000 characters"),
    category: z.string().regex(/^[a-z0-9-]{2,40}$/, "Choose a category"),
    wishType: z.enum(["physical_gift", "financial_goal", "experience", "service", "other"], { message: "Choose a wish type" }),
    fulfilmentMethod: z.enum(["gift_purchase", "monetary_contribution", "gift_card", "service_or_experience", "other"], {
      message: "Choose how the wish can be fulfilled",
    }),
    country: z.string().refine((c) => COUNTRY_CODES.includes(c), "Choose a country"),
    currency: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => v === undefined || CURRENCIES.includes(v), "Choose a currency"),
    estimatedCost: amount,
    targetAmount: amount,
    additionalInfo: optionalText(2000),
    anonymous: z.literal("on").optional(),
    showWhenFulfilled: z.literal("on").optional(),
    intent: z.enum(["draft", "submit"]).default("draft"),
  })
  .superRefine((v, ctx) => {
    if ((v.estimatedCost || v.targetAmount) && !v.currency) {
      ctx.addIssue({ code: "custom", path: ["currency"], message: "Choose a currency for the amount" });
    }
    if (v.fulfilmentMethod === "monetary_contribution" && !v.targetAmount) {
      ctx.addIssue({ code: "custom", path: ["targetAmount"], message: "Contribution wishes need a target amount" });
    }
    if (v.targetAmount && v.currency) {
      const m = toMinor(v.targetAmount, v.currency);
      if (m == null || Number.isNaN(m) || m < 100 || m > 100000000) {
        ctx.addIssue({ code: "custom", path: ["targetAmount"], message: "Target must be between 1 and 1,000,000" });
      }
    }
    if (v.estimatedCost && v.currency) {
      const m = toMinor(v.estimatedCost, v.currency);
      if (m == null || Number.isNaN(m) || m < 1 || m > 100000000) {
        ctx.addIssue({ code: "custom", path: ["estimatedCost"], message: "Estimated cost must be up to 1,000,000" });
      }
    }
  });
export type WishFormValues = z.infer<typeof wishFormSchema>;

export const offerSchema = z.object({
  wishId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  message: optionalText(1000),
  deliveryPlan: optionalText(1000),
  anonymous: z.literal("on").optional(),
});

export const contributionSchema = z.object({
  wishId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  amount: z.string().trim().regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter an amount like 10 or 10.50"),
  message: optionalText(500),
  anonymous: z.literal("on").optional(),
  acknowledgeTestMode: z.literal("on", { message: "Please confirm you understand this is a simulation" }),
});

export const reportSchema = z.object({
  wishId: z.string().uuid(),
  reason: z.enum([
    "fraud_or_scam", "prohibited_item", "harassment", "child_safety",
    "credential_phishing", "personal_information", "spam", "other",
  ], { message: "Choose a reason" }),
  details: optionalText(2000),
});

export const supportSchema = z.object({
  email: emailSchema,
  subject: z.string().trim().min(3, "Add a subject").max(150),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(5000),
  website: z.string().max(0).optional(), // honeypot
});

export const messageSchema = z.object({
  offerId: z.string().uuid(),
  body: z.string().trim().min(1, "Write a message").max(2000, "Keep messages under 2000 characters"),
});

export const uuidSchema = z.string().uuid();

/** Turns FormData into a plain object, keeping only string values. */
export function formToObject(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}
