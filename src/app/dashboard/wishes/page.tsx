import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MY_WISH_TABS, type MyWishTab } from "@/lib/dashboard";
import { Tabs } from "@/components/dashboard/tabs";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { WISH_STATUS_LABELS, WISH_STATUS_TONE, type WishStatus } from "@/lib/domain";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "My wishes" };

export default async function MyWishesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab: MyWishTab = rawTab && rawTab in MY_WISH_TABS ? (rawTab as MyWishTab) : "all";
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: all } = await supabase
    .from("wishes")
    .select("id, title, status, updated_at, created_at, moderation_note, categories(name, icon), fulfilment_offers(count)")
    .eq("owner_id", viewer.id)
    .order("updated_at", { ascending: false });
  const wishes = all ?? [];
  const filterFor = (t: MyWishTab) => {
    const s = MY_WISH_TABS[t].statuses as readonly WishStatus[] | null;
    return s ? wishes.filter((w) => s.includes(w.status)) : wishes;
  };
  const shown = filterFor(tab);

  return (
    <div>
      <PageHeader title="My wishes" description="Drafts, wishes in review, live wishes and their history." actions={<ButtonLink href="/dashboard/wishes/new" variant="coral">Make a Wish</ButtonLink>} />
      <Tabs label="Filter wishes" active={tab} tabs={(Object.keys(MY_WISH_TABS) as MyWishTab[]).map((k) => ({ key: k, label: MY_WISH_TABS[k].label, href: `/dashboard/wishes?tab=${k}`, count: filterFor(k).length }))} />
      {shown.length ? (
        <ul className="space-y-3">
          {shown.map((w) => {
            const cat = w.categories as unknown as { name: string; icon: string | null } | null;
            const offers = (w.fulfilment_offers as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <li key={w.id}>
                <Link href={`/dashboard/wishes/${w.id}`} className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ivory-300/70 transition hover:ring-plum-200 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-ivory-200 text-lg">{cat?.icon ?? "✨"}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-plum-900">{w.title}</p>
                      <p className="text-xs text-ink-soft">{cat?.name} · updated {timeAgo(w.updated_at)}{offers ? ` · ${offers} offer${offers === 1 ? "" : "s"}` : ""}</p>
                    </div>
                  </div>
                  <Badge tone={WISH_STATUS_TONE[w.status]}>{WISH_STATUS_LABELS[w.status]}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Nothing here yet" action={<ButtonLink href="/dashboard/wishes/new" variant="coral">Make your first wish</ButtonLink>}>
          Wishes you create will appear here, from draft to fulfilled.
        </EmptyState>
      )}
    </div>
  );
}
