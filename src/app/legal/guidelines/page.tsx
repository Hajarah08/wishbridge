import type { Metadata } from "next";
import { ContentPage } from "@/components/content";

export const metadata: Metadata = { title: "Community guidelines (draft)" };

export default function GuidelinesPage() {
  return (
    <ContentPage title="Community guidelines" intro="WishBridge is built on generosity and trust. These guidelines keep it that way." legalDraft>
      <h2>Wishes we love</h2>
      <ul>
        <li>Items, experiences, learning goals, creative projects, celebrations and community ideas — big or small.</li>
        <li>Honest, specific descriptions of what you&apos;d like and why it matters to you.</li>
      </ul>
      <h2>Never allowed</h2>
      <ul>
        <li>Anything illegal, including weapons, drugs, counterfeit goods, or help committing a crime.</li>
        <li>Fraud, scams, impersonation, or misleading claims.</li>
        <li>Requests for passwords, verification codes, bank or card details, identity documents, or gift card codes.</li>
        <li>Harassment, hate, threats, or sexual content.</li>
        <li>Anything that could endanger or exploit a child. Never include a child&apos;s name, school, photo of their face, or location.</li>
        <li>Personal information about yourself or others: addresses, phone numbers, emails, or social media handles.</li>
        <li>Spam, duplicate wishes, advertising, or pyramid schemes.</li>
      </ul>
      <h2>When fulfilling wishes</h2>
      <ul>
        <li>Only offer what you genuinely intend to give. Cancel promptly if your plans change.</li>
        <li>Coordinate through the private offer page and avoid exchanging home addresses.</li>
        <li>Never ask a wisher for money, fees or personal information.</li>
      </ul>
      <h2>Enforcement</h2>
      <p>Moderators may request changes, reject or suspend wishes, cancel offers, and restrict or suspend accounts. Serious harm may be reported to the authorities. If you think we got something wrong, contact support.</p>
    </ContentPage>
  );
}
