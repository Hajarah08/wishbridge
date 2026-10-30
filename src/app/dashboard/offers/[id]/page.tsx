import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation";
import { formatDateTime } from "@/lib/format";
import { OFFER_STATUS_LABELS, OFFER_STATUS_TONE, WISH_STATUS_LABELS, type OfferStatus, type WishStatus } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Card, Notice } from "@/components/ui/misc";
import { OfferProgressActions } from "@/components/dashboard/wish-actions";
import { MessageForm } from "./message-form";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Offer" };

type Thread = {
  viewer_role: "wisher" | "giver" | "admin";
  offer: {
    id: string; status: OfferStatus; is_anonymous: boolean; giver_display: string; message: string | null;
    delivery_plan: string | null; decision_note: string | null; giver_confirmed_at: string | null; wisher_confirmed_at: string | null;
    dispute_reason: string | null; disputed_by: string | null; resolution_note: string | null; created_at: string;
  };
  wish: { id: string; title: string; status: WishStatus; wisher_display: string };
  messages: { id: string; sender_role: string; body: string; created_at: string; is_mine: boolean }[];
};

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_offer_thread", { p_offer_id: id });
  if (error || !data) notFound();
  const t = data as unknown as Thread;
  const role = t.viewer_role;
  const canMessage = ["accepted", "in_progress", "awaiting_confirmation", "disputed"].includes(t.offer.status);
  const label = (r: string) => (r === "admin" ? "WishBridge moderator" : r === "giver" ? t.offer.giver_display : t.wish.wisher_display);

  return (
    <div className="space-y-6">
      <div>
        <Link href={role === "giver" ? "/dashboard/giving" : `/dashboard/wishes/${t.wish.id}`} className="text-sm text-ink-soft hover:text-plum-800">← Back</Link>
        <h1 className="mt-2 text-2xl font-semibold text-plum-900 sm:text-3xl">Offer for “{t.wish.title}”</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <Badge tone={OFFER_STATUS_TONE[t.offer.status]}>{OFFER_STATUS_LABELS[t.offer.status]}</Badge>
          <span>Wish: {WISH_STATUS_LABELS[t.wish.status]}</span>
          <span>· You are the {role === "admin" ? "moderator" : role}</span>
        </div>
      </div>

      <Card className="space-y-3">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-ink-soft">Giver</dt><dd className="font-semibold text-plum-900">{t.offer.giver_display}{role === "giver" && t.offer.is_anonymous ? " (that's you — the wisher can't see your username)" : ""}</dd></div>
          <div><dt className="text-ink-soft">Wisher</dt><dd className="font-semibold text-plum-900">{t.wish.wisher_display}</dd></div>
          <div><dt className="text-ink-soft">Offered</dt><dd>{formatDateTime(t.offer.created_at)}</dd></div>
          {t.offer.giver_confirmed_at ? <div><dt className="text-ink-soft">Giver reported fulfilled</dt><dd>{formatDateTime(t.offer.giver_confirmed_at)}</dd></div> : null}
          {t.offer.wisher_confirmed_at ? <div><dt className="text-ink-soft">Wisher confirmed receipt</dt><dd>{formatDateTime(t.offer.wisher_confirmed_at)}</dd></div> : null}
        </dl>
        {t.offer.message ? <p className="text-sm">“{t.offer.message}”</p> : null}
        {t.offer.delivery_plan ? <p className="text-sm text-ink-soft"><span className="font-semibold text-plum-900">Plan:</span> {t.offer.delivery_plan}</p> : null}
        {t.offer.decision_note ? <p className="text-sm text-ink-soft"><span className="font-semibold text-plum-900">Note:</span> {t.offer.decision_note}</p> : null}
        {t.offer.status === "awaiting_confirmation" ? (
          <Notice tone="warning">{role === "wisher" ? "The giver reports this is fulfilled. Please confirm once you've received it." : "Waiting for the wisher to confirm they received it. A wish is only marked fulfilled after both sides confirm."}</Notice>
        ) : null}
        {t.offer.dispute_reason ? <Notice tone="danger" title={`Dispute opened by the ${t.offer.disputed_by}`}>{t.offer.dispute_reason}</Notice> : null}
        {t.offer.resolution_note ? <Notice tone="info" title="Moderator resolution">{t.offer.resolution_note}</Notice> : null}
        <OfferProgressActions offerId={t.offer.id} role={role} status={t.offer.status} />
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-plum-900">Private messages</h2>
        <Notice tone="info" className="mt-3">
          Keep it safe: you never need to share your home address, phone number or bank details. Prefer e-gift cards, click-and-collect or courier pickup points.
          Never send money outside WishBridge.
        </Notice>
        <ol className="mt-4 space-y-3" aria-label="Messages">
          {t.messages.length === 0 ? <li className="text-sm text-ink-soft">No messages yet.</li> : null}
          {t.messages.map((m) => (
            <li key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", m.is_mine ? "ml-auto bg-plum-800 text-white" : m.sender_role === "admin" ? "bg-amber-50 text-amber-700" : "bg-ivory-200 text-ink")}>
              <p className={cn("text-xs font-semibold", m.is_mine ? "text-plum-100" : "text-ink-soft")}>{m.is_mine ? "You" : label(m.sender_role)} · {formatDateTime(m.created_at)}</p>
              <p className="mt-0.5 whitespace-pre-line">{m.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          {canMessage ? <MessageForm offerId={t.offer.id} /> : <p className="text-sm text-ink-soft">Messaging is available while an offer is accepted or in progress.</p>}
        </div>
      </Card>
    </div>
  );
}
