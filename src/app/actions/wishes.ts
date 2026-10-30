"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/errors";
import { formToObject, uuidSchema, wishFormSchema } from "@/lib/validation";
import { toMinor } from "@/lib/format";
import { ImageError, processWishImage } from "@/lib/image-processing";
import { WISH_IMAGE_BUCKET } from "@/lib/images";

async function uploadImage(wishId: string, file: File, alt: string | null): Promise<string | null> {
  const supabase = await createClient();
  let processed;
  try {
    processed = await processWishImage(file);
  } catch (e) {
    return e instanceof ImageError ? e.message : "Could not process that image.";
  }
  const path = `${wishId}/${processed.filename}`;
  const { error: upErr } = await supabase.storage
    .from(WISH_IMAGE_BUCKET)
    .upload(path, processed.buffer, { contentType: "image/webp", upsert: false });
  if (upErr) return "Could not upload the image. Images can only be added before a wish is approved.";
  const { error } = await supabase.rpc("add_wish_image", {
    p_wish_id: wishId,
    p_storage_path: path,
    p_alt_text: alt ?? undefined,
    p_width: processed.width,
    p_height: processed.height,
  });
  if (error) {
    await supabase.storage.from(WISH_IMAGE_BUCKET).remove([path]);
    return friendlyError(error, "Could not save the image.");
  }
  return null;
}

/** Create (no wishId) or update a wish from the wish form. */
export async function saveWish(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formToObject(formData);
  const parsed = wishFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Please check the highlighted fields.", values: raw };
  }
  const v = parsed.data;
  const wishId = raw.wishId ? uuidSchema.safeParse(raw.wishId) : null;
  if (wishId && !wishId.success) return { error: "Invalid wish." };

  const args = {
    p_title: v.title,
    p_description: v.description,
    p_category_slug: v.category,
    p_wish_type: v.wishType,
    p_fulfilment_method: v.fulfilmentMethod,
    p_country_code: v.country,
    p_currency: v.currency ?? undefined,
    p_estimated_cost_minor: v.currency && v.estimatedCost ? toMinor(v.estimatedCost, v.currency) ?? undefined : undefined,
    p_target_amount_minor: v.currency && v.targetAmount ? toMinor(v.targetAmount, v.currency) ?? undefined : undefined,
    p_additional_info: v.additionalInfo ?? undefined,
    p_wisher_identity: v.anonymous ? ("anonymous" as const) : ("username" as const),
    p_show_when_fulfilled: !!v.showWhenFulfilled,
    p_submit: v.intent === "submit",
  };

  const supabase = await createClient();
  let id: string;
  if (wishId?.success) {
    const { error } = await supabase.rpc("update_wish", { p_wish_id: wishId.data, ...args });
    if (error) return { error: friendlyError(error), values: raw };
    id = wishId.data;
  } else {
    const { data, error } = await supabase.rpc("create_wish", args);
    if (error || !data) return { error: friendlyError(error), values: raw };
    id = data;
  }

  const image = formData.get("image");
  let imageError: string | null = null;
  if (image instanceof File && image.size > 0) {
    imageError = await uploadImage(id, image, typeof raw.imageAlt === "string" ? raw.imageAlt : null);
  }

  revalidatePath("/dashboard", "layout");
  const flag = v.intent === "submit" ? "submitted" : "saved";
  redirect(`/dashboard/wishes/${id}?${flag}=1${imageError ? `&imageError=${encodeURIComponent(imageError)}` : ""}`);
}

export async function addWishImage(_: ActionState, formData: FormData): Promise<ActionState> {
  const wishId = uuidSchema.safeParse(formData.get("wishId"));
  const file = formData.get("image");
  if (!wishId.success) return { error: "Invalid wish." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  const alt = formData.get("imageAlt");
  const err = await uploadImage(wishId.data, file, typeof alt === "string" ? alt : null);
  if (err) return { error: err };
  revalidatePath(`/dashboard/wishes/${wishId.data}`);
  return { ok: true, message: "Image added." };
}

export async function removeWishImage(_: ActionState, formData: FormData): Promise<ActionState> {
  const imageId = uuidSchema.safeParse(formData.get("imageId"));
  const wishId = uuidSchema.safeParse(formData.get("wishId"));
  if (!imageId.success || !wishId.success) return { error: "Invalid image." };
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("remove_wish_image", { p_image_id: imageId.data });
  if (error) return { error: friendlyError(error) };
  if (path) await supabase.storage.from(WISH_IMAGE_BUCKET).remove([path]);
  revalidatePath(`/dashboard/wishes/${wishId.data}`);
  return { ok: true, message: "Image removed." };
}

async function simpleWishRpc(
  fn: "submit_wish" | "publish_wish" | "confirm_wish_fulfilled",
  formData: FormData,
  message: string,
): Promise<ActionState> {
  const wishId = uuidSchema.safeParse(formData.get("wishId"));
  if (!wishId.success) return { error: "Invalid wish." };
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, { p_wish_id: wishId.data });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/wishes/${wishId.data}`);
  return { ok: true, message };
}

export async function submitWish(_: ActionState, formData: FormData) {
  return simpleWishRpc("submit_wish", formData, "Submitted for review. We'll notify you when a moderator has looked at it.");
}

export async function publishWish(_: ActionState, formData: FormData) {
  return simpleWishRpc("publish_wish", formData, "Your wish is live!");
}

export async function confirmWishFulfilled(_: ActionState, formData: FormData) {
  return simpleWishRpc("confirm_wish_fulfilled", formData, "Marked as fulfilled. Supporters have been thanked.");
}

export async function withdrawWish(_: ActionState, formData: FormData): Promise<ActionState> {
  const wishId = uuidSchema.safeParse(formData.get("wishId"));
  if (!wishId.success) return { error: "Invalid wish." };
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000);
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_wish", { p_wish_id: wishId.data, p_reason: reason || undefined });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Your wish has been withdrawn. Anyone with an open offer has been notified." };
}
