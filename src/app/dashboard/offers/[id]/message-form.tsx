"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { sendOfferMessage } from "@/app/actions/fulfilment";

export function MessageForm({ offerId }: { offerId: string }) {
  return (
    <ActionForm action={sendOfferMessage} resetOnSuccess className="space-y-2">
      {(s) => (
        <>
          <input type="hidden" name="offerId" value={offerId} />
          <label htmlFor="body" className="sr-only">Message</label>
          <Textarea id="body" name="body" rows={3} maxLength={2000} required placeholder="Write a message…" aria-invalid={!!s.fieldErrors?.body} />
          {s.fieldErrors?.body ? <p className="text-xs text-coral-700" role="alert">{s.fieldErrors.body[0]}</p> : null}
          <div className="flex justify-end"><SubmitButton size="sm" pendingLabel="Sending…">Send message</SubmitButton></div>
        </>
      )}
    </ActionForm>
  );
}
