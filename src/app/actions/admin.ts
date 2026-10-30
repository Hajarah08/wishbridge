"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { friendlyError, type ActionState } from "@/lib/errors";
import { uuidSchema } from "@/lib/validation";

// Every admin action re-checks admin status here AND inside the SQL function.

const note = (fd: FormData, key = "note") => String(fd.get(key) ?? "").trim().slice(0, 2000) || undefined;

function done(paths: string[], message: string): ActionState {
  paths.forEach((p) => revalidatePath(p, "layout"));
  return { ok: true, message };
}

export async function moderateWish(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const wishId = uuidSchema.safeParse(fd.get("wishId"));
  const action = String(fd.get("action") ?? "");
  if (!wishId.success || !["approve", "request_changes", "reject", "suspend", "reinstate"].includes(action)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_moderate_wish", { p_wish_id: wishId.data, p_action: action, p_note: note(fd) });
  if (error) return { error: friendlyError(error) };
  return done(["/admin", "/wishes", "/"], `Done — wish is now ${String(data).replace(/_/g, " ")}.`);
}

export async function setFeatured(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const wishId = uuidSchema.safeParse(fd.get("wishId"));
  if (!wishId.success) return { error: "Invalid request." };
  const featured = fd.get("featured") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_featured", { p_wish_id: wishId.data, p_featured: featured });
  if (error) return { error: friendlyError(error) };
  return done(["/admin", "/"], featured ? "Wish featured on the homepage." : "Wish removed from featured.");
}

export async function setAccountStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = uuidSchema.safeParse(fd.get("userId"));
  const status = String(fd.get("status") ?? "");
  if (!userId.success || !["active", "restricted", "suspended"].includes(status)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_account_status", {
    p_user_id: userId.data,
    p_status: status as "active" | "restricted" | "suspended",
    p_reason: note(fd, "reason"),
  });
  if (error) return { error: friendlyError(error) };
  return done(["/admin"], `Account set to ${status}.`);
}

export async function updateReport(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = uuidSchema.safeParse(fd.get("reportId"));
  const status = String(fd.get("status") ?? "");
  if (!id.success || !["open", "investigating", "resolved", "dismissed"].includes(status)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_report", {
    p_report_id: id.data,
    p_status: status as "open" | "investigating" | "resolved" | "dismissed",
    p_note: note(fd),
  });
  if (error) return { error: friendlyError(error) };
  return done(["/admin"], `Report marked ${status}.`);
}

export async function resolveDispute(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = uuidSchema.safeParse(fd.get("offerId"));
  const outcome = String(fd.get("outcome") ?? "");
  if (!id.success || !["completed", "cancelled"].includes(outcome)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_dispute", { p_offer_id: id.data, p_outcome: outcome, p_note: note(fd) ?? "" });
  if (error) return { error: friendlyError(error) };
  return done(["/admin"], `Dispute resolved as ${outcome}.`);
}

export async function upsertCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const idRaw = fd.get("id");
  const id = idRaw ? Number(idRaw) : null;
  if (id !== null && (!Number.isInteger(id) || id <= 0)) return { error: "Invalid category." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_upsert_category", {
    p_id: id as number,
    p_slug: String(fd.get("slug") ?? "").trim().toLowerCase(),
    p_name: String(fd.get("name") ?? "").trim(),
    p_description: String(fd.get("description") ?? "").trim(),
    p_icon: String(fd.get("icon") ?? "").trim(),
    p_is_active: fd.get("isActive") === "on",
    p_sort_order: Number(fd.get("sortOrder") ?? 0) || 0,
  });
  if (error) return { error: friendlyError(error) };
  return done(["/admin/categories", "/wishes"], id ? "Category updated." : "Category created.");
}

export async function updateSupport(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = uuidSchema.safeParse(fd.get("id"));
  const status = String(fd.get("status") ?? "");
  if (!id.success || !["open", "in_progress", "closed"].includes(status)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_support", {
    p_id: id.data,
    p_status: status as "open" | "in_progress" | "closed",
    p_note: note(fd),
  });
  if (error) return { error: friendlyError(error) };
  return done(["/admin/support"], "Support request updated.");
}

export async function refundTestContribution(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = uuidSchema.safeParse(fd.get("contributionId"));
  if (!id.success) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_refund_test_contribution", { p_contribution_id: id.data, p_reason: note(fd, "reason") ?? "" });
  if (error) return { error: friendlyError(error) };
  return done(["/admin/payments"], "Test contribution reversed (simulation).");
}
