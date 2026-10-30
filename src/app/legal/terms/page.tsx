import type { Metadata } from "next";
import { ContentPage } from "@/components/content";

export const metadata: Metadata = { title: "Terms of service (draft)" };

export default function TermsPage() {
  return (
    <ContentPage title="Terms of service" intro="Last updated: 30 October 2026" legalDraft>
      <h2>1. About WishBridge</h2>
      <p>WishBridge (&quot;we&quot;, &quot;us&quot;) provides an online platform where users can post wishes and other users can offer to fulfil them. WishBridge is not a charity, bank, payment institution or escrow service, and does not guarantee that any wish will be fulfilled.</p>
      <h2>2. Eligibility and accounts</h2>
      <p>You must be at least 18 years old (or the age of majority where you live) to create an account. Wishes involving children must be posted by a parent or legal guardian. You are responsible for keeping your login details secure and for activity on your account.</p>
      <h2>3. Your content</h2>
      <p>You keep ownership of the content you post, and grant us a licence to host, display and moderate it for the purpose of operating the service. You confirm your content is accurate, lawful and complies with our Community Guidelines.</p>
      <h2>4. Moderation</h2>
      <p>We may review, refuse, edit for safety, suspend or remove any wish, and restrict or suspend accounts, at our discretion — including to comply with law or protect users. Decisions are recorded in an audit log.</p>
      <h2>5. Offers and fulfilment</h2>
      <p>Offers to fulfil a wish are voluntary arrangements between users. A wisher may accept or decline any offer. WishBridge facilitates communication and records confirmations but is not a party to the gift and is not responsible for the quality, safety or delivery of items or services.</p>
      <h2>6. Payments (test mode)</h2>
      <p>In the current version, contributions are a simulation only. No money is collected, transferred or held. If real payments are introduced, they will be provided by a regulated third-party payment provider under additional terms, and may require identity verification.</p>
      <h2>7. Prohibited conduct</h2>
      <p>You must not use WishBridge for anything illegal, fraudulent, harassing or harmful; to obtain passwords, financial credentials or identity documents; to endanger children; or to circumvent our safety features.</p>
      <h2>8. Disclaimers and liability</h2>
      <p>The service is provided &quot;as is&quot;. To the extent permitted by law, we are not liable for indirect or consequential losses, or for the acts of other users. Nothing in these terms limits liability that cannot be limited by law.</p>
      <h2>9. Termination</h2>
      <p>You may stop using WishBridge and request account deletion at any time via the support page. We may suspend or terminate accounts that breach these terms.</p>
      <h2>10. Changes and governing law</h2>
      <p>We may update these terms and will notify users of material changes. [Governing law and dispute-resolution clause to be determined with legal counsel.]</p>
    </ContentPage>
  );
}
