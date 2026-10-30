"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfile, updateSettings } from "@/app/actions/account";

export function ProfileForm({ username, bio }: { username: string; bio: string }) {
  return (
    <ActionForm action={updateProfile} className="space-y-4">
      {(s) => (
        <>
          <Field label="Username" htmlFor="username" required error={s.fieldErrors?.username} hint="Your public handle. Avoid using your real name.">
            <Input id="username" name="username" defaultValue={username} maxLength={24} required />
          </Field>
          <Field label="Short bio" htmlFor="bio" error={s.fieldErrors?.bio} hint="Private for now — reserved for future public profiles. Max 280 characters.">
            <Textarea id="bio" name="bio" defaultValue={bio} maxLength={280} rows={2} />
          </Field>
          <SubmitButton size="sm">Save profile</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PrivacyForm({ anonymousGiving, anonymousWishing, emailNotifications }: { anonymousGiving: boolean; anonymousWishing: boolean; emailNotifications: boolean }) {
  return (
    <ActionForm action={updateSettings} className="space-y-3">
      <Checkbox name="anonymousGiving" defaultChecked={anonymousGiving} label="Give anonymously by default" hint="Wishers will see “An anonymous giver”. You can change this on each offer." />
      <Checkbox name="anonymousWishing" defaultChecked={anonymousWishing} label="Post wishes anonymously by default" hint="Your username is hidden on new wishes. You can change this per wish." />
      <Checkbox name="emailNotifications" defaultChecked={emailNotifications} label="Email me about important updates" hint="Email delivery is not yet enabled in this MVP; your preference is saved for when it is." />
      <SubmitButton size="sm">Save privacy settings</SubmitButton>
    </ActionForm>
  );
}
