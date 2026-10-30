"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Deliberately generic: never render raw error details to users.
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-5xl" aria-hidden>🧶</p>
      <h1 className="mt-4 text-3xl font-semibold text-plum-900">Something went wrong</h1>
      <p className="mt-2 text-ink-soft">Please try again. If it keeps happening, contact support.</p>
      <Button onClick={reset} className="mt-6">Try again</Button>
    </div>
  );
}
