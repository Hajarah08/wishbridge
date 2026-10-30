import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { attachCovers, PUBLIC_WISH_COLUMNS, type PublicWish } from "@/lib/queries";
import { WishGrid } from "@/components/wish-card";
import { ButtonLink } from "@/components/ui/button";
import { HowItWorksSteps } from "@/components/how-it-works-steps";

export const dynamic = "force-dynamic";

type Client = Awaited<ReturnType<typeof createClient>>;
type ListQuery = ReturnType<typeof listQuery>;
const listQuery = (client: Client) => client.from("public_wishes").select(PUBLIC_WISH_COLUMNS);

async function section(client: Client, build: (q: ListQuery) => ListQuery) {
  const { data } = await build(listQuery(client)).limit(3);
  return attachCovers((data ?? []) as PublicWish[]);
}

export default async function HomePage() {
  const client = await createClient();
  const [featured, recent, approaching, fulfilled, statsRes] = await Promise.all([
    section(client, (q) => q.eq("is_featured", true).eq("status", "active").order("published_at", { ascending: false })),
    section(client, (q) => q.eq("status", "active").order("published_at", { ascending: false })),
    section(client, (q) => q.eq("status", "active").gte("progress_percent", 50).order("progress_percent", { ascending: false })),
    section(client, (q) => q.eq("status", "fulfilled").order("fulfilled_at", { ascending: false })),
    client.rpc("public_stats"),
  ]);
  const stats = (statsRes.data ?? {}) as { open_wishes?: number; fulfilled_wishes?: number; countries?: number };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-coral-100/70 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-32 top-40 size-[22rem] rounded-full bg-plum-100/80 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-plum-700 ring-1 ring-plum-100">
              <span className="size-1.5 rounded-full bg-coral-500" aria-hidden /> Your wish. Someone&apos;s kindness. A world of possibilities.
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] text-plum-900 sm:text-5xl lg:text-6xl">
              What if someone could make your wish come&nbsp;true?
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              WishBridge connects people with wishes — big or small, practical or joyful — to people who&apos;d love to help.
              Post under a username or anonymously. Every wish is reviewed, and your private details stay private.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dashboard/wishes/new" size="lg" variant="coral">Make a Wish</ButtonLink>
              <ButtonLink href="/wishes" size="lg" variant="secondary">Fulfil a Wish</ButtonLink>
            </div>
            <p className="mt-4 text-xs text-ink-soft">Wishes aren&apos;t guaranteed to be fulfilled — but every one is seen by people who care.</p>
          </div>
          <div className="relative hidden animate-rise lg:block" style={{ animationDelay: "120ms" }}>
            <div className="rotate-2 rounded-3xl bg-white p-6 shadow-lift ring-1 ring-ivory-300">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-coral-50 text-2xl" aria-hidden>🎨</span>
                <div>
                  <p className="font-display text-lg font-semibold text-plum-900">A sketchbook &amp; paints</p>
                  <p className="text-xs text-ink-soft">Anonymous wisher · Creative projects</p>
                </div>
              </div>
              <div className="mt-5 h-2.5 rounded-full bg-ivory-200"><div className="h-full w-3/4 rounded-full bg-gradient-to-r from-coral-400 to-coral-500" /></div>
              <p className="mt-2 text-xs text-ink-soft">An anonymous giver offered to help 💛</p>
            </div>
            <div className="-mt-6 ml-16 -rotate-3 rounded-3xl bg-plum-800 p-6 text-white shadow-lift">
              <p className="text-sm text-plum-100">Fulfilled — confirmed by both sides</p>
              <p className="mt-1 font-display text-xl font-semibold">“I can finally practise at home.”</p>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-white/70 p-4 text-center ring-1 ring-ivory-300 backdrop-blur sm:p-6">
            {[
              ["Open wishes", stats.open_wishes ?? 0],
              ["Wishes fulfilled", stats.fulfilled_wishes ?? 0],
              ["Countries", stats.countries ?? 0],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-ink-soft sm:text-sm">{label}</dt>
                <dd className="font-display text-2xl font-semibold text-plum-900 sm:text-3xl">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <WishSection title="Featured wishes" subtitle="Hand-picked by our team." wishes={featured} href="/wishes" />
      <WishSection title="Recently posted" subtitle="Fresh wishes, just approved." wishes={recent} href="/wishes?sort=newest" />
      <WishSection title="Almost there" subtitle="Contribution goals over halfway (test mode)." wishes={approaching} href="/wishes?sort=closest" />
      <WishSection title="Recently fulfilled" subtitle="Shared with the wisher's permission." wishes={fulfilled} href="/wishes?status=fulfilled&sort=recently_fulfilled" />

      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6" aria-labelledby="how">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="how" className="text-2xl font-semibold text-plum-900 sm:text-3xl">How it works</h2>
            <p className="mt-1 text-ink-soft">Simple for wishers, safe for givers.</p>
          </div>
          <Link href="/how-it-works" className="text-sm font-semibold text-coral-700 hover:underline">Learn more →</Link>
        </div>
        <HowItWorksSteps />
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6" aria-labelledby="safety">
        <div className="grid gap-8 overflow-hidden rounded-3xl bg-plum-800 p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <h2 id="safety" className="text-2xl font-semibold sm:text-3xl">Privacy and safety, built in</h2>
            <p className="mt-3 text-plum-100">
              Anonymity on WishBridge is real: giver identities never reach wishers through notifications, pages or our API.
              Home addresses are never shared automatically, and every wish is moderated.
            </p>
            <ButtonLink href="/safety" variant="secondary" className="mt-6">Read about safety &amp; trust</ButtonLink>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["🕶️", "Anonymous giving", "Choose whether the wisher sees your username."],
              ["🏠", "No address sharing", "Coordinate through private offer pages instead."],
              ["🧑‍⚖️", "Human moderation", "Wishes are reviewed; reports are investigated."],
              ["✅", "Two-sided confirmation", "Nobody can mark a gift delivered on their own."],
            ].map(([icon, t, d]) => (
              <li key={t} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <span aria-hidden className="text-xl">{icon}</span>
                <p className="mt-2 font-semibold">{t}</p>
                <p className="text-sm text-plum-100">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function WishSection({ title, subtitle, wishes, href }: { title: string; subtitle: string; wishes: Awaited<ReturnType<typeof attachCovers>>; href: string }) {
  if (wishes.length === 0) return null;
  return (
    <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-plum-900 sm:text-3xl">{title}</h2>
          <p className="mt-1 text-ink-soft">{subtitle}</p>
        </div>
        <Link href={href} className="shrink-0 text-sm font-semibold text-coral-700 hover:underline">See all →</Link>
      </div>
      <WishGrid wishes={wishes} />
    </section>
  );
}
