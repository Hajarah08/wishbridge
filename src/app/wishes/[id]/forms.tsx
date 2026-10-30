"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Dialog } from "@/components/ui/dialog";
import { TestModeBadge } from "@/components/ui/badge";
import { contribute, makeOffer, reportWish } from "@/app/actions/fulfilment";
import { REPORT_REASON_LABELS } from "@/lib/domain";

export function OfferForm({ wishId, idempotencyKey, anonymousDefault }: { wishId: string; idempotencyKey: string; anonymousDefault: boolean }) {
  return (
    <ActionForm action={makeOffer} className="space-y-4">
      {(state) =>
        state.ok ? null : (
          <>
            <input type="hidden" name="wishId" value={wishId} />
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            <Field label="Message to the wisher" htmlFor="message" error={state.fieldErrors?.message} hint="Kind words go a long way. Don't include personal contact details.">
              <Textarea id="message" name="message" maxLength={1000} rows={3} placeholder="I'd love to help with this…" defaultValue={state.values?.message} />
            </Field>
            <Field label="How would you fulfil it?" htmlFor="deliveryPlan" error={state.fieldErrors?.deliveryPlan} hint="e.g. e-gift card, click-and-collect, courier pickup point.">
              <Textarea id="deliveryPlan" name="deliveryPlan" maxLength={1000} rows={2} defaultValue={state.values?.deliveryPlan} />
            </Field>
            <Checkbox name="anonymous" defaultChecked={anonymousDefault} label="Give anonymously" hint="The wisher and visitors will see “An anonymous giver” instead of your username." />
            <SubmitButton variant="coral" className="w-full" pendingLabel="Sending offer…">Offer to fulfil this wish</SubmitButton>
          </>
        )
      }
    </ActionForm>
  );
}

export function ContributionForm({
  wishId, idempotencyKey, currency, remaining, anonymousDefault,
}: { wishId: string; idempotencyKey: string; currency: string; remaining: string; anonymousDefault: boolean }) {
  return (
    <ActionForm action={contribute} className="space-y-4" resetOnSuccess>
      {(state) => (
        <>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
            <TestModeBadge />
            <span>Simulation only — no real money is collected or sent.</span>
          </div>
          <input type="hidden" name="wishId" value={wishId} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <Field label={`Amount (${currency})`} htmlFor="amount" required error={state.fieldErrors?.amount} hint={`Up to ${remaining} still needed.`}>
            <Input id="amount" name="amount" inputMode="decimal" placeholder="10.00" required aria-invalid={!!state.fieldErrors?.amount} defaultValue={state.values?.amount} />
          </Field>
          <Field label="Message" htmlFor="cmessage" error={state.fieldErrors?.message}>
            <Input id="cmessage" name="message" maxLength={500} defaultValue={state.values?.message} />
          </Field>
          <Checkbox name="anonymous" defaultChecked={anonymousDefault} label="Contribute anonymously" hint="Your username won't be shown to the wisher or on this page." />
          <Checkbox name="acknowledgeTestMode" required label="I understand this is a test-mode simulation" hint="No payment details are requested and nothing is charged." />
          {state.fieldErrors?.acknowledgeTestMode ? <p className="text-xs text-coral-700" role="alert">{state.fieldErrors.acknowledgeTestMode[0]}</p> : null}
          <SubmitButton variant="coral" className="w-full" pendingLabel="Recording…">Make a test contribution</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ReportButton({ wishId, signedIn }: { wishId: string; signedIn: boolean }) {
  return (
    <Dialog trigger={<>⚑ Report this wish</>} triggerVariant="ghost" triggerSize="sm" title="Report this wish"
      description="Reports are confidential. The wisher is never told who reported them.">
      {() =>
        signedIn ? (
          <ActionForm action={reportWish} className="space-y-4">
            {(state) =>
              state.ok ? null : (
                <>
                  <input type="hidden" name="wishId" value={wishId} />
                  <Field label="Reason" htmlFor="reason" required error={state.fieldErrors?.reason}>
                    <Select id="reason" name="reason" required defaultValue="">
                      <option value="" disabled>Choose a reason…</option>
                      {Object.entries(REPORT_REASON_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </Field>
                  <Field label="Details" htmlFor="details" error={state.fieldErrors?.details}>
                    <Textarea id="details" name="details" maxLength={2000} rows={3} />
                  </Field>
                  <p className="text-xs text-ink-soft">If someone is in immediate danger, contact your local emergency services.</p>
                  <SubmitButton variant="primary" className="w-full">Send report</SubmitButton>
                </>
              )
            }
          </ActionForm>
        ) : (
          <p className="text-sm text-ink-soft">
            Please <a className="font-semibold text-coral-700 underline" href={`/login?next=/wishes/${wishId}`}>sign in</a> to report a wish. This helps us prevent abuse of the reporting system.
          </p>
        )
      }
    </Dialog>
  );
}
