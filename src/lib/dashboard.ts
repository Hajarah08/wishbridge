import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCategoryOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("slug, name, icon").eq("is_active", true).order("sort_order");
  return data ?? [];
}

export const MY_WISH_TABS = {
  all: { label: "All", statuses: null },
  drafts: { label: "Drafts", statuses: ["draft", "changes_requested"] },
  review: { label: "Pending review", statuses: ["pending_review", "approved"] },
  active: { label: "Active", statuses: ["active", "fulfilment_pending"] },
  fulfilled: { label: "Fulfilled", statuses: ["fulfilled"] },
  closed: { label: "Closed", statuses: ["withdrawn", "rejected", "suspended"] },
} as const;
export type MyWishTab = keyof typeof MY_WISH_TABS;
