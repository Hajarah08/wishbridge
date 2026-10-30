import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { usernamesFor } from "@/lib/admin";
import { PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };
const PAGE = 50;

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createClient();
  const { data, count } = await supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const names = await usernamesFor((data ?? []).map((a) => a.actor_id));
  return (
    <div>
      <PageHeader title="Audit log" description="Append-only record of administrative and sensitive actions." />
      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft ring-1 ring-ivory-300/70">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-ivory-200 text-xs uppercase tracking-wide text-ink-soft"><tr><th className="p-3">When</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Details</th></tr></thead>
          <tbody className="divide-y divide-ivory-200">
            {(data ?? []).map((a) => (
              <tr key={a.id} className="align-top">
                <td className="whitespace-nowrap p-3 text-ink-soft">{formatDateTime(a.created_at)}</td>
                <td className="p-3">{a.actor_id ? `@${names[a.actor_id] ?? "unknown"}` : "system"} <span className="text-xs text-ink-soft">({a.actor_role})</span></td>
                <td className="p-3 font-mono text-xs">{a.action}</td>
                <td className="p-3 font-mono text-xs">{a.entity_type}:{a.entity_id?.slice(0, 8)}</td>
                <td className="max-w-xs p-3 font-mono text-xs text-ink-soft"><code className="break-all">{JSON.stringify(a.details)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil((count ?? 0) / PAGE))} makeHref={(p) => `/admin/audit?page=${p}`} />
    </div>
  );
}
