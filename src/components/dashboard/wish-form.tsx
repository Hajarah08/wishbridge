"use client";

import { useActionState, useState } from "react";
import { saveWish } from "@/app/actions/wishes";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { TestModeBadge } from "@/components/ui/badge";
import { COUNTRIES, CURRENCIES } from "@/lib/countries";
import { FULFILMENT_METHOD_LABELS, WISH_TYPE_LABELS } from "@/lib/domain";

export type WishFormInitial = Partial<Record<
  "wishId" | "title" | "description" | "category" | "wishType" | "fulfilmentMethod" | "country" | "currency" |
  "estimatedCost" | "targetAmount" | "additionalInfo" | "anonymous" | "showWhenFulfilled", string>>;

export function WishForm({
  categories,
  initial,
  mode,
  allowImage,
  currentStatus,
}: {
  categories: { slug: string; name: string; icon: string | null }[];
  initial: WishFormInitial;
  mode: "create" | "edit";
  allowImage: boolean;
  currentStatus?: string;
}) {
  const [state, action] = useActionState(saveWish, {});
  const v = { ...initial, ...(state.values ?? {}) };
  const [method, setMethod] = useState(v.fulfilmentMethod ?? "");
  const [description, setDescription] = useState(v.description ?? "");
  const err = (k: string) => state.fieldErrors?.[k];
  const isContribution = method === "monetary_contribution";

  return (
    <form action={action} className="space-y-8" noValidate>
      {v.wishId ? <input type="hidden" name="wishId" value={v.wishId} /> : null}

      <fieldset className="space-y-5 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ivory-300/70 sm:p-6">
        <legend className="sr-only">About your wish</legend>
        <h2 className="text-lg font-semibold text-plum-900">About your wish</h2>
        <Field label="Title" htmlFor="title" required error={err("title")} hint="A short, clear summary — e.g. “A secondhand bike for my commute”.">
          <Input id="title" name="title" defaultValue={v.title} maxLength={120} required aria-invalid={!!err("title")} />
        </Field>
        <Field label="Description" htmlFor="description" required error={err("description")}
          hint={<>Tell people what it is and why it matters. Never include addresses, phone numbers or bank details. <span className="float-right">{description.length}/5000</span></>}>
          <Textarea id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={6} required aria-invalid={!!err("description")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" htmlFor="category" required error={err("category")}>
            <Select id="category" name="category" defaultValue={v.category ?? ""} required aria-invalid={!!err("category")}>
              <option value="" disabled>Choose…</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
            </Select>
          </Field>
          <Field label="Wish type" htmlFor="wishType" required error={err("wishType")}>
            <Select id="wishType" name="wishType" defaultValue={v.wishType ?? ""} required aria-invalid={!!err("wishType")}>
              <option value="" disabled>Choose…</option>
              {Object.entries(WISH_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Country" htmlFor="country" required error={err("country")} hint="Only the country is shown — never your city or address.">
            <Select id="country" name="country" defaultValue={v.country ?? ""} required aria-invalid={!!err("country")}>
              <option value="" disabled>Choose…</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Preferred fulfilment method" htmlFor="fulfilmentMethod" required error={err("fulfilmentMethod")}>
            <Select id="fulfilmentMethod" name="fulfilmentMethod" value={method} onChange={(e) => setMethod(e.target.value)} required aria-invalid={!!err("fulfilmentMethod")}>
              <option value="" disabled>Choose…</option>
              {Object.entries(FULFILMENT_METHOD_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ivory-300/70 sm:p-6">
        <legend className="sr-only">Cost</legend>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-plum-900">Cost {isContribution ? "and target" : ""}</h2>
          {isContribution ? <TestModeBadge /> : null}
        </div>
        {isContribution ? (
          <Notice tone="warning">Contributions are a <strong>simulation</strong> in this version of WishBridge. No real money is collected or paid out.</Notice>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Currency" htmlFor="currency" required={isContribution} error={err("currency")}>
            <Select id="currency" name="currency" defaultValue={v.currency ?? ""} aria-invalid={!!err("currency")}>
              <option value="">—</option>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Estimated cost" htmlFor="estimatedCost" error={err("estimatedCost")}>
            <Input id="estimatedCost" name="estimatedCost" inputMode="decimal" defaultValue={v.estimatedCost} placeholder="0.00" aria-invalid={!!err("estimatedCost")} />
          </Field>
          <Field label="Target amount" htmlFor="targetAmount" required={isContribution} error={err("targetAmount")} hint={isContribution ? "Required for contribution wishes." : undefined}>
            <Input id="targetAmount" name="targetAmount" inputMode="decimal" defaultValue={v.targetAmount} placeholder="0.00" aria-invalid={!!err("targetAmount")} />
          </Field>
        </div>
        <Field label="Additional information" htmlFor="additionalInfo" error={err("additionalInfo")} hint="Sizes, colours, preferred brands, timing…">
          <Textarea id="additionalInfo" name="additionalInfo" defaultValue={v.additionalInfo} maxLength={2000} rows={3} />
        </Field>
        {allowImage ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Image" htmlFor="image" hint="JPEG, PNG or WebP up to 5 MB. Location data is removed automatically.">
              <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="h-auto py-2 file:mr-3 file:rounded-full file:border-0 file:bg-plum-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-plum-800" />
            </Field>
            <Field label="Image description" htmlFor="imageAlt" hint="Describe the image for people using screen readers.">
              <Input id="imageAlt" name="imageAlt" maxLength={200} />
            </Field>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ivory-300/70 sm:p-6">
        <legend className="sr-only">Privacy</legend>
        <h2 className="text-lg font-semibold text-plum-900">Privacy</h2>
        <Checkbox name="anonymous" defaultChecked={v.anonymous === "on"} label="Post anonymously" hint="Visitors and givers will see “An anonymous wisher” instead of your username." />
        <Checkbox name="showWhenFulfilled" defaultChecked={v.showWhenFulfilled === "on"} label="Show this wish publicly once it's fulfilled" hint="Lets others celebrate it in “Recently fulfilled”. Off by default." />
      </fieldset>

      {mode === "edit" && currentStatus === "active" ? (
        <Notice tone="warning">Editing a live wish sends it back for a quick review. It will be hidden until a moderator approves the changes.</Notice>
      ) : null}
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {currentStatus === undefined || currentStatus === "draft" || currentStatus === "changes_requested" ? (
          <SubmitButton name="intent" value="draft" variant="secondary" pendingLabel="Saving…">Save draft</SubmitButton>
        ) : null}
        <SubmitButton name="intent" value="submit" variant="coral" pendingLabel="Submitting…">
          {currentStatus === "pending_review" || currentStatus === "active" ? "Save changes" : "Submit for review"}
        </SubmitButton>
      </div>
    </form>
  );
}
