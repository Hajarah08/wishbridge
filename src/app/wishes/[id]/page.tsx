import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { signImagePaths } from "@/lib/images";
import { countryName } from "@/lib/countries";
import { formatDate, formatMoney } from "@/lib/format";
import { FULFILMENT_METHOD_LABELS, WISH_STATUS_LABELS, WISH_STATUS_TONE, WISH_TYPE_LABELS } from "@/lib/domain";
import { uuidSchema } from "@/lib/validation";
import { Badge, TestModeBadge } from "@/components/ui/badge";
import { Card, Notice, ProgressBar } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { WishCover } from "@/components/wish-card";
import { ContributionForm, OfferForm, ReportButton } from "./forms";

export const dynamic = "force-dynamic";

async function loadWish(id: string) {
  if (!uuidSchema.safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_wishes")
    .select("id,title,description,additional_info,wish_type,fulfilment_method,country_code,currency,estimated_cost_minor,target_amount_minor,status,published_at,fulfilled_at,category_slug,category_name,category_icon,wisher_username,test_pledged_minor,contribution_count,progress_percent")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const wish = await loadWish((await params).id);
  return wish ? { title: wish.title ?? "Wish", description: wish.description?.slice(0, 150) } : { title: "Wish not found" };
}

export default async function WishDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wish = await loadWish(id);
  if (!wish || !wish.id) notFound();

  const supabase = await createClient();
  const viewer = await getViewer();
  const [{ data: images }, { data: supporters }, ownWish, settings] = await Promise.all([
    supabase.from("public_wish_images").select("id, storage_path, alt_text").eq("wish_id", id).order("sort_order"),
    supabase.from("public_wish_supporters").select("id, supporter_username, created_at").eq("wish_id", id).order("created_at", { ascending: false }).limit(12),
    viewer ? supabase.from("wishes").select("id").eq("id", id).eq("owner_id", viewer.id).maybeSingle() : Promise.resolve({ data: null }),
    viewer ? supabase.from("user_settings").select("anonymous_giving_default").eq("user_id", viewer.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const urls = await signImagePaths(supabase, (images ?? []).map((i) => i.storage_path));
  const isOwner = !!ownWish.data;
  const anonDefault = settings.data?.anonymous_giving_default ?? true;

  const isContribution = wish.fulfilment_method === "monetary_contribution";
  const remainingMinor = wish.target_amount_minor != null ? Math.max(0, wish.target_amount_minor - (wish.test_pledged_minor ?? 0)) : null;
  const firstImage = images?.[0];
  const cover = { id: wish.id, title: wish.title ?? "", category_icon: wish.category_icon, cover_url: firstImage ? urls[firstImage.storage_path!] ?? null : null };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-soft">
        <Link href="/wishes" className="hover:text-plum-800">Explore</Link>
        <span aria-hidden> / </span>
        <Link href={`/wishes?category=${wish.category_slug}`} className="hover:text-plum-800">{wish.category_name}</Link>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <article>
          <div className="overflow-hidden rounded-3xl shadow-soft ring-1 ring-ivory-300/70">
            <div className="aspect-[16/9]"><WishCover wish={cover} /></div>
          </div>
          {images && images.length > 1 ? (
            <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="More images">
              {images.slice(1).map((img) => (
                <li key={img.id} className="aspect-square overflow-hidden rounded-xl ring-1 ring-ivory-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urls[img.storage_path!]} alt={img.alt_text ?? ""} className="h-full w-full object-cover" loading="lazy" />
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="neutral">{wish.category_icon} {wish.category_name}</Badge>
            <Badge tone={WISH_STATUS_TONE[wish.status!]}>{WISH_STATUS_LABELS[wish.status!]}</Badge>
            <Badge tone="info">{WISH_TYPE_LABELS[wish.wish_type!]}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-plum-900 sm:text-4xl">{wish.title}</h1>
          <p className="mt-3 text-sm text-ink-soft">
            Posted by <span className="font-semibold text-plum-800">{wish.wisher_username ? `@${wish.wisher_username}` : "an anonymous wisher"}</span>
            {" · "}{countryName(wish.country_code)}{" · "}<time dateTime={wish.published_at ?? undefined}>{formatDate(wish.published_at)}</time>
          </p>
          <div className="mt-6 whitespace-pre-line text-[1.05rem] leading-relaxed text-ink">{wish.description}</div>
          {wish.additional_info ? (
            <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-ivory-300">
              <h2 className="font-sans text-sm font-semibold text-plum-900">Additional information</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{wish.additional_info}</p>
            </div>
          ) : null}

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-ivory-300">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Fulfilment method</dt>
              <dd className="mt-1 text-sm font-medium text-plum-900">{FULFILMENT_METHOD_LABELS[wish.fulfilment_method!]}</dd>
            </div>
            {wish.estimated_cost_minor ? (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-ivory-300">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Estimated cost</dt>
                <dd className="mt-1 text-sm font-medium text-plum-900">{formatMoney(wish.estimated_cost_minor, wish.currency)}</dd>
              </div>
            ) : null}
          </dl>

          {supporters && supporters.length ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-plum-900">Supporters</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {supporters.map((s) => (
                  <li key={s.id} className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-ivory-300">
                    {s.supporter_username ? `@${s.supporter_username}` : "Anonymous giver"}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-8 border-t border-ivory-300 pt-4">
            <ReportButton wishId={wish.id} signedIn={!!viewer} />
          </div>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-5">
            {wish.target_amount_minor != null ? (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-plum-900">Contribution progress</p>
                  <TestModeBadge />
                </div>
                <p className="mt-2 font-display text-3xl font-semibold text-plum-900">
                  {formatMoney(wish.test_pledged_minor, wish.currency)}
                  <span className="text-base font-normal text-ink-soft"> of {formatMoney(wish.target_amount_minor, wish.currency)}</span>
                </p>
                <div className="mt-3"><ProgressBar percent={wish.progress_percent ?? 0} label="Contribution progress (test mode)" /></div>
                <div className="mt-2 flex justify-between text-xs text-ink-soft">
                  <span>{wish.contribution_count} contribution{wish.contribution_count === 1 ? "" : "s"}</span>
                  <span>{formatMoney(remainingMinor, wish.currency)} remaining</span>
                </div>
                <p className="mt-2 text-xs text-ink-soft">Amounts are simulated test-mode pledges, not real money received.</p>
              </div>
            ) : null}

            {wish.status === "fulfilled" ? (
              <Notice tone="success" title="This wish has been fulfilled 🎉">Confirmed by the wisher on {formatDate(wish.fulfilled_at)}.</Notice>
            ) : wish.status === "fulfilment_pending" ? (
              <Notice tone="warning" title="Fulfilment in progress">
                {isContribution ? "The target has been reached and is awaiting the wisher's confirmation." : "The wisher has accepted an offer and it's being fulfilled."}
              </Notice>
            ) : isOwner ? (
              <div className="space-y-3">
                <Notice tone="info">This is your wish. Manage offers and status from your dashboard.</Notice>
                <ButtonLink href={`/dashboard/wishes/${wish.id}`} variant="primary" className="w-full">Manage this wish</ButtonLink>
              </div>
            ) : !viewer ? (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-plum-900">Want to help?</h2>
                <p className="text-sm text-ink-soft">Sign in or create a free account to {isContribution ? "contribute" : "offer to fulfil this wish"}. You can stay anonymous.</p>
                <ButtonLink href={`/login?next=/wishes/${wish.id}`} variant="coral" className="w-full">Sign in to help</ButtonLink>
                <ButtonLink href={`/signup?next=/wishes/${wish.id}`} variant="secondary" className="w-full">Create an account</ButtonLink>
              </div>
            ) : viewer.status !== "active" ? (
              <Notice tone="warning">Your account is restricted, so you can&apos;t make offers right now.</Notice>
            ) : isContribution ? (
              <div>
                <h2 className="mb-3 text-xl font-semibold text-plum-900">Contribute</h2>
                <ContributionForm wishId={wish.id} idempotencyKey={randomUUID()} currency={wish.currency!} remaining={formatMoney(remainingMinor, wish.currency)} anonymousDefault={anonDefault} />
              </div>
            ) : (
              <div>
                <h2 className="mb-1 text-xl font-semibold text-plum-900">Fulfil this wish</h2>
                <p className="mb-4 text-sm text-ink-soft">The wisher reviews your offer first. Nothing is shared until you both agree, and addresses are never shared automatically.</p>
                <OfferForm wishId={wish.id} idempotencyKey={randomUUID()} anonymousDefault={anonDefault} />
              </div>
            )}
            <p className="border-t border-ivory-200 pt-4 text-xs text-ink-soft">
              WishBridge doesn&apos;t guarantee that any wish will be fulfilled. <Link className="underline" href="/safety">Safety tips</Link>
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
