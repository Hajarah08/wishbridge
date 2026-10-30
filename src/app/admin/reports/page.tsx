import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { usernamesFor } from "@/lib/admin";
import { Tabs } from "@/components/dashboard/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateReport } from "@/app/actions/admin";
import { REPORT_REASON_LABELS, type ReportStatus } from "@/lib/domain";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (["open", "investigating", "resolved", "dismissed"].includes(sp.status ?? "") ? sp.status : "open") as ReportStatus;
  const supabase = await createClient();
  const { data } = await supabase.from("reports").select("id, wish_id, reporter_id, reason, details, status, resolution_note, created_at, wishes(title, status)").eq("status", status).order("created_at", { ascending: true }).limit(100);
  const reports = data ?? [];
  const names = await usernamesFor(reports.map((r) => r.reporter_id));
  return (
    <div>
      <PageHeader title="Reports & investigations" description="Reporter identities are confidential and never shown to wishers." />
      <Tabs label="Report status" active={status} tabs={["open", "investigating", "resolved", "dismissed"].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), href: `/admin/reports?status=${k}` }))} />
      {reports.length ? (
        <ul className="space-y-3">
          {reports.map((r) => {
            const wish = r.wishes as unknown as { title: string; status: string } | null;
            return (
              <li key={r.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ivory-300/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-plum-900"><Badge tone={r.reason === "child_safety" ? "danger" : "warning"}>{REPORT_REASON_LABELS[r.reason]}</Badge> <Link className="hover:underline" href={`/admin/wishes/${r.wish_id}`}>{wish?.title}</Link></p>
                  <span className="text-xs text-ink-soft">by @{names[r.reporter_id ?? ""] ?? "deleted user"} · {timeAgo(r.created_at)} · wish {wish?.status?.replace(/_/g, " ")}</span>
                </div>
                {r.details ? <p className="mt-2 text-sm">{r.details}</p> : null}
                {r.resolution_note ? <p className="mt-2 text-sm text-ink-soft">Note: {r.resolution_note}</p> : null}
                <ActionForm action={updateReport} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="reportId" value={r.id} />
                  <label htmlFor={`note-${r.id}`} className="sr-only">Investigation note</label>
                  <input id={`note-${r.id}`} name="note" placeholder="Investigation note" maxLength={2000} className="h-9 min-w-56 flex-1 rounded-full border border-ivory-300 px-3 text-sm" />
                  {status !== "investigating" ? <SubmitButton name="status" value="investigating" size="sm" variant="secondary">Investigate</SubmitButton> : null}
                  <SubmitButton name="status" value="resolved" size="sm" variant="success">Resolve</SubmitButton>
                  <SubmitButton name="status" value="dismissed" size="sm" variant="ghost">Dismiss</SubmitButton>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState title="Nothing to review">No {status} reports.</EmptyState>}
    </div>
  );
}
