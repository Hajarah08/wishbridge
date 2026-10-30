import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategoryOptions } from "@/lib/dashboard";
import { WishForm } from "@/components/dashboard/wish-form";
import { Notice, PageHeader } from "@/components/ui/misc";
import { EDITABLE_WISH_STATUSES, IMAGE_EDITABLE_STATUSES } from "@/lib/domain";
import { fromMinor } from "@/lib/format";
import { uuidSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Edit wish" };

export default async function EditWishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: wish } = await supabase.from("wishes").select("*, categories(slug)").eq("id", id).eq("owner_id", viewer.id).maybeSingle();
  if (!wish) notFound();
  const categories = await getCategoryOptions();
  const cat = wish.categories as unknown as { slug: string } | null;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Edit wish" />
      {!EDITABLE_WISH_STATUSES.includes(wish.status) ? (
        <Notice tone="warning">This wish can no longer be edited.</Notice>
      ) : (
        <WishForm
          categories={categories}
          mode="edit"
          currentStatus={wish.status}
          allowImage={IMAGE_EDITABLE_STATUSES.includes(wish.status)}
          initial={{
            wishId: wish.id,
            title: wish.title,
            description: wish.description,
            category: cat?.slug,
            wishType: wish.wish_type,
            fulfilmentMethod: wish.fulfilment_method,
            country: wish.country_code,
            currency: wish.currency ?? undefined,
            estimatedCost: fromMinor(wish.estimated_cost_minor, wish.currency),
            targetAmount: fromMinor(wish.target_amount_minor, wish.currency),
            additionalInfo: wish.additional_info ?? undefined,
            anonymous: wish.wisher_identity === "anonymous" ? "on" : undefined,
            showWhenFulfilled: wish.show_when_fulfilled ? "on" : undefined,
          }}
        />
      )}
    </div>
  );
}
