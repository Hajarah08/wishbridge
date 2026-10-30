import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Pagination } from "@/components/ui/pagination";
import { setAccountStatus } from "@/app/actions/admin";
import { formatDate, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };
const PAGE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_users", { p_search: sp.q?.slice(0, 100) ?? "", p_limit: PAGE, p_offset: (page - 1) * PAGE });
  const users = data ?? [];
  const total = Number(users[0]?.total_count ?? 0);
  return (
    <div>
      <PageHeader title="Users" description="Email addresses are visible to administrators only, for support and safety purposes." />
      <form method="get" className="mb-4">
        <label htmlFor="q" className="sr-only">Search users</label>
        <input id="q" name="q" defaultValue={sp.q} placeholder="Search username or email…" className="h-10 w-full max-w-sm rounded-full border border-ivory-300 bg-white px-4 text-sm" />
      </form>
      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ivory-300/70">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-plum-900">@{u.username} {u.role === "admin" ? <Badge tone="accent">admin</Badge> : null} <Badge tone={u.status === "active" ? "success" : "danger"}>{u.status}</Badge></p>
                <p className="text-xs text-ink-soft">{u.email} · joined {formatDate(u.created_at)} · last sign-in {u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : "never"} · {u.wish_count} wishes · {u.offer_count} offers</p>
                {u.status_reason ? <p className="text-xs text-coral-700">Reason: {u.status_reason}</p> : null}
              </div>
              {u.id !== viewer?.id ? (
                <ActionForm action={setAccountStatus} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <label htmlFor={`reason-${u.id}`} className="sr-only">Reason</label>
                  <input id={`reason-${u.id}`} name="reason" placeholder="Reason (required to restrict)" maxLength={500} className="h-9 w-56 rounded-full border border-ivory-300 px-3 text-sm" />
                  {u.status !== "active" ? <SubmitButton name="status" value="active" size="sm" variant="success">Reinstate</SubmitButton> : null}
                  {u.status !== "restricted" ? <SubmitButton name="status" value="restricted" size="sm" variant="secondary">Restrict</SubmitButton> : null}
                  {u.status !== "suspended" ? <SubmitButton name="status" value="suspended" size="sm" variant="danger">Suspend</SubmitButton> : null}
                </ActionForm>
              ) : <span className="text-xs text-ink-soft">This is you</span>}
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE))} makeHref={(p) => `/admin/users?page=${p}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} />
    </div>
  );
}
