import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, Stat } from "@/components/ui/misc";
import { TestModeBadge } from "@/components/ui/badge";
import { OFFER_STATUS_LABELS, WISH_STATUS_LABELS, type OfferStatus, type WishStatus } from "@/lib/domain";

export const metadata: Metadata = { title: "Admin" };

type Stats = {
  users_total: number; users_restricted: number; users_new_7d: number;
  wishes_by_status: Record<string, number>; offers_by_status: Record<string, number>;
  reports_open: number; support_open: number; disputes_open: number;
  test_contributions_count: number; test_contributions_minor: number;
};

export default async function AdminHome() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_stats");
  const s = data as unknown as Stats;
  const w = s?.wishes_by_status ?? {};
  return (
    <div className="space-y-8">
      <PageHeader title="Platform overview" description="Moderation queues and platform health at a glance." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/admin/wishes"><Stat label="Pending review" value={w.pending_review ?? 0} hint="Wishes awaiting moderation" /></Link>
        <Link href="/admin/reports"><Stat label="Open reports" value={s?.reports_open ?? 0} /></Link>
        <Link href="/admin/offers?status=disputed"><Stat label="Open disputes" value={s?.disputes_open ?? 0} /></Link>
        <Link href="/admin/support"><Stat label="Support requests" value={s?.support_open ?? 0} /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={s?.users_total ?? 0} hint={`${s?.users_new_7d ?? 0} new this week`} />
        <Stat label="Restricted users" value={s?.users_restricted ?? 0} />
        <Stat label="Live wishes" value={(w.active ?? 0) + (w.fulfilment_pending ?? 0)} />
        <Stat label="Test contributions" value={s?.test_contributions_count ?? 0} hint={<><TestModeBadge /> simulated</>} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-plum-900">Wishes by status</h2>
          <ul className="mt-3 divide-y divide-ivory-200 text-sm">
            {(Object.keys(WISH_STATUS_LABELS) as WishStatus[]).map((k) => (
              <li key={k} className="flex justify-between py-2"><Link href={`/admin/wishes?status=${k}`} className="hover:underline">{WISH_STATUS_LABELS[k]}</Link><span className="font-semibold">{w[k] ?? 0}</span></li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-plum-900">Offers by status</h2>
          <ul className="mt-3 divide-y divide-ivory-200 text-sm">
            {(Object.keys(OFFER_STATUS_LABELS) as OfferStatus[]).map((k) => (
              <li key={k} className="flex justify-between py-2"><Link href={`/admin/offers?status=${k}`} className="hover:underline">{OFFER_STATUS_LABELS[k]}</Link><span className="font-semibold">{s?.offers_by_status?.[k] ?? 0}</span></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
