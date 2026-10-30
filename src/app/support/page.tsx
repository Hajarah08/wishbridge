import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { Card } from "@/components/ui/misc";
import { SupportForm } from "./form";

export const metadata: Metadata = { title: "Contact & support" };

export default async function SupportPage() {
  const viewer = await getViewer();
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="text-3xl font-semibold text-plum-900 sm:text-4xl">Contact &amp; support</h1>
        <p className="mt-3 text-ink-soft">Questions, account help, data requests or safety concerns — we&apos;re here.</p>
        <ul className="mt-6 space-y-3 text-sm text-ink-soft">
          <li>🔐 <strong className="text-plum-900">Account recovery:</strong> use “Forgot password” on the sign-in page.</li>
          <li>⚑ <strong className="text-plum-900">Report a wish:</strong> use the Report button on the wish itself.</li>
          <li>🗂️ <strong className="text-plum-900">Data access or deletion:</strong> send a request below from your account email.</li>
          <li>🚨 <strong className="text-plum-900">Emergencies:</strong> contact local emergency services — WishBridge can&apos;t respond in real time.</li>
        </ul>
      </div>
      <Card className="relative">
        <SupportForm email={viewer?.email} />
      </Card>
    </div>
  );
}
