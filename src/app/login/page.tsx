import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResendConfirmationForm, SignInForm } from "@/components/auth/forms";
import { Notice } from "@/components/ui/misc";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/dashboard");
  if (await getViewer()) redirect(next);
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your wishes and offers."
      footer={<>New to WishBridge? <Link href={`/signup${sp.next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-coral-700 hover:underline">Create an account</Link></>}>
      {sp.error === "link" ? <Notice tone="warning" className="mb-4">That link is invalid or has expired. Request a new one below, or use “Forgot password?” for a reset link.</Notice> : null}
      <SignInForm next={next} />
      <div className="mt-6"><ResendConfirmationForm open={sp.error === "link"} /></div>
    </AuthShell>
  );
}
