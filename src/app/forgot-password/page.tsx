import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a secure link to choose a new password."
      footer={<Link href="/login" className="font-semibold text-coral-700 hover:underline">Back to sign in</Link>}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
