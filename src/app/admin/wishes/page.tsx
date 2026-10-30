import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { usernamesFor } from "@/lib/admin";
import { Tabs } from "@/components/dashboard/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { WISH_STATUS_LABELS, WISH_STATUS_TONE, type WishStatus } from "@/lib/domain";
import { countryName } from "@/lib/countries";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Wish moderation" };

export default async function AdminWishesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = (sp.status && sp.status in WISH_STATUS_LABELS ? sp.status : sp.status === "all" ? "all" : "pending_review") as WishStatus | "all";
  const supabase = await createClient();
  let query = supabase.from("wishes").select("id, title, status, owner_id, country_code, submitted_at, updated_at, is_featured, categories(name, icon)").limit(100);
  if (status !== "all") query = query.eq("status", status);
  if (sp.q) query = query.ilike("title", `%${sp.q.slice(0, 100).replace(/[%_]/g, "")}%`);
  query = status === "pending_review" ? query.order("submitted_at", { ascending: true }) : query.order("updated_at", { ascending: false });
  const { data } = await query;
  const wishes = data ?? [];
  const names = await usernamesFor(wishes.map((w) => w.owner_id));
  const tabs = ["pending_review", "active", "changes_requested", "fulfilment_pending", "suspended", "rejected", "all"].map((k) => ({
    key: k, label: k === "all" ? "All" : WISH_STATUS_LABELS[k as WishStatus], href: `/admin/wishes?status=${k}`,
  }));
  return (
    <div>
      <PageHeader title="Wish moderation" description={status === "pending_review" ? "Oldest submissions first." : undefined} />
      <Tabs label="Wish status" active={status} tabs={tabs} />
      <form className="mb-4" method="get">
        <input type="hidden" name="status" value={status} />
        <label htmlFor="q" className="sr-only">Search titles</label>
        <input id="q" name="q" defaultValue={sp.q} placeholder="Search titles…" className="h-10 w-full max-w-sm rounded-full border border-ivory-300 bg-white px-4 text-sm" />
      </form>
      {wishes.length ? (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-soft ring-1 ring-ivory-300/70">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-ivory-200 text-xs uppercase tracking-wide text-ink-soft">
              <tr><th className="p-3">Wish</th><th className="p-3">Wisher</th><th className="p-3">Status</th><th className="p-3">Submitted</th></tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {wishes.map((w) => {
                const cat = w.categories as unknown as { name: string; icon: string } | null;
                return (
                  <tr key={w.id} className="hover:bg-ivory-50">
                    <td className="p-3"><Link href={`/admin/wishes/${w.id}`} className="font-semibold text-plum-900 hover:underline">{w.title}</Link><div className="text-xs text-ink-soft">{cat?.icon} {cat?.name} · {countryName(w.country_code)}{w.is_featured ? " · ★ featured" : ""}</div></td>
                    <td className="p-3">@{names[w.owner_id] ?? "unknown"}</td>
                    <td className="p-3"><Badge tone={WISH_STATUS_TONE[w.status]}>{WISH_STATUS_LABELS[w.status]}</Badge></td>
                    <td className="p-3 text-ink-soft">{timeAgo(w.submitted_at ?? w.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="Queue is clear">No wishes with this status.</EmptyState>}
    </div>
  );
}
