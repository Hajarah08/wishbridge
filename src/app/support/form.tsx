"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitSupportRequest } from "@/app/actions/account";

export function SupportForm({ email }: { email?: string }) {
  return (
    <ActionForm action={submitSupportRequest} className="space-y-4">
      {(s) =>
        s.ok ? null : (
          <>
            <Field label="Your email" htmlFor="email" required error={s.fieldErrors?.email} hint="So we can reply. Only our support team sees it.">
              <Input id="email" name="email" type="email" required defaultValue={s.values?.email ?? email} autoComplete="email" />
            </Field>
            <Field label="Subject" htmlFor="subject" required error={s.fieldErrors?.subject}>
              <Input id="subject" name="subject" required maxLength={150} defaultValue={s.values?.subject} />
            </Field>
            <Field label="Message" htmlFor="message" required error={s.fieldErrors?.message}>
              <Textarea id="message" name="message" required maxLength={5000} rows={6} defaultValue={s.values?.message} />
            </Field>
            {/* Honeypot: hidden from people, tempting for bots */}
            <div aria-hidden className="absolute -left-[9999px]" >
              <label htmlFor="website">Website</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
          </>
        )
      }
    </ActionForm>
  );
}
