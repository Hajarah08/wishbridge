import type { Metadata } from "next";
import { HowItWorksSteps } from "@/components/how-it-works-steps";
import { ButtonLink } from "@/components/ui/button";
import { TestModeBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "How it works" };

const sections = [
  {
    title: "Posting a wish",
    body: [
      "Create a free account with a username — we never show your email. Describe your wish, choose a category, the type of wish and how you'd like it fulfilled.",
      "Save it as a draft for as long as you like. When you submit it, a moderator checks it against our community guidelines. They may approve it, ask for changes, or explain why it can't be published.",
      "Once approved, your wish appears in Explore. You can withdraw it at any time; anyone who has offered to help is told the wish is closed.",
    ],
  },
  {
    title: "Discovering wishes",
    body: [
      "Anyone can browse approved wishes without an account. Search by keyword and filter by category, country and status — open, being fulfilled, or fulfilled (when the wisher agreed to share it).",
    ],
  },
  {
    title: "Fulfilling a wish",
    body: [
      "Signed-in members can offer to fulfil a wish, with a short message and a plan — for example an e-gift card, click-and-collect, or a courier pickup point.",
      "The wisher accepts or declines. Accepting opens a private offer page where both of you can coordinate. Home addresses are never shared automatically.",
      "When the giver reports the gift is delivered, the wisher is asked to confirm. A wish is only marked fulfilled after the wisher confirms — or a moderator resolves a dispute. Neither side can mark it complete alone.",
    ],
  },
  {
    title: "Anonymity",
    body: [
      "Wishers can post under their username or as “an anonymous wisher”. Givers can choose to appear as “an anonymous giver”.",
      "Anonymity is enforced by our database, not just hidden on screen: an anonymous giver's identity never reaches the wisher through pages, notifications or our API. Moderators can see account details when needed for safety.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold text-plum-900 sm:text-5xl">How WishBridge works</h1>
        <p className="mt-4 text-lg text-ink-soft">From a simple wish to a confirmed gift — with moderation, privacy and two-sided confirmation at every step.</p>
      </div>
      <div className="mt-10"><HowItWorksSteps /></div>
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {sections.map((s) => (
          <section key={s.title} className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ivory-300/70">
            <h2 className="text-xl font-semibold text-plum-900">{s.title}</h2>
            {s.body.map((p, i) => <p key={i} className="mt-3 text-sm leading-relaxed text-ink-soft">{p}</p>)}
          </section>
        ))}
        <section className="rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-700/15 md:col-span-2">
          <div className="flex items-center gap-3"><h2 className="text-xl font-semibold text-plum-900">Payments and contributions</h2><TestModeBadge /></div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Some wishes accept contributions towards a target. <strong>In this version, contributions are a clearly labelled simulation</strong>:
            no card details are requested, and no money is collected, held or paid out. Simulated amounts are never presented as real money.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Real payments will only be introduced through an established, regulated payment provider after legal and compliance review —
            including identity verification where the law requires it, refunds and dispute handling. Anonymity on WishBridge will always apply to your
            public identity, not to verification that payment regulations require.
          </p>
        </section>
      </div>
      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/dashboard/wishes/new" variant="coral" size="lg">Make a Wish</ButtonLink>
        <ButtonLink href="/wishes" variant="secondary" size="lg">Fulfil a Wish</ButtonLink>
      </div>
    </div>
  );
}
