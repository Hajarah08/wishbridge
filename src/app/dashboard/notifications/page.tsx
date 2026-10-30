import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { markNotificationsRead } from "@/app/actions/account";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, type, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(100);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <div>
      <PageHeader title="Notifications" description={`${unread} unread`}
        actions={unread ? <ActionForm action={markNotificationsRead}><SubmitButton variant="secondary" size="sm">Mark all as read</SubmitButton></ActionForm> : null} />
      {items.length ? (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className={`flex gap-3 rounded-2xl p-4 ring-1 ${n.read_at ? "bg-white/60 ring-ivory-300/60" : "bg-white shadow-soft ring-plum-100"}`}>
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.read_at ? "bg-ivory-300" : "bg-coral-500"}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-plum-900">{n.title}{!n.read_at ? <span className="sr-only"> (unread)</span> : null}</p>
                <p className="text-sm text-ink-soft">{n.body}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                  <span>{timeAgo(n.created_at)}</span>
                  {n.link ? <Link href={n.link} className="font-semibold text-coral-700 hover:underline">View</Link> : null}
                  {!n.read_at ? (
                    <ActionForm action={markNotificationsRead}>
                      <input type="hidden" name="id" value={n.id} />
                      <button className="font-semibold text-plum-700 hover:underline">Mark read</button>
                    </ActionForm>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="You're all caught up">We&apos;ll let you know about reviews, offers and updates here.</EmptyState>
      )}
    </div>
  );
}
