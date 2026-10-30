import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SideNav } from "@/components/dashboard/side-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const supabase = await createClient();
  const [{ count: pending }, { count: reports }, { count: disputes }, { count: support }] = await Promise.all([
    supabase.from("wishes").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "investigating"]),
    supabase.from("fulfilment_offers").select("id", { count: "exact", head: true }).eq("status", "disputed"),
    supabase.from("support_requests").select("id", { count: "exact", head: true }).neq("status", "closed"),
  ]);
  const items = [
    { href: "/admin", label: "Overview", icon: "📊", exact: true },
    { href: "/admin/wishes", label: "Wish moderation", icon: "🛡️", badge: pending ?? 0 },
    { href: "/admin/reports", label: "Reports", icon: "⚑", badge: reports ?? 0 },
    { href: "/admin/offers", label: "Fulfilment activity", icon: "🤝", badge: disputes ?? 0 },
    { href: "/admin/users", label: "Users", icon: "👥" },
    { href: "/admin/payments", label: "Payment test records", icon: "🧪" },
    { href: "/admin/categories", label: "Categories", icon: "🏷️" },
    { href: "/admin/support", label: "Support requests", icon: "💬", badge: support ?? 0 },
    { href: "/admin/audit", label: "Audit log", icon: "📜" },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[14rem_1fr] lg:gap-10">
      <aside className="mb-6 lg:mb-0">
        <p className="mb-3 hidden px-3 text-xs font-semibold uppercase tracking-wide text-coral-700 lg:block">Administration</p>
        <SideNav items={items} label="Administration" />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
