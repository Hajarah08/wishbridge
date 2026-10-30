import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateSupport } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Support requests" };

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("support_requests").select("*").order("status").order("created_at", { ascending: false }).limit(100);
  return (
    <div>
      <PageHeader title="Support requests" description="Reply to users from your support mailbox; record progress here." />
      {data?.length ? (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ivory-300/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-plum-900">{r.subject}</p>
                <Badge tone={r.status === "open" ? "danger" : r.status === "in_progress" ? "warning" : "neutral"}>{r.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-xs text-ink-soft">{r.contact_email} · {r.user_id ? "signed-in user" : "visitor"} · {formatDateTime(r.created_at)}</p>
              <p className="mt-2 whitespace-pre-line text-sm">{r.message}</p>
              {r.admin_note ? <p className="mt-2 text-sm text-ink-soft">Note: {r.admin_note}</p> : null}
              <ActionForm action={updateSupport} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <label htmlFor={`n-${r.id}`} className="sr-only">Internal note</label>
                <input id={`n-${r.id}`} name="note" placeholder="Internal note" maxLength={2000} className="h-9 min-w-56 flex-1 rounded-full border border-ivory-300 px-3 text-sm" />
                <SubmitButton name="status" value="in_progress" size="sm" variant="secondary">In progress</SubmitButton>
                <SubmitButton name="status" value="closed" size="sm" variant="success">Close</SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No support requests" />}
    </div>
  );
}
