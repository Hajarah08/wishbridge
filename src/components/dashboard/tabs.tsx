import Link from "next/link";
import { cn } from "@/lib/cn";

export function Tabs({ tabs, active, label }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-full bg-white p-1 ring-1 ring-ivory-300">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={active === t.key ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium",
                active === t.key ? "bg-plum-800 text-white" : "text-ink-soft hover:text-plum-800",
              )}
            >
              {t.label}
              {t.count !== undefined ? <span className={cn("text-xs", active === t.key ? "text-plum-100" : "text-ink-soft/70")}>{t.count}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
