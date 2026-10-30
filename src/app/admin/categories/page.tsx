import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { upsertCategory } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Categories" };

const input = "h-9 rounded-lg border border-ivory-300 bg-white px-2 text-sm";

function CategoryFields({ c }: { c?: { id: number; slug: string; name: string; description: string | null; icon: string | null; is_active: boolean; sort_order: number } }) {
  const p = c ? `c${c.id}` : "new";
  return (
    <>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <label className="sr-only" htmlFor={`${p}-icon`}>Icon</label>
      <input id={`${p}-icon`} name="icon" defaultValue={c?.icon ?? ""} placeholder="🎁" maxLength={8} className={`${input} w-14 text-center`} />
      <label className="sr-only" htmlFor={`${p}-name`}>Name</label>
      <input id={`${p}-name`} name="name" defaultValue={c?.name} placeholder="Name" required maxLength={60} className={`${input} w-44`} />
      <label className="sr-only" htmlFor={`${p}-slug`}>Slug</label>
      <input id={`${p}-slug`} name="slug" defaultValue={c?.slug} placeholder="slug" required pattern="[a-z0-9-]{2,40}" className={`${input} w-36 font-mono`} />
      <label className="sr-only" htmlFor={`${p}-desc`}>Description</label>
      <input id={`${p}-desc`} name="description" defaultValue={c?.description ?? ""} placeholder="Description" maxLength={240} className={`${input} min-w-48 flex-1`} />
      <label className="sr-only" htmlFor={`${p}-sort`}>Sort order</label>
      <input id={`${p}-sort`} name="sortOrder" type="number" defaultValue={c?.sort_order ?? 0} className={`${input} w-20`} />
      <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isActive" defaultChecked={c?.is_active ?? true} className="accent-plum-700" /> Active</label>
    </>
  );
}

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, slug, name, description, icon, is_active, sort_order").order("sort_order");
  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Inactive categories are hidden from new wishes and filters. Changes are audited." />
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-plum-900">Add a category</h2>
        <ActionForm action={upsertCategory} resetOnSuccess className="flex flex-wrap items-center gap-2">
          <CategoryFields />
          <SubmitButton size="sm">Add</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-plum-900">Existing categories</h2>
        <ul className="space-y-3">
          {(data ?? []).map((c) => (
            <li key={c.id} className="border-b border-ivory-200 pb-3 last:border-0">
              <ActionForm action={upsertCategory} className="flex flex-wrap items-center gap-2">
                <CategoryFields c={c} />
                <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
