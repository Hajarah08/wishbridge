import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Username lookup for admin screens (profiles RLS allows admins to read all). */
export async function usernamesFor(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return {} as Record<string, string>;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, username").in("id", unique);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.username])) as Record<string, string>;
}
