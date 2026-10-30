import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, Notice, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { PrivacyForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Settings & privacy" };

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: profile }, { data: settings }, { data: account }] = await Promise.all([
    supabase.from("profiles").select("username, bio").eq("id", viewer.id).single(),
    supabase.from("user_settings").select("*").eq("user_id", viewer.id).single(),
    supabase.from("accounts").select("status, status_reason, created_at").eq("id", viewer.id).single(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Settings & privacy" />
      <Card>
        <h2 className="text-lg font-semibold text-plum-900">Public profile</h2>
        <p className="mb-4 mt-1 text-sm text-ink-soft">This is the only identity other people can see — and only when you aren&apos;t anonymous.</p>
        <ProfileForm username={profile?.username ?? ""} bio={profile?.bio ?? ""} />
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-plum-900">Anonymity &amp; notifications</h2>
        <p className="mb-4 mt-1 text-sm text-ink-soft">Anonymity hides your public identity. It doesn&apos;t affect information we may be legally required to verify for real payments in future.</p>
        <PrivacyForm anonymousGiving={settings?.anonymous_giving_default ?? true} anonymousWishing={settings?.anonymous_wishing_default ?? false} emailNotifications={settings?.email_notifications ?? true} />
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-plum-900">Account</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-ink-soft">Email (private)</dt><dd className="font-medium">{viewer.email}</dd></div>
          <div><dt className="text-ink-soft">Standing</dt><dd><Badge tone={account?.status === "active" ? "success" : "danger"}>{account?.status}</Badge></dd></div>
        </dl>
        {account?.status !== "active" && account?.status_reason ? <Notice tone="warning" className="mt-3">Reason: {account.status_reason}</Notice> : null}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/reset-password" className="font-semibold text-coral-700 hover:underline">Change password</Link>
          <Link href="/support" className="font-semibold text-coral-700 hover:underline">Request account deletion or data export</Link>
        </div>
      </Card>
    </div>
  );
}
