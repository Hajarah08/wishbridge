import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { usernamesFor } from "@/lib/admin";
import { Tabs } from "@/components/dashboard/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { resolveDispute } from "@/app/actions/admin";
import { OFFER_STATUS_LABELS, OFFER_STATUS_TONE, type OfferStatus } from "@/lib/domain";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Fulfilment activity" };

export default async function AdminOffersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (sp.status && sp.status in OFFER_STATUS_LABELS ? sp.status : sp.status === "all" ? "all" : "disputed") as OfferStatus | "all";
  const supabase = await createClient();
  let q = supabase.from("fulfilment_offers").select("id, wish_id, giver_id, status, is_anonymous, dispute_reason, disputed_by, resolution_note, giver_confirmed_at, wisher_confirmed_at, created_at, updated_at, wishes(title, owner_id)").order("updated_at", { ascending: false }).limit(100);
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  const offers = data ?? [];
  const names = await usernamesFor(offers.flatMap((o) => [o.giver_id, (o.wishes as unknown as { owner_id: string } | null)?.owner_id]));
  return (
    <div>
      <PageHeader title="Fulfilment activity" description="Review offers and resolve disputes. Completion normally requires both parties to confirm." />
      <Tabs label="Offer status" active={status} tabs={["disputed", "offered", "accepted", "in_progress", "awaiting_confirmation", "completed", "cancelled", "all"].map((k) => ({ key: k, label: k === "all" ? "All" : OFFER_STATUS_LABELS[k as OfferStatus], href: `/admin/offers?status=${k}` }))} />
      {offers.length ? (
        <ul className="space-y-3">
          {offers.map((o) => {
            const wish = o.wishes as unknown as { title: string; owner_id: string } | null;
            return (
              <li key={o.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ivory-300/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-plum-900"><Link href={`/admin/wishes/${o.wish_id}`} className="hover:underline">{wish?.title}</Link></p>
                  <Badge tone={OFFER_STATUS_TONE[o.status]}>{OFFER_STATUS_LABELS[o.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  Giver @{names[o.giver_id]}{o.is_anonymous ? " (anonymous to wisher)" : ""} → wisher @{names[wish?.owner_id ?? ""]} · updated {timeAgo(o.updated_at)}
                  {o.giver_confirmed_at ? " · giver confirmed" : ""}{o.wisher_confirmed_at ? " · wisher confirmed" : ""}
                </p>
                {o.dispute_reason ? <Notice tone="danger" className="mt-2" title={`Dispute by ${o.disputed_by}`}>{o.dispute_reason}</Notice> : null}
                {o.resolution_note ? <p className="mt-2 text-sm text-ink-soft">Resolution: {o.resolution_note}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link href={`/dashboard/offers/${o.id}`} className="text-sm font-semibold text-coral-700 hover:underline">Open thread →</Link>
                  {o.status === "disputed" ? (
                    <ActionForm action={resolveDispute} className="flex flex-1 flex-wrap items-center gap-2">
                      <input type="hidden" name="offerId" value={o.id} />
                      <label htmlFor={`n-${o.id}`} className="sr-only">Resolution note</label>
                      <input id={`n-${o.id}`} name="note" required minLength={5} placeholder="Resolution note (shared with both parties)" className="h-9 min-w-56 flex-1 rounded-full border border-ivory-300 px-3 text-sm" />
                      <SubmitButton name="outcome" value="completed" size="sm" variant="success">Resolve as completed</SubmitButton>
                      <SubmitButton name="outcome" value="cancelled" size="sm" variant="danger">Resolve as cancelled</SubmitButton>
                    </ActionForm>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState title="Nothing here">No offers with this status.</EmptyState>}
    </div>
  );
}
