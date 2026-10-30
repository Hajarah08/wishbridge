import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  const cols = [
    { title: "Explore", links: [["/wishes", "Explore wishes"], ["/dashboard/wishes/new", "Make a wish"], ["/how-it-works", "How it works"]] },
    { title: "Trust", links: [["/safety", "Safety & trust"], ["/legal/guidelines", "Community guidelines"], ["/support", "Contact & support"]] },
    { title: "Legal", links: [["/legal/terms", "Terms of service"], ["/legal/privacy", "Privacy policy"]] },
  ];
  return (
    <footer className="mt-24 border-t border-ivory-300 bg-ivory-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-soft">Your wish. Someone&apos;s kindness. A world of possibilities.</p>
          <p className="mt-4 max-w-xs text-xs text-ink-soft">
            WishBridge never guarantees that a wish will be fulfilled. Payments are simulated in this version — no real money is collected or transferred.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="font-sans text-sm font-semibold text-plum-900">{c.title}</h2>
            <ul className="mt-3 space-y-2">
              {c.links.map(([href, label]) => (
                <li key={href}><Link href={href} className="text-sm text-ink-soft hover:text-plum-800">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ivory-300 py-5 text-center text-xs text-ink-soft">© {new Date().getFullYear()} WishBridge. All rights reserved.</div>
    </footer>
  );
}
