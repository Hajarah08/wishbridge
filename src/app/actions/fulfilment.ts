"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { friendlyError, type ActionState } from "@/lib/errors";
import { contributionSchema, formToObject, messageSchema, offerSchema, reportSchema, uuidSchema } from "@/lib/validation";
import { formatMoney, toMinor } from "@/lib/format";
import { getPaymentProvider } from "@/lib/payments";

export async function makeOffer(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formToObject(formData);
  const parsed = offerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Please check your offer.", values: raw };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to make an offer." };
  const { error } = await supabase.rpc("make_offer", {
    p_wish_id: parsed.data.wishId,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_message: parsed.data.message,
    p_delivery_plan: parsed.data.deliveryPlan,
    p_is_anonymous: !!parsed.data.anonymous,
  });
  if (error) return { error: friendlyError(error), values: raw };
  revalidatePath(`/wishes/${parsed.data.wishId}`);
  return { ok: true, message: "Offer sent! The wisher will be notified and can accept or decline. Track it in your giving dashboard." };
}

export async function respondToOffer(_: ActionState, formData: FormData): Promise<ActionState> {
  const offerId = uuidSchema.safeParse(formData.get("offerId"));
  const decision = formData.get("decision");
  if (!offerId.success || (decision !== "accept" && decision !== "decline")) return { error: "Invalid request." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_offer", {
    p_offer_id: offerId.data,
    p_accept: decision === "accept",
    p_note: note || undefined,
  });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: decision === "accept" ? "Offer accepted. Coordinate safely through the private offer page." : "Offer declined." };
}

const OFFER_ACTIONS = new Set(["start", "mark_delivered", "confirm_received", "cancel", "dispute"]);

export async function offerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const offerId = uuidSchema.safeParse(formData.get("offerId"));
  const action = String(formData.get("action") ?? "");
  if (!offerId.success || !OFFER_ACTIONS.has(action)) return { error: "Invalid request." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  const supabase = await createClient();
  const { error } = await supabase.rpc("offer_action", { p_offer_id: offerId.data, p_action: action, p_note: note || undefined });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/dashboard", "layout");
  const messages: Record<string, string> = {
    start: "Marked as in progress.",
    mark_delivered: "Marked as delivered. The wisher will be asked to confirm.",
    confirm_received: "Thank you for confirming — your wish is fulfilled!",
    cancel: "The offer was cancelled.",
    dispute: "A dispute was opened. A moderator will review it.",
  };
  return { ok: true, message: messages[action] };
}

export async function sendOfferMessage(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = messageSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_offer_message", { p_offer_id: parsed.data.offerId, p_body: parsed.data.body });
  if (error) return { error: friendlyError(error) };
  revalidatePath(`/dashboard/offers/${parsed.data.offerId}`);
  return { ok: true };
}

/**
 * TEST-MODE contribution. Step 1 (as the user): create a pending intent, which
 * the database validates. Step 2 (server only): ask the payment provider — the
 * SimulatedProvider here — and record the outcome with the service role.
 */
export async function contribute(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formToObject(formData);
  const parsed = contributionSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Please check the form.", values: raw };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to contribute." };

  const { data: wish } = await supabase.from("public_wishes").select("currency, title").eq("id", parsed.data.wishId).single();
  if (!wish?.currency) return { error: "This wish is not accepting contributions." };
  const amountMinor = toMinor(parsed.data.amount, wish.currency);
  if (!amountMinor || Number.isNaN(amountMinor)) return { fieldErrors: { amount: ["Enter a valid amount"] } };

  const { data: contributionId, error } = await supabase.rpc("create_contribution_intent", {
    p_wish_id: parsed.data.wishId,
    p_amount_minor: amountMinor,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_is_anonymous: !!parsed.data.anonymous,
    p_message: parsed.data.message,
  });
  if (error || !contributionId) return { error: friendlyError(error), values: raw };

  const provider = getPaymentProvider();
  const result = await provider.createPayment({
    contributionId,
    amountMinor,
    currency: wish.currency,
    idempotencyKey: parsed.data.idempotencyKey,
    description: `WishBridge test contribution: ${wish.title}`,
  });
  if (result.status === "pending") {
    return { ok: true, message: "Payment pending confirmation." };
  }
  const service = createServiceClient();
  const { data: finalStatus, error: recErr } = await service.rpc("record_contribution_result", {
    p_contribution_id: contributionId,
    p_succeeded: result.status === "succeeded",
    p_provider_reference: result.providerReference,
  });
  if (recErr) return { error: friendlyError(recErr) };
  revalidatePath(`/wishes/${parsed.data.wishId}`);
  if (finalStatus === "failed") return { error: "The simulated payment was declined (test mode). Try a different amount." };
  return {
    ok: true,
    message: `Simulated contribution of ${formatMoney(amountMinor, wish.currency)} recorded. This is TEST MODE — no real money moved.`,
  };
}

export async function reportWish(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reportSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Please choose a reason." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to report a wish." };
  const { error } = await supabase.rpc("report_wish", {
    p_wish_id: parsed.data.wishId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details,
  });
  if (error) return { error: friendlyError(error) };
  return { ok: true, message: "Thank you. Our moderation team will review this wish." };
}
