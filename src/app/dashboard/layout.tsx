import { requireViewer } from "@/lib/auth";
import { SideNav } from "@/components/dashboard/side-nav";
import { Notice } from "@/components/ui/misc";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer("/dashboard");
  const items = [
    { href: "/dashboard", label: "Overview", icon: "🏠", exact: true },
    { href: "/dashboard/wishes", label: "My wishes", icon: "🌟" },
    { href: "/dashboard/giving", label: "My giving", icon: "🎁" },
    { href: "/dashboard/notifications", label: "Notifications", icon: "🔔" },
    { href: "/dashboard/settings", label: "Settings & privacy", icon: "⚙️" },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-10">
      <aside className="mb-6 lg:mb-0">
        <p className="mb-3 hidden px-3 text-xs font-semibold uppercase tracking-wide text-ink-soft lg:block">@{viewer.username}</p>
        <SideNav items={items} label="Dashboard" />
      </aside>
      <div className="min-w-0">
        {viewer.status !== "active" ? (
          <Notice tone="warning" title={`Your account is ${viewer.status}`} className="mb-6">
            You can view your activity and withdraw wishes, but can&apos;t create wishes, offers or contributions. Contact support if you think this is a mistake.
          </Notice>
        ) : null}
        {children}
      </div>
    </div>
  );
}
