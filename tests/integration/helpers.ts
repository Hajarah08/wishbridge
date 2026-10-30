import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/lib/database.types";

export type Client = SupabaseClient<Database>;

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function anonClient(): Client {
  return createClient<Database>(url(), key(), { auth: { persistSession: false, autoRefreshToken: false } });
}

export function serviceClient(): Client {
  return createClient<Database>(url(), process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const PASSWORD = "Testing-Pass-2026";

/** Registers a brand-new user through Supabase Auth and returns a signed-in client. */
export async function registerUser(prefix: string) {
  const client = anonClient();
  const suffix = randomUUID().slice(0, 8);
  const email = `${prefix}-${suffix}@example.test`;
  const username = `${prefix}_${suffix}`;
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD, options: { data: { username } } });
  if (error || !data.user || !data.session) throw new Error(`signUp failed: ${error?.message ?? "no session (are email confirmations disabled locally?)"}`);
  return { client, id: data.user.id, email, username };
}

export async function signIn(email: string, password: string) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`signIn failed: ${error?.message}`);
  return { client, id: data.user.id };
}

export const wishArgs = (overrides: Partial<Database["public"]["Functions"]["create_wish"]["Args"]> = {}) => ({
  p_title: "A starter telescope for our astronomy club",
  p_description: "Our small club meets monthly and would love a beginner telescope to share at star parties.",
  p_category_slug: "community",
  p_wish_type: "physical_gift" as const,
  p_fulfilment_method: "gift_purchase" as const,
  p_country_code: "GB",
  p_currency: "GBP",
  p_estimated_cost_minor: 25000,
  ...overrides,
});
