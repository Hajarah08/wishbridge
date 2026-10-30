"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { addWishImage, withdrawWish } from "@/app/actions/wishes";
import { offerAction, respondToOffer } from "@/app/actions/fulfilment";

export function WithdrawDialog({ wishId, hasCommitments }: { wishId: string; hasCommitments: boolean }) {
  return (
    <Dialog trigger="Withdraw wish" triggerVariant="danger" title="Withdraw this wish?"
      description="Withdrawn wishes are removed from public view and can't be reopened.">
      {() => (
        <ActionForm action={withdrawWish} className="space-y-4">
          <input type="hidden" name="wishId" value={wishId} />
          {hasCommitments ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
              Open offers will be closed and givers notified. Any test-mode contributions will be reversed automatically.
            </p>
          ) : null}
          <Field label="Reason" htmlFor="reason" hint="Only visible to you and moderators.">
            <Textarea id="reason" name="reason" maxLength={1000} rows={2} />
          </Field>
          <SubmitButton variant="danger" className="w-full" pendingLabel="Withdrawing…">Yes, withdraw</SubmitButton>
        </ActionForm>
      )}
    </Dialog>
  );
}

export function ImageUploadForm({ wishId }: { wishId: string }) {
  return (
    <ActionForm action={addWishImage} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" resetOnSuccess>
      <input type="hidden" name="wishId" value={wishId} />
      <Field label="Add an image" htmlFor="image" hint="JPEG, PNG or WebP, max 5 MB">
        <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required className="h-auto py-2 file:mr-3 file:rounded-full file:border-0 file:bg-plum-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-plum-800" />
      </Field>
      <Field label="Description" htmlFor="imageAlt">
        <Input id="imageAlt" name="imageAlt" maxLength={200} />
      </Field>
      <SubmitButton variant="secondary" pendingLabel="Uploading…">Upload</SubmitButton>
    </ActionForm>
  );
}

export function OfferDecision({ offerId }: { offerId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionForm action={respondToOffer}>
        <input type="hidden" name="offerId" value={offerId} />
        <input type="hidden" name="decision" value="accept" />
        <SubmitButton size="sm" variant="success" pendingLabel="Accepting…">Accept offer</SubmitButton>
      </ActionForm>
      <Dialog trigger="Decline" triggerVariant="secondary" triggerSize="sm" title="Decline this offer?" description="The giver will be told kindly. You can add an optional note.">
        {() => (
          <ActionForm action={respondToOffer} className="space-y-3">
            <input type="hidden" name="offerId" value={offerId} />
            <input type="hidden" name="decision" value="decline" />
            <Field label="Note to the giver" htmlFor={`note-${offerId}`}>
              <Textarea id={`note-${offerId}`} name="note" maxLength={1000} rows={2} />
            </Field>
            <SubmitButton variant="primary" className="w-full">Decline offer</SubmitButton>
          </ActionForm>
        )}
      </Dialog>
    </div>
  );
}

/** Buttons for progressing an accepted offer, by viewer role and status. */
export function OfferProgressActions({ offerId, role, status }: { offerId: string; role: "wisher" | "giver" | "admin"; status: string }) {
  const simple = (action: string, label: string, variant: "primary" | "success" | "secondary" = "primary") => (
    <ActionForm action={offerAction}>
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="action" value={action} />
      <SubmitButton size="sm" variant={variant}>{label}</SubmitButton>
    </ActionForm>
  );
  const reasonDialog = (action: "cancel" | "dispute", label: string, title: string, description: string) => (
    <Dialog trigger={label} triggerVariant={action === "dispute" ? "danger" : "secondary"} triggerSize="sm" title={title} description={description}>
      {() => (
        <ActionForm action={offerAction} className="space-y-3">
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="action" value={action} />
          <Field label={action === "dispute" ? "What went wrong?" : "Reason"} htmlFor={`${action}-${offerId}`} required={action === "dispute"}>
            <Textarea id={`${action}-${offerId}`} name="note" maxLength={1000} rows={3} required={action === "dispute"} minLength={action === "dispute" ? 10 : undefined} />
          </Field>
          <SubmitButton variant={action === "dispute" ? "danger" : "primary"} className="w-full">{label}</SubmitButton>
        </ActionForm>
      )}
    </Dialog>
  );

  const buttons: React.ReactNode[] = [];
  if (role === "giver") {
    if (status === "accepted") buttons.push(<span key="s">{simple("start", "Mark as in progress", "secondary")}</span>);
    if (status === "accepted" || status === "in_progress") buttons.push(<span key="d">{simple("mark_delivered", "I've fulfilled this wish", "success")}</span>);
    if (status === "offered" || status === "accepted" || status === "in_progress")
      buttons.push(<span key="c">{reasonDialog("cancel", "Cancel offer", "Cancel your offer?", "The wisher will be notified and the wish reopens for others.")}</span>);
  }
  if (role === "wisher") {
    if (status === "awaiting_confirmation") buttons.push(<span key="r">{simple("confirm_received", "Confirm I received it", "success")}</span>);
    if (status === "accepted" || status === "in_progress")
      buttons.push(<span key="c">{reasonDialog("cancel", "Cancel", "Cancel this accepted offer?", "The giver will be notified and your wish reopens for new offers.")}</span>);
  }
  if ((role === "wisher" || role === "giver") && ["accepted", "in_progress", "awaiting_confirmation"].includes(status)) {
    buttons.push(<span key="x">{reasonDialog("dispute", "Report a problem", "Open a dispute", "A moderator will review the offer and messages. Please describe what happened.")}</span>);
  }
  if (!buttons.length) return null;
  return <div className="flex flex-wrap items-start gap-2">{buttons}</div>;
}
