import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResendConfirmationForm, SignInForm } from "@/components/auth/forms";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
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
      {sp.error === "oauth" ? <Notice tone="warning" className="mb-4">Google sign-in didn&apos;t complete. Please try again, or sign in with your email.</Notice> : null}
      {sp.error === "rate" ? <Notice tone="warning" className="mb-4">Too many attempts. Please wait a few minutes and try again.</Notice> : null}
      <GoogleButton next={next} />
      <OrDivider />
      <SignInForm next={next} />
      <div className="mt-6"><ResendConfirmationForm open={sp.error === "link"} /></div>
    </AuthShell>
  );
}
