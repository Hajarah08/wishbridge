import type { Metadata } from "next";
import { ContentPage } from "@/components/content";

export const metadata: Metadata = { title: "Privacy policy (draft)" };

export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy policy" intro="Last updated: 30 October 2026" legalDraft>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email address, hashed password, username, and optional short bio.</li>
        <li><strong>Content:</strong> wishes, images, offers, messages, reports and support requests you submit.</li>
        <li><strong>Usage and security data:</strong> sign-in times, IP-derived rate-limit counters, and audit records of moderation actions.</li>
        <li><strong>Visit statistics:</strong> aggregate, cookie-free page-view counts (pages visited, referrer, country, device type) via Vercel Web Analytics. These are not linked to your account.</li>
        <li><strong>Not collected in this version:</strong> payment card details, bank details, home addresses or identity documents.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To provide the service, moderate content, prevent fraud and abuse, respond to support requests, send in-app notifications, and meet legal obligations. [Lawful bases to be confirmed per jurisdiction, e.g. contract, legitimate interests, legal obligation.]</p>
      <h2>Who can see what</h2>
      <ul>
        <li>Public visitors see approved wishes, the country, and your username — unless you post anonymously.</li>
        <li>Wishers never see the identity of anonymous givers. Givers never see the identity of anonymous wishers.</li>
        <li>Moderators can access account information when necessary for safety, support and legal compliance.</li>
      </ul>
      <h2>Processors</h2>
      <p>We use Supabase (database, authentication and file storage) and a hosting provider for the website. [List all processors, locations and transfer safeguards before launch.]</p>
      <h2>Retention</h2>
      <p>We keep account data while your account is active, and audit/moderation records for [period to be defined] to protect users and meet legal obligations.</p>
      <h2>Your rights</h2>
      <p>Depending on where you live, you may have rights to access, correct, delete or export your data, and to object to certain processing. Contact us via the support page to exercise them.</p>
      <h2>Security</h2>
      <p>We use encryption in transit, database row-level security, server-side authorisation, rate limiting and image metadata stripping. No system is perfectly secure; please report concerns to support.</p>
      <h2>Children</h2>
      <p>WishBridge is not intended for children. Wishes for children must be posted by a parent or guardian, without identifying the child.</p>
    </ContentPage>
  );
}
