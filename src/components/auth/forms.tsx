"use client";

import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/actions/auth";

export function SignInForm({ next }: { next?: string }) {
  return (
    <ActionForm action={signIn} className="space-y-4">
      {(s) => (
        <>
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label="Email" htmlFor="email" required error={s.fieldErrors?.email}>
            <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!s.fieldErrors?.email} defaultValue={s.values?.email} />
          </Field>
          <Field label="Password" htmlFor="password" required error={s.fieldErrors?.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!s.fieldErrors?.password} />
          </Field>
          <div className="text-right text-sm"><Link href="/forgot-password" className="font-medium text-coral-700 hover:underline">Forgot password?</Link></div>
          <SubmitButton className="w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  return (
    <ActionForm action={signUp} className="space-y-4">
      {(s) =>
        s.ok ? null : (
          <>
            <input type="hidden" name="next" value={next ?? ""} />
            <Field label="Username" htmlFor="username" required error={s.fieldErrors?.username} hint="Shown publicly unless you choose to be anonymous. Don't use your real name.">
              <Input id="username" name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" aria-invalid={!!s.fieldErrors?.username} defaultValue={s.values?.username} />
            </Field>
            <Field label="Email" htmlFor="email" required error={s.fieldErrors?.email} hint="Never shown to other users.">
              <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!s.fieldErrors?.email} defaultValue={s.values?.email} />
            </Field>
            <Field label="Password" htmlFor="password" required error={s.fieldErrors?.password} hint="At least 8 characters. A short phrase you can remember works well.">
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={!!s.fieldErrors?.password} />
            </Field>
            <Checkbox name="acceptTerms" required label={<>I agree to the <Link className="underline" href="/legal/terms" target="_blank">Terms</Link> and <Link className="underline" href="/legal/guidelines" target="_blank">Community Guidelines</Link></>} />
            {s.fieldErrors?.acceptTerms ? <p role="alert" className="text-xs text-coral-700">{s.fieldErrors.acceptTerms[0]}</p> : null}
            <SubmitButton variant="coral" className="w-full" pendingLabel="Creating account…">Create account</SubmitButton>
          </>
        )
      }
    </ActionForm>
  );
}

export function ForgotPasswordForm() {
  return (
    <ActionForm action={requestPasswordReset} className="space-y-4">
      {(s) =>
        s.ok ? null : (
          <>
            <Field label="Email" htmlFor="email" required error={s.fieldErrors?.email}>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <SubmitButton className="w-full" pendingLabel="Sending…">Send reset link</SubmitButton>
          </>
        )
      }
    </ActionForm>
  );
}

export function ResetPasswordForm() {
  return (
    <ActionForm action={updatePassword} className="space-y-4">
      {(s) =>
        s.ok ? (
          <Link href="/dashboard" className="block text-center font-semibold text-coral-700 underline">Go to your dashboard</Link>
        ) : (
          <>
            <Field label="New password" htmlFor="password" required error={s.fieldErrors?.password}>
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm" required error={s.fieldErrors?.confirm}>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
            </Field>
            <SubmitButton className="w-full" pendingLabel="Saving…">Update password</SubmitButton>
          </>
        )
      }
    </ActionForm>
  );
}
