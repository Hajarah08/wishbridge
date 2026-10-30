"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; icon: string; exact?: boolean; badge?: number };

export function SideNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
                  active ? "bg-white text-plum-900 shadow-soft ring-1 ring-ivory-300" : "text-ink-soft hover:bg-white/70 hover:text-plum-800",
                )}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
                {item.badge ? <span className="ml-auto rounded-full bg-coral-500 px-1.5 text-[0.65rem] font-bold text-white">{item.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
