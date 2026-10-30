import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernamesFor } from "@/lib/admin";
import { signImagePaths } from "@/lib/images";
import { uuidSchema } from "@/lib/validation";
import { countryName } from "@/lib/countries";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  canTransition, FULFILMENT_METHOD_LABELS, OFFER_STATUS_LABELS, OFFER_STATUS_TONE, REPORT_REASON_LABELS,
  WISH_STATUS_LABELS, WISH_STATUS_TONE, WISH_TYPE_LABELS,
} from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Card, Notice } from "@/components/ui/misc";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Textarea } from "@/components/ui/field";
import { moderateWish, setFeatured } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Review wish" };

export default async function AdminWishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: wish } = await supabase.from("wishes").select("*, categories(name, icon)").eq("id", id).maybeSingle();
  if (!wish) notFound();
  const [{ data: images }, { data: history }, { data: offers }, { data: reports }, { data: owner }] = await Promise.all([
    supabase.from("wish_images").select("id, storage_path, alt_text").eq("wish_id", id).order("sort_order"),
    supabase.from("wish_status_history").select("id, from_status, to_status, actor_role, note, created_at").eq("wish_id", id).order("created_at", { ascending: false }),
    supabase.from("fulfilment_offers").select("id, status, giver_id, is_anonymous, created_at").eq("wish_id", id).order("created_at", { ascending: false }),
    supabase.from("reports").select("id, reason, details, status, created_at").eq("wish_id", id).order("created_at", { ascending: false }),
    supabase.from("accounts").select("status").eq("id", wish.owner_id).single(),
  ]);
  const names = await usernamesFor([wish.owner_id, ...(offers ?? []).map((o) => o.giver_id)]);
  const urls = await signImagePaths(supabase, (images ?? []).map((i) => i.storage_path));
  const cat = wish.categories as unknown as { name: string; icon: string } | null;
  const can = (to: Parameters<typeof canTransition>[1]) => canTransition(wish.status, to, "admin");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/wishes" className="text-sm text-ink-soft hover:text-plum-800">← Moderation queue</Link>
        <h1 className="mt-2 text-2xl font-semibold text-plum-900">{wish.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <Badge tone={WISH_STATUS_TONE[wish.status]}>{WISH_STATUS_LABELS[wish.status]}</Badge>
          <span>by <Link className="font-semibold text-plum-800 hover:underline" href={`/admin/users?q=${names[wish.owner_id] ?? ""}`}>@{names[wish.owner_id]}</Link> (account {owner?.status})</span>
          <span>· shown as {wish.wisher_identity === "anonymous" ? "anonymous" : "username"}</span>
          {wish.is_featured ? <Badge tone="accent">★ Featured</Badge> : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-ink-soft">Category</dt><dd>{cat?.icon} {cat?.name}</dd></div>
              <div><dt className="text-ink-soft">Type</dt><dd>{WISH_TYPE_LABELS[wish.wish_type]}</dd></div>
              <div><dt className="text-ink-soft">Fulfilment</dt><dd>{FULFILMENT_METHOD_LABELS[wish.fulfilment_method]}</dd></div>
              <div><dt className="text-ink-soft">Country</dt><dd>{countryName(wish.country_code)}</dd></div>
              {wish.estimated_cost_minor ? <div><dt className="text-ink-soft">Estimated cost</dt><dd>{formatMoney(wish.estimated_cost_minor, wish.currency)}</dd></div> : null}
              {wish.target_amount_minor ? <div><dt className="text-ink-soft">Target</dt><dd>{formatMoney(wish.target_amount_minor, wish.currency)}</dd></div> : null}
              <div><dt className="text-ink-soft">Submitted</dt><dd>{formatDateTime(wish.submitted_at)}</dd></div>
            </dl>
            <h2 className="mt-5 text-sm font-semibold text-plum-900">Description</h2>
            <p className="mt-1 whitespace-pre-line text-sm">{wish.description}</p>
            {wish.additional_info ? (<><h2 className="mt-4 text-sm font-semibold text-plum-900">Additional information</h2><p className="mt-1 whitespace-pre-line text-sm">{wish.additional_info}</p></>) : null}
            {images?.length ? (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <li key={img.id}><img src={urls[img.storage_path]} alt={img.alt_text ?? ""} className="aspect-square w-full rounded-xl object-cover" /></li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-plum-900">Reports ({reports?.length ?? 0})</h2>
            {reports?.length ? (
              <ul className="mt-3 divide-y divide-ivory-200 text-sm">
                {reports.map((r) => (
                  <li key={r.id} className="py-2"><Badge tone={r.status === "open" ? "danger" : "neutral"}>{r.status}</Badge> <span className="font-semibold">{REPORT_REASON_LABELS[r.reason]}</span>{r.details ? <span className="text-ink-soft"> — {r.details}</span> : null} <Link href="/admin/reports" className="text-coral-700 hover:underline">Manage</Link></li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-ink-soft">No reports.</p>}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-plum-900">Offers</h2>
            {offers?.length ? (
              <ul className="mt-3 divide-y divide-ivory-200 text-sm">
                {offers.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>@{names[o.giver_id]} {o.is_anonymous ? <span className="text-ink-soft">(anonymous to wisher)</span> : null}</span>
                    <span className="flex items-center gap-2"><Badge tone={OFFER_STATUS_TONE[o.status]}>{OFFER_STATUS_LABELS[o.status]}</Badge><Link href={`/dashboard/offers/${o.id}`} className="text-coral-700 hover:underline">Thread</Link></span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-ink-soft">No offers.</p>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-plum-900">Moderation</h2>
            {wish.moderation_note ? <Notice tone="info" className="mt-3" title="Current note to wisher">{wish.moderation_note}</Notice> : null}
            <ActionForm action={moderateWish} className="mt-4 space-y-3">
              <input type="hidden" name="wishId" value={wish.id} />
              <Field label="Note to the wisher" htmlFor="note" hint="Required to request changes, reject or suspend. The wisher sees this.">
                <Textarea id="note" name="note" rows={3} maxLength={2000} />
              </Field>
              <div className="flex flex-wrap gap-2">
                {can("active") && wish.status === "pending_review" ? <SubmitButton name="action" value="approve" variant="success" size="sm">Approve</SubmitButton> : null}
                {can("changes_requested") ? <SubmitButton name="action" value="request_changes" variant="secondary" size="sm">Request changes</SubmitButton> : null}
                {can("rejected") ? <SubmitButton name="action" value="reject" variant="danger" size="sm">Reject</SubmitButton> : null}
                {can("suspended") ? <SubmitButton name="action" value="suspend" variant="danger" size="sm">Suspend</SubmitButton> : null}
                {wish.status === "suspended" ? <SubmitButton name="action" value="reinstate" variant="success" size="sm">Reinstate</SubmitButton> : null}
              </div>
              {wish.status !== "pending_review" && wish.status !== "suspended" && !can("suspended") ? <p className="text-xs text-ink-soft">No moderation actions are available for this status.</p> : null}
            </ActionForm>
          </Card>
          {["active", "fulfilment_pending"].includes(wish.status) ? (
            <Card>
              <h2 className="text-lg font-semibold text-plum-900">Homepage</h2>
              <ActionForm action={setFeatured} className="mt-3">
                <input type="hidden" name="wishId" value={wish.id} />
                <input type="hidden" name="featured" value={wish.is_featured ? "false" : "true"} />
                <SubmitButton size="sm" variant="secondary">{wish.is_featured ? "Remove from featured" : "★ Feature on homepage"}</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}
          <Card>
            <h2 className="text-lg font-semibold text-plum-900">History</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {(history ?? []).map((h) => (
                <li key={h.id}><span className="font-semibold">{h.from_status ? `${WISH_STATUS_LABELS[h.from_status]} → ` : ""}{WISH_STATUS_LABELS[h.to_status]}</span> <span className="text-ink-soft">· {h.actor_role} · {formatDateTime(h.created_at)}</span>{h.note ? <p className="text-ink-soft">{h.note}</p> : null}</li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
