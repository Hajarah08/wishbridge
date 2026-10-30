import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-5xl" aria-hidden>🌙</p>
      <h1 className="mt-4 text-3xl font-semibold text-plum-900">We couldn&apos;t find that</h1>
      <p className="mt-2 text-ink-soft">The page may have moved, or the wish is no longer public.</p>
      <ButtonLink href="/wishes" className="mt-6">Explore wishes</ButtonLink>
    </div>
  );
}
