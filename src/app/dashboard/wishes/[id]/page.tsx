import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signImagePaths } from "@/lib/images";
import { uuidSchema } from "@/lib/validation";
import { countryName } from "@/lib/countries";
import { formatDateTime, formatMoney, timeAgo } from "@/lib/format";
import {
  EDITABLE_WISH_STATUSES, FULFILMENT_METHOD_LABELS, IMAGE_EDITABLE_STATUSES, OFFER_STATUS_LABELS, OFFER_STATUS_TONE,
  PUBLIC_WISH_STATUSES, WISH_STATUS_LABELS, WISH_STATUS_TONE, WISH_TYPE_LABELS,
} from "@/lib/domain";
import { Badge, TestModeBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, EmptyState, Notice, ProgressBar } from "@/components/ui/misc";
import { ImageUploadForm, OfferDecision, OfferProgressActions, WithdrawDialog } from "@/components/dashboard/wish-actions";
import { confirmWishFulfilled, publishWish, removeWishImage, submitWish } from "@/app/actions/wishes";

export const metadata: Metadata = { title: "Manage wish" };

export default async function ManageWishPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string; saved?: string; imageError?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!uuidSchema.safeParse(id).success) notFound();
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: wish } = await supabase
    .from("wishes")
    .select("*, categories(name, icon)")
    .eq("id", id)
    .eq("owner_id", viewer.id)
    .maybeSingle();
  if (!wish) notFound();

  const isContribution = wish.fulfilment_method === "monetary_contribution";
  const [{ data: images }, { data: history }, offersRes, contributionsRes] = await Promise.all([
    supabase.from("wish_images").select("id, storage_path, alt_text").eq("wish_id", id).order("sort_order"),
    supabase.from("wish_status_history").select("id, from_status, to_status, actor_role, note, created_at").eq("wish_id", id).order("created_at", { ascending: false }),
    isContribution ? Promise.resolve({ data: [] }) : supabase.rpc("get_wish_offers", { p_wish_id: id }),
    isContribution ? supabase.rpc("get_wish_contributions", { p_wish_id: id }) : Promise.resolve({ data: [] }),
  ]);
  const offers = offersRes.data ?? [];
  const contributions = contributionsRes.data ?? [];
  const urls = await signImagePaths(supabase, (images ?? []).map((i) => i.storage_path));
  const cat = wish.categories as unknown as { name: string; icon: string | null } | null;
  const pledged = contributions.filter((c) => c.status === "succeeded").reduce((s, c) => s + Number(c.amount_minor), 0);
  const liveOffers = offers.filter((o) => !["declined", "cancelled", "completed"].includes(o.status));
  const canWithdraw = ["draft", "pending_review", "changes_requested", "approved", "active", "fulfilment_pending"].includes(wish.status);
  const canEdit = EDITABLE_WISH_STATUSES.includes(wish.status) && !(wish.status === "active" && (offers.length > 0 || contributions.length > 0));
  const imagesEditable = IMAGE_EDITABLE_STATUSES.includes(wish.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard/wishes" className="text-sm text-ink-soft hover:text-plum-800">← My wishes</Link>
          <h1 className="mt-2 text-2xl font-semibold text-plum-900 sm:text-3xl">{wish.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={WISH_STATUS_TONE[wish.status]}>{WISH_STATUS_LABELS[wish.status]}</Badge>
            <span className="text-sm text-ink-soft">{cat?.icon} {cat?.name} · {WISH_TYPE_LABELS[wish.wish_type]} · {countryName(wish.country_code)}</span>
            {wish.wisher_identity === "anonymous" ? <Badge tone="info">Posted anonymously</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PUBLIC_WISH_STATUSES.includes(wish.status) && (wish.status !== "fulfilled" || wish.show_when_fulfilled) ? (
            <ButtonLink href={`/wishes/${wish.id}`} variant="secondary" size="sm">View public page</ButtonLink>
          ) : null}
          {canEdit ? <ButtonLink href={`/dashboard/wishes/${wish.id}/edit`} variant="secondary" size="sm">Edit</ButtonLink> : null}
        </div>
      </div>

      {sp.submitted ? <Notice tone="success" title="Submitted for review">A moderator will review your wish soon. You&apos;ll get a notification when it&apos;s approved.</Notice> : null}
      {sp.saved ? <Notice tone="success">Draft saved.</Notice> : null}
      {sp.imageError ? <Notice tone="warning">Your wish was saved, but the image wasn&apos;t: {sp.imageError}</Notice> : null}
      {wish.moderation_note && ["changes_requested", "rejected", "suspended"].includes(wish.status) ? (
        <Notice tone={wish.status === "changes_requested" ? "warning" : "danger"} title="Note from our moderators">{wish.moderation_note}</Notice>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold text-plum-900">Next steps</h2>
        <div className="mt-3 space-y-3 text-sm text-ink-soft">
          {wish.status === "draft" && <p>This wish is a private draft. Submit it when you&apos;re ready — a moderator will review it before it goes live.</p>}
          {wish.status === "changes_requested" && <p>Update your wish using the moderator&apos;s note, then resubmit.</p>}
          {wish.status === "pending_review" && <p>Your wish is in the review queue. Most wishes are reviewed within a day.</p>}
          {wish.status === "approved" && <p>Approved! Publish it whenever you&apos;re ready for people to see it.</p>}
          {wish.status === "active" && <p>Your wish is live. {isContribution ? "Test-mode contributions will appear below." : "You'll be notified when someone offers to fulfil it."}</p>}
          {wish.status === "fulfilment_pending" && <p>{isContribution ? "Your target was reached (test mode). Confirm when your wish has been fulfilled." : "You've accepted an offer. Keep in touch through the private offer page and confirm once you've received it."}</p>}
          {wish.status === "fulfilled" && <p>🎉 This wish is fulfilled. Thank you for being part of WishBridge.</p>}
          {wish.status === "withdrawn" && <p>You withdrew this wish.</p>}
        </div>
        <div className="mt-4 flex flex-wrap items-start gap-2">
          {(wish.status === "draft" || wish.status === "changes_requested") && viewer.status === "active" ? (
            <ActionForm action={submitWish}><input type="hidden" name="wishId" value={wish.id} /><SubmitButton variant="coral">Submit for review</SubmitButton></ActionForm>
          ) : null}
          {wish.status === "approved" ? (
            <ActionForm action={publishWish}><input type="hidden" name="wishId" value={wish.id} /><SubmitButton variant="coral">Publish wish</SubmitButton></ActionForm>
          ) : null}
          {wish.status === "fulfilment_pending" && isContribution ? (
            <ActionForm action={confirmWishFulfilled}><input type="hidden" name="wishId" value={wish.id} /><SubmitButton variant="success">Confirm my wish is fulfilled</SubmitButton></ActionForm>
          ) : null}
          {canWithdraw ? <WithdrawDialog wishId={wish.id} hasCommitments={liveOffers.length > 0 || contributions.length > 0} /> : null}
        </div>
      </Card>

      {isContribution ? (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-plum-900">Contributions</h2>
            <TestModeBadge />
          </div>
          <p className="mt-2 font-display text-2xl font-semibold text-plum-900">
            {formatMoney(pledged, wish.currency)} <span className="text-base font-normal text-ink-soft">of {formatMoney(wish.target_amount_minor, wish.currency)}</span>
          </p>
          <div className="mt-2"><ProgressBar percent={wish.target_amount_minor ? (pledged * 100) / wish.target_amount_minor : 0} /></div>
          <p className="mt-2 text-xs text-ink-soft">Simulated pledges only. No real money has been collected, held or paid out.</p>
          {contributions.length ? (
            <ul className="mt-4 divide-y divide-ivory-200">
              {contributions.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span><span className="font-semibold text-plum-900">{c.supporter_display}</span>{c.message ? <span className="text-ink-soft"> — “{c.message}”</span> : null}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{formatMoney(c.amount_minor, c.currency)}</span>
                    {c.status !== "succeeded" ? <Badge tone="neutral">{c.status}</Badge> : null}
                    <span className="text-xs text-ink-soft">{timeAgo(c.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-ink-soft">No contributions yet.</p>}
        </Card>
      ) : (
        <section aria-labelledby="offers">
          <h2 id="offers" className="mb-3 text-lg font-semibold text-plum-900">Fulfilment offers</h2>
          {offers.length ? (
            <ul className="space-y-3">
              {offers.map((o) => (
                <li key={o.id}>
                  <Card className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-plum-900">{o.giver_display}</p>
                      <div className="flex items-center gap-2">
                        <Badge tone={OFFER_STATUS_TONE[o.status]}>{OFFER_STATUS_LABELS[o.status]}</Badge>
                        <span className="text-xs text-ink-soft">{timeAgo(o.created_at)}</span>
                      </div>
                    </div>
                    {o.message ? <p className="text-sm text-ink">“{o.message}”</p> : null}
                    {o.delivery_plan ? <p className="text-sm text-ink-soft"><span className="font-semibold text-plum-900">Plan:</span> {o.delivery_plan}</p> : null}
                    {o.status === "awaiting_confirmation" ? (
                      <Notice tone="warning">The giver reports this wish has been fulfilled. Please confirm once you&apos;ve received it, or report a problem.</Notice>
                    ) : null}
                    {o.dispute_reason ? <Notice tone="danger" title={`Dispute opened by the ${o.disputed_by}`}>{o.dispute_reason}</Notice> : null}
                    {o.resolution_note ? <Notice tone="info" title="Moderator resolution">{o.resolution_note}</Notice> : null}
                    <div className="flex flex-wrap items-center gap-2">
                      {o.status === "offered" && wish.status === "active" ? <OfferDecision offerId={o.id} /> : null}
                      {o.status === "offered" && wish.status === "fulfilment_pending" ? <p className="text-xs text-ink-soft">You&apos;ve already accepted another offer.</p> : null}
                      <OfferProgressActions offerId={o.id} role="wisher" status={o.status} />
                      {["accepted", "in_progress", "awaiting_confirmation", "disputed", "completed"].includes(o.status) ? (
                        <ButtonLink href={`/dashboard/offers/${o.id}`} variant="ghost" size="sm">Open private offer page →</ButtonLink>
                      ) : null}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No offers yet">{wish.status === "active" ? "When someone offers to fulfil your wish, it will appear here." : "Offers can be made once your wish is live."}</EmptyState>
          )}
        </section>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-plum-900">Images</h2>
        {images?.length ? (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img) => (
              <li key={img.id} className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[img.storage_path]} alt={img.alt_text ?? ""} className="aspect-square w-full rounded-xl object-cover ring-1 ring-ivory-300" />
                {imagesEditable ? (
                  <ActionForm action={removeWishImage}>
                    <input type="hidden" name="imageId" value={img.id} />
                    <input type="hidden" name="wishId" value={wish.id} />
                    <SubmitButton size="sm" variant="ghost">Remove</SubmitButton>
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-ink-soft">No images yet.</p>}
        {imagesEditable && (images?.length ?? 0) < 4 ? <div className="mt-4"><ImageUploadForm wishId={wish.id} /></div> : null}
        {!imagesEditable ? <p className="mt-2 text-xs text-ink-soft">Images can only be changed before a wish is approved.</p> : null}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-plum-900">Details</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-ink-soft">Fulfilment method</dt><dd className="font-medium">{FULFILMENT_METHOD_LABELS[wish.fulfilment_method]}</dd></div>
          {wish.estimated_cost_minor ? <div><dt className="text-ink-soft">Estimated cost</dt><dd className="font-medium">{formatMoney(wish.estimated_cost_minor, wish.currency)}</dd></div> : null}
          {wish.target_amount_minor ? <div><dt className="text-ink-soft">Target</dt><dd className="font-medium">{formatMoney(wish.target_amount_minor, wish.currency)}</dd></div> : null}
          <div><dt className="text-ink-soft">Show publicly when fulfilled</dt><dd className="font-medium">{wish.show_when_fulfilled ? "Yes" : "No"}</dd></div>
        </dl>
        <p className="mt-4 whitespace-pre-line text-sm text-ink">{wish.description}</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-plum-900">Status history</h2>
        <ol className="mt-3 space-y-3 border-l-2 border-ivory-300 pl-4">
          {(history ?? []).map((h) => (
            <li key={h.id} className="relative text-sm">
              <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-plum-300" aria-hidden />
              <span className="font-semibold text-plum-900">{WISH_STATUS_LABELS[h.to_status]}</span>
              <span className="text-ink-soft"> · {h.actor_role === "admin" ? "moderator" : h.actor_role === "owner" ? "you" : "automatic"} · {formatDateTime(h.created_at)}</span>
              {h.note ? <p className="text-ink-soft">{h.note}</p> : null}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
