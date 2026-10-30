"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionState } from "@/lib/errors";
import { formToObject, supportSchema, usernameSchema, uuidSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const username = usernameSchema.safeParse(formData.get("username"));
  const bio = String(formData.get("bio") ?? "").trim();
  if (!username.success) return { fieldErrors: { username: username.error.issues.map((i) => i.message) } };
  if (bio.length > 280) return { fieldErrors: { bio: ["Keep your bio under 280 characters"] } };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };
  const { error } = await supabase.from("profiles").update({ username: username.data, bio: bio || null }).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { fieldErrors: { username: ["That username is taken"] } };
    return { error: friendlyError(error) };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function updateSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };
  const { error } = await supabase
    .from("user_settings")
    .update({
      anonymous_giving_default: formData.get("anonymousGiving") === "on",
      anonymous_wishing_default: formData.get("anonymousWishing") === "on",
      email_notifications: formData.get("emailNotifications") === "on",
    })
    .eq("user_id", user.id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Privacy settings saved." };
}

export async function markNotificationsRead(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };
  const id = formData.get("id");
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (id) {
    const parsed = uuidSchema.safeParse(id);
    if (!parsed.success) return { error: "Invalid notification." };
    query = query.eq("id", parsed.data);
  }
  const { error } = await query.eq("user_id", user.id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function submitSupportRequest(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("support", 5, 60 * 60_000))) return { error: "Too many messages. Please try again later." };
  const raw = formToObject(formData);
  const parsed = supportSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Please check the highlighted fields.", values: raw };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_support_request", {
    p_contact_email: parsed.data.email,
    p_subject: parsed.data.subject,
    p_message: parsed.data.message,
  });
  if (error) return { error: friendlyError(error) };
  return { ok: true, message: "Thanks — your message has reached our support team. We'll reply by email." };
}
