import "server-only";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { signImagePaths } from "@/lib/images";

export type PublicWish = Database["public"]["Views"]["public_wishes"]["Row"];
export type PublicWishWithImage = PublicWish & { cover_url: string | null };

// Columns safe for listings (search vector excluded from payloads).
export const PUBLIC_WISH_COLUMNS =
  "id,title,description,wish_type,fulfilment_method,country_code,currency,estimated_cost_minor,target_amount_minor,status,is_featured,published_at,fulfilled_at,category_slug,category_name,category_icon,wisher_username,test_pledged_minor,contribution_count,progress_percent,cover_image_path";

export const PAGE_SIZE = 12;

export type ExploreFilters = {
  q?: string;
  category?: string;
  country?: string;
  status?: "open" | "in_progress" | "fulfilled" | "all";
  sort?: "newest" | "oldest" | "closest" | "recently_fulfilled";
  page?: number;
};

export async function attachCovers(wishes: PublicWish[]): Promise<PublicWishWithImage[]> {
  const supabase = await createClient();
  const urls = await signImagePaths(supabase, wishes.map((w) => w.cover_image_path));
  return wishes.map((w) => ({ ...w, cover_url: w.cover_image_path ? urls[w.cover_image_path] ?? null : null }));
}

export async function listPublicWishes(filters: ExploreFilters) {
  const supabase = await createClient();
  const page = Math.max(1, Math.min(500, filters.page ?? 1));
  let query = supabase.from("public_wishes").select(PUBLIC_WISH_COLUMNS, { count: "exact" });

  const q = filters.q?.trim().slice(0, 100);
  if (q) query = query.textSearch("search", q, { type: "websearch", config: "english" });
  if (filters.category) query = query.eq("category_slug", filters.category);
  if (filters.country) query = query.eq("country_code", filters.country);

  const status = filters.status ?? "open";
  if (status === "open") query = query.eq("status", "active");
  else if (status === "in_progress") query = query.eq("status", "fulfilment_pending");
  else if (status === "fulfilled") query = query.eq("status", "fulfilled");

  switch (filters.sort) {
    case "oldest":
      query = query.order("published_at", { ascending: true });
      break;
    case "closest":
      query = query.order("progress_percent", { ascending: false, nullsFirst: false }).order("published_at", { ascending: false });
      break;
    case "recently_fulfilled":
      query = query.order("fulfilled_at", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("published_at", { ascending: false });
  }
  query = query.order("id");

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error("Could not load wishes");
  const wishes = await attachCovers((data ?? []) as PublicWish[]);
  return { wishes, total: count ?? 0, page, totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)) };
}

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, icon, description, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}
