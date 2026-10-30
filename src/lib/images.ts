import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const WISH_IMAGE_BUCKET = "wish-images";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

/**
 * Signs many storage paths in one request. Storage RLS decides whether the
 * caller may read each object (public wish, owner, or admin).
 */
export async function signImagePaths(
  supabase: SupabaseClient<Database>,
  paths: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage.from(WISH_IMAGE_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}
