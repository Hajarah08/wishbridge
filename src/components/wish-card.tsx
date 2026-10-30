import Link from "next/link";
import type { PublicWishWithImage } from "@/lib/queries";
import { countryName } from "@/lib/countries";
import { formatMoney, timeAgo } from "@/lib/format";
import { FULFILMENT_METHOD_SHORT, WISH_STATUS_LABELS, WISH_STATUS_TONE } from "@/lib/domain";
import { Badge } from "./ui/badge";
import { ProgressBar } from "./ui/misc";

const gradients = [
  "from-plum-200 via-coral-100 to-ivory-200",
  "from-coral-100 via-ivory-200 to-sage-100",
  "from-sage-100 via-plum-100 to-ivory-200",
  "from-ivory-300 via-coral-100 to-plum-100",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function WishCover({ wish, className = "" }: { wish: Pick<PublicWishWithImage, "id" | "cover_url" | "category_icon" | "title">; className?: string }) {
  if (wish.cover_url) {
    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs; next/image would cache them
    return <img src={wish.cover_url} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${gradients[hash(wish.id ?? "") % gradients.length]} ${className}`} aria-hidden>
      <span className="text-5xl drop-shadow-sm transition duration-500 group-hover:scale-110">{wish.category_icon ?? "✨"}</span>
    </div>
  );
}

export function WishCard({ wish }: { wish: PublicWishWithImage }) {
  const hasTarget = wish.target_amount_minor != null;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-ivory-300/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-[16/10] overflow-hidden">
        <WishCover wish={wish} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="neutral" className="bg-white/90 backdrop-blur">{wish.category_icon} {wish.category_name}</Badge>
          {wish.status && wish.status !== "active" ? (
            <Badge tone={WISH_STATUS_TONE[wish.status]} className="bg-white/90">{WISH_STATUS_LABELS[wish.status]}</Badge>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug text-plum-900">
          <Link href={`/wishes/${wish.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {wish.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{wish.description}</p>
        <div className="mt-auto pt-4">
          {hasTarget ? (
            <div className="mb-3">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-semibold text-plum-800">{formatMoney(wish.test_pledged_minor, wish.currency)} <span className="font-normal text-ink-soft">of {formatMoney(wish.target_amount_minor, wish.currency)}</span></span>
                <span className="text-ink-soft">{wish.progress_percent ?? 0}%</span>
              </div>
              <ProgressBar percent={wish.progress_percent ?? 0} label={`${wish.progress_percent ?? 0}% of target (test mode)`} />
            </div>
          ) : wish.estimated_cost_minor ? (
            <p className="mb-3 text-xs text-ink-soft">Estimated value <span className="font-semibold text-plum-800">{formatMoney(wish.estimated_cost_minor, wish.currency)}</span></p>
          ) : null}
          <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
            <span className="truncate">{wish.wisher_username ? `@${wish.wisher_username}` : "Anonymous wisher"} · {countryName(wish.country_code)}</span>
            <span className="shrink-0">{wish.status === "fulfilled" ? `Fulfilled ${timeAgo(wish.fulfilled_at)}` : timeAgo(wish.published_at)}</span>
          </div>
          <p className="sr-only">Fulfilment: {wish.fulfilment_method ? FULFILMENT_METHOD_SHORT[wish.fulfilment_method] : ""}</p>
        </div>
      </div>
    </article>
  );
}

export function WishGrid({ wishes }: { wishes: PublicWishWithImage[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {wishes.map((w, i) => (
        <div key={w.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <WishCard wish={w} />
        </div>
      ))}
    </div>
  );
}
