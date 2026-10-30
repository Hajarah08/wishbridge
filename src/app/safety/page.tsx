import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content";

export const metadata: Metadata = { title: "Safety & trust" };

export default function SafetyPage() {
  return (
    <ContentPage title="Safety & trust" intro="Kindness works best when everyone feels safe. Here's how WishBridge protects wishers and givers.">
      <h2>Gifts are never guaranteed</h2>
      <p>WishBridge is a place to share wishes, not a promise that they&apos;ll come true. Please don&apos;t post anything you urgently depend on, and never rely on WishBridge in an emergency.</p>

      <h2>Every wish is moderated</h2>
      <p>Our moderators review each wish before it can be seen publicly, and again if it&apos;s edited after publication. We reject illegal requests, scams, harassment, attempts to collect passwords or financial details, and anything that could endanger a child. See our <Link href="/legal/guidelines" className="underline">community guidelines</Link>.</p>

      <h2>Reporting</h2>
      <p>Every wish page has a <strong>Report</strong> button. Reports are confidential — the wisher is never told who reported them — and are investigated by our team, who can pause wishes and restrict accounts.</p>

      <h2>Privacy by design</h2>
      <ul>
        <li>Your email, phone number and any payment information are never shown to other users.</li>
        <li>Wishes only show a country, never a city or address.</li>
        <li>Anonymous givers and wishers stay anonymous in pages, notifications and our API — this is enforced by database rules, not just by hiding text.</li>
        <li>Images are re-processed when uploaded, which removes hidden location (GPS) data.</li>
      </ul>

      <h2>Safe fulfilment</h2>
      <ul>
        <li>Addresses are never shared automatically. Prefer e-gift cards, retailer click-and-collect, or courier pickup points.</li>
        <li>Never send money, gift card codes or bank details to someone outside WishBridge&apos;s own flows.</li>
        <li>A wish is only marked fulfilled when the giver reports delivery <em>and</em> the wisher confirms receipt. If something goes wrong, either side can open a dispute for a moderator to review.</li>
      </ul>

      <h2>Fraud prevention</h2>
      <p>We rate-limit sensitive actions, block duplicate submissions, keep an audit trail of moderation decisions, and can restrict accounts that behave suspiciously. Real payments are not active in this version; contributions are a labelled simulation.</p>

      <h2>Need help?</h2>
      <p>Contact us through the <Link href="/support" className="underline">support page</Link>. If someone is in immediate danger, contact your local emergency services first.</p>
    </ContentPage>
  );
}
