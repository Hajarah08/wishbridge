import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { usernamesFor } from "@/lib/admin";
import { Badge, TestModeBadge } from "@/components/ui/badge";
import { Card, Notice, PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { refundTestContribution } from "@/app/actions/admin";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Payment test records" };

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const [{ data: contributions }, { data: refunds }] = await Promise.all([
    supabase.from("contributions").select("id, wish_id, contributor_id, amount_minor, currency, is_anonymous, mode, status, created_at, wishes(title)").order("created_at", { ascending: false }).limit(100),
    supabase.from("refunds").select("id, contribution_id, amount_minor, currency, mode, status, reason, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const names = await usernamesFor((contributions ?? []).map((c) => c.contributor_id));
  return (
    <div className="space-y-6">
      <PageHeader title="Payment test records" description="Simulated transactions used to exercise the contribution workflow." />
      <Notice tone="warning" title="Test mode only">
        Every record here is a simulation (mode = test, provider = simulated). No money was received, held or paid out. The database
        rejects any non-test record until a compliant payment provider is integrated — see docs/PAYMENTS.md.
      </Notice>
      <Card>
        <h2 className="text-lg font-semibold text-plum-900">Contributions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-soft"><tr><th className="py-2">Wish</th><th>Contributor</th><th>Amount</th><th>Mode</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody className="divide-y divide-ivory-200">
              {(contributions ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="py-2"><Link href={`/admin/wishes/${c.wish_id}`} className="hover:underline">{(c.wishes as unknown as { title: string } | null)?.title}</Link></td>
                  <td>@{names[c.contributor_id ?? ""] ?? "deleted"}{c.is_anonymous ? " (anon)" : ""}</td>
                  <td className="font-semibold">{formatMoney(c.amount_minor, c.currency)}</td>
                  <td><TestModeBadge /></td>
                  <td><Badge tone={c.status === "succeeded" ? "success" : c.status === "refunded" ? "warning" : "neutral"}>{c.status}</Badge></td>
                  <td className="text-ink-soft">{formatDateTime(c.created_at)}</td>
                  <td>
                    {c.status === "succeeded" ? (
                      <ActionForm action={refundTestContribution} className="flex items-center gap-1">
                        <input type="hidden" name="contributionId" value={c.id} />
                        <label htmlFor={`r-${c.id}`} className="sr-only">Reason</label>
                        <input id={`r-${c.id}`} name="reason" placeholder="Reason" required minLength={5} className="h-8 w-28 rounded-full border border-ivory-300 px-2 text-xs" />
                        <SubmitButton size="sm" variant="ghost">Simulate refund</SubmitButton>
                      </ActionForm>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-plum-900">Refunds</h2>
        {(refunds ?? []).length ? (
          <ul className="mt-3 divide-y divide-ivory-200 text-sm">
            {(refunds ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{formatMoney(r.amount_minor, r.currency)} · {r.reason}</span>
                <span className="flex items-center gap-2"><TestModeBadge /><Badge tone="neutral">{r.status}</Badge><span className="text-ink-soft">{formatDateTime(r.created_at)}</span></span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-ink-soft">No refunds yet.</p>}
      </Card>
    </div>
  );
}
