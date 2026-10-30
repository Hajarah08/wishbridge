import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategoryOptions } from "@/lib/dashboard";
import { WishForm } from "@/components/dashboard/wish-form";
import { Notice, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Make a wish" };

export default async function NewWishPage() {
  const viewer = await requireViewer("/dashboard/wishes/new");
  const supabase = await createClient();
  const [categories, { data: settings }] = await Promise.all([
    getCategoryOptions(),
    supabase.from("user_settings").select("anonymous_wishing_default").eq("user_id", viewer.id).single(),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Make a wish" description="Save it as a draft, or submit it for a quick review. Only approved wishes are shown publicly." />
      {viewer.status !== "active" ? (
        <Notice tone="warning">Your account is restricted, so you can&apos;t create wishes right now.</Notice>
      ) : (
        <>
          <Notice tone="info" className="mb-6">
            Please read our <a className="font-semibold underline" href="/legal/guidelines" target="_blank">community guidelines</a>. Illegal requests,
            requests for passwords or financial details, and anything that endangers children are never allowed.
          </Notice>
          <WishForm categories={categories} mode="create" allowImage initial={{ anonymous: settings?.anonymous_wishing_default ? "on" : undefined }} />
        </>
      )}
    </div>
  );
}
