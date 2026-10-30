import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/forms";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  if (await getViewer()) redirect("/dashboard");
  return (
    <AuthShell title="Join WishBridge" subtitle="Post wishes, fulfil wishes — or both. Your email stays private."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-coral-700 hover:underline">Sign in</Link></>}>
      <SignUpForm next={sp.next ? safeNext(sp.next) : undefined} />
    </AuthShell>
  );
}
