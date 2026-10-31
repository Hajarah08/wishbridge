import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/forms";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  if (await getViewer()) redirect("/dashboard");
  return (
    <AuthShell title="Join WishBridge" subtitle="Post wishes, fulfil wishes — or both. Your email stays private."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-coral-700 hover:underline">Sign in</Link></>}>
      <GoogleButton next={sp.next ? safeNext(sp.next) : "/dashboard?welcome=1"} label="Sign up with Google" />
      <p className="mt-2 text-center text-xs text-ink-soft">
        By continuing with Google you agree to our <Link className="underline" href="/legal/terms">Terms</Link> and{" "}
        <Link className="underline" href="/legal/guidelines">Community Guidelines</Link>. Your Google name and photo are never shown publicly.
      </p>
      <OrDivider />
      <SignUpForm next={sp.next ? safeNext(sp.next) : undefined} />
    </AuthShell>
  );
}
