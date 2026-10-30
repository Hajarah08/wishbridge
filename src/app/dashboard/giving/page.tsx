import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { Tabs } from "@/components/dashboard/tabs";
import { Badge, TestModeBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { OFFER_STATUS_LABELS, OFFER_STATUS_TONE, type OfferStatus } from "@/lib/domain";
import { formatMoney, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "My giving" };

const TABS = {
  all: "All activity",
  offers: "Open offers",
  supported: "Wishes supported",
  fulfilled: "Fulfilled",
} as const;
type Tab = keyof typeof TABS;

export default async function GivingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireViewer();
  const { tab: raw } = await searchParams;
  const tab: Tab = raw && raw in TABS ? (raw as Tab) : "all";
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_giving");
  const items = data ?? [];
  const filters: Record<Tab, (i: (typeof items)[number]) => boolean> = {
    all: () => true,
    offers: (i) => i.kind === "offer" && ["offered", "accepted", "in_progress", "awaiting_confirmation", "disputed"].includes(i.status),
    supported: (i) => (i.kind === "offer" && i.status !== "declined" && i.status !== "cancelled") || (i.kind === "contribution" && i.status === "succeeded"),
    fulfilled: (i) => i.status === "completed" || (i.kind === "contribution" && i.wish_status === "fulfilled"),
  };
  const shown = items.filter(filters[tab]);

  return (
    <div>
      <PageHeader title="My giving" description="Your offers and test-mode contributions. This history is private to you."
        actions={<ButtonLink href="/dashboard/settings" variant="secondary" size="sm">Anonymous giving settings</ButtonLink>} />
      <Tabs label="Filter giving" active={tab} tabs={(Object.keys(TABS) as Tab[]).map((k) => ({ key: k, label: TABS[k], href: `/dashboard/giving?tab=${k}`, count: items.filter(filters[k]).length }))} />
      {shown.length ? (
        <ul className="space-y-3">
          {shown.map((i) => (
            <li key={`${i.kind}-${i.id}`} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ivory-300/70">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{i.kind === "offer" ? "Fulfilment offer" : "Contribution"} · {timeAgo(i.created_at)}</p>
                  <p className="truncate font-semibold text-plum-900">{i.wish_title}</p>
                  <p className="text-xs text-ink-soft">For {i.wisher_display} · {i.is_anonymous ? "You gave anonymously" : "Your username is shown"}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {i.kind === "contribution" ? (
                    <>
                      <span className="font-semibold">{formatMoney(i.amount_minor, i.currency)}</span>
                      <TestModeBadge />
                      <Badge tone={i.status === "succeeded" ? "success" : "neutral"}>{i.status}</Badge>
                    </>
                  ) : (
                    <>
                      <Badge tone={OFFER_STATUS_TONE[i.status as OfferStatus]}>{OFFER_STATUS_LABELS[i.status as OfferStatus]}</Badge>
                      <Link href={`/dashboard/offers/${i.id}`} className="text-sm font-semibold text-coral-700 hover:underline">Open →</Link>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No giving activity here yet" action={<ButtonLink href="/wishes" variant="coral">Explore wishes</ButtonLink>}>
          When you offer to fulfil a wish or make a test contribution, it will appear here.
        </EmptyState>
      )}
    </div>
  );
}
