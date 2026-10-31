"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, formToObject, passwordSchema, signInSchema, signUpSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-redirect";
import { publicEnv } from "@/lib/env";

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

export async function signUp(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("signup", 5, 10 * 60_000))) return { error: TOO_MANY };
  const raw = formToObject(formData);
  const values = { email: raw.email ?? "", username: raw.username ?? "" };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Please check the highlighted fields.", values };

  const supabase = await createClient();
  const { data: available } = await supabase.rpc("username_available", { p_username: parsed.data.username });
  if (available === false) return { fieldErrors: { username: ["That username is taken"] }, error: "Please choose another username.", values };

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { username: parsed.data.username },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/dashboard`,
    },
  });
  if (error) {
    // Do not reveal whether an email is already registered.
    if (/password/i.test(error.message)) return { fieldErrors: { password: [error.message] }, error: "Please choose a stronger password.", values };
    return { error: "We couldn't create your account. Please check your details and try again.", values };
  }
  if (!data.session) {
    return { ok: true, message: "Check your inbox to confirm your email address, then sign in. The link is valid for 1 hour — if it expires, you can resend it from the sign-in page." };
  }
  redirect(safeNext(formData.get("next"), "/dashboard?welcome=1"));
}

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("signin", 10, 10 * 60_000))) return { error: TOO_MANY };
  const raw = formToObject(formData);
  const values = { email: raw.email ?? "" };
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Please check the highlighted fields.", values };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "Please confirm your email address first. Can't find the email, or has the link expired? Use “Resend confirmation email” below.", values };
    return { error: "Incorrect email or password.", values };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("reset", 5, 15 * 60_000))) return { error: TOO_MANY };
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: ["Enter a valid email address"] } };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/reset-password`,
  });
  // Same response whether or not the account exists.
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues.map((i) => i.message) } };
  if (formData.get("password") !== formData.get("confirm")) return { fieldErrors: { confirm: ["Passwords do not match"] } };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: /different/i.test(error.message) ? "Choose a password you haven't used before." : "Could not update your password." };
  return { ok: true, message: "Your password has been updated." };
}

export async function resendConfirmation(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit("resend", 3, 10 * 60_000))) return { error: TOO_MANY };
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: ["Enter a valid email address"] } };
  const supabase = await createClient();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/dashboard` },
  });
  // Same response whether or not the account exists or is already confirmed.
  return { ok: true, message: "If that account is waiting for confirmation, a new link is on its way. Check your spam folder too." };
}
