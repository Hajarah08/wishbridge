import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { Card, Notice, PageHeader, Stat } from "@/components/ui/misc";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string; denied?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: wishes }, { data: giving }, { data: notifications }] = await Promise.all([
    supabase.from("wishes").select("status").eq("owner_id", viewer.id),
    supabase.rpc("get_my_giving"),
    supabase.from("notifications").select("id, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const count = (statuses: string[]) => (wishes ?? []).filter((w) => statuses.includes(w.status)).length;
  const openOffers = (giving ?? []).filter((g) => g.kind === "offer" && ["offered", "accepted", "in_progress", "awaiting_confirmation"].includes(g.status)).length;
  const fulfilledGiving = (giving ?? []).filter((g) => g.status === "completed" || (g.kind === "contribution" && g.wish_status === "fulfilled")).length;

  return (
    <div>
      {sp.welcome ? <Notice tone="success" title="Welcome to WishBridge! 🎉" className="mb-6">Your account is ready. Make your first wish, or explore wishes you could help with.</Notice> : null}
      {sp.denied ? <Notice tone="danger" className="mb-6">You don&apos;t have access to that area.</Notice> : null}
      <PageHeader title={`Hello, @${viewer.username}`} description="Here's what's happening with your wishes and giving."
        actions={<><ButtonLink href="/dashboard/wishes/new" variant="coral">Make a Wish</ButtonLink><ButtonLink href="/wishes" variant="secondary">Fulfil a Wish</ButtonLink></>} />
      <section aria-labelledby="wishing">
        <h2 id="wishing" className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-ink-soft">Wishing</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Drafts" value={count(["draft", "changes_requested"])} />
          <Stat label="In review" value={count(["pending_review", "approved"])} />
          <Stat label="Active" value={count(["active", "fulfilment_pending"])} />
          <Stat label="Fulfilled" value={count(["fulfilled"])} />
        </div>
      </section>
      <section aria-labelledby="giving" className="mt-8">
        <h2 id="giving" className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-ink-soft">Giving</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Open offers" value={openOffers} />
          <Stat label="Wishes supported" value={new Set((giving ?? []).map((g) => g.wish_id)).size} />
          <Stat label="Fulfilled by you" value={fulfilledGiving} />
          <Stat label="Test contributions" value={(giving ?? []).filter((g) => g.kind === "contribution").length} hint="Simulated" />
        </div>
      </section>
      <section className="mt-8">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-plum-900">Latest notifications</h2>
            <Link href="/dashboard/notifications" className="text-sm font-semibold text-coral-700 hover:underline">View all</Link>
          </div>
          {notifications?.length ? (
            <ul className="divide-y divide-ivory-200">
              {notifications.map((n) => (
                <li key={n.id} className="py-3">
                  <Link href={n.link ?? "/dashboard/notifications"} className="group flex gap-3">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-ivory-300" : "bg-coral-500"}`} aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold text-plum-900 group-hover:underline">{n.title}</span>
                      <span className="block text-sm text-ink-soft">{n.body}</span>
                      <span className="text-xs text-ink-soft/80">{timeAgo(n.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">No notifications yet.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
