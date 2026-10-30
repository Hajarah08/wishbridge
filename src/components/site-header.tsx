import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "./logo";
import { ButtonLink } from "./ui/button";
import { signOut } from "@/app/actions/auth";

const nav = [
  { href: "/wishes", label: "Explore wishes" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety" },
];

export async function SiteHeader() {
  const viewer = await getViewer();
  let unread = 0;
  if (viewer) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    unread = count ?? 0;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ivory-300/70 bg-ivory-100/85 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-white hover:text-plum-800">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {viewer ? (
            <>
              {viewer.role === "admin" ? (
                <Link href="/admin" className="rounded-full px-3 py-2 text-sm font-semibold text-plum-700 hover:bg-white">Admin</Link>
              ) : null}
              <Link href="/dashboard/notifications" className="relative rounded-full p-2 text-plum-700 hover:bg-white" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {unread ? <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-coral-500 px-1 text-[0.65rem] font-bold text-white">{unread > 9 ? "9+" : unread}</span> : null}
              </Link>
              <ButtonLink href="/dashboard" variant="secondary" size="sm">My dashboard</ButtonLink>
              <form action={signOut}>
                <button className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-white hover:text-plum-800">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-plum-800 hover:bg-white">Sign in</Link>
              <ButtonLink href="/signup" size="sm" variant="coral">Join WishBridge</ButtonLink>
            </>
          )}
        </div>

        {/* Mobile menu: works without JavaScript */}
        <details className="group relative md:hidden">
          <summary className="flex list-none items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-plum-800 ring-1 ring-ivory-300 [&::-webkit-details-marker]:hidden" aria-label="Open menu">
            {unread ? <span className="size-2 rounded-full bg-coral-500" aria-hidden /> : null}
            Menu
            <svg viewBox="0 0 20 20" className="size-4 transition group-open:rotate-180" fill="currentColor" aria-hidden><path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" /></svg>
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 shadow-lift ring-1 ring-ivory-300">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-plum-50">{n.label}</Link>
            ))}
            <div className="my-2 h-px bg-ivory-200" />
            {viewer ? (
              <>
                <Link href="/dashboard" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-plum-800 hover:bg-plum-50">My dashboard</Link>
                <Link href="/dashboard/notifications" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-plum-50">
                  Notifications {unread ? <span className="rounded-full bg-coral-500 px-2 text-xs font-bold text-white">{unread}</span> : null}
                </Link>
                {viewer.role === "admin" ? <Link href="/admin" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-plum-700 hover:bg-plum-50">Admin</Link> : null}
                <form action={signOut}>
                  <button className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-ink-soft hover:bg-plum-50">Sign out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-plum-50">Sign in</Link>
                <Link href="/signup" className="mt-1 block rounded-xl bg-coral-500 px-3 py-2.5 text-center text-sm font-semibold text-white">Join WishBridge</Link>
              </>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
