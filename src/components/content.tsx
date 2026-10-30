import type { ReactNode } from "react";
import { Notice } from "./ui/misc";

export function ContentPage({ title, intro, children, legalDraft }: { title: string; intro?: ReactNode; children: ReactNode; legalDraft?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold text-plum-900 sm:text-4xl">{title}</h1>
      {intro ? <p className="mt-3 text-lg text-ink-soft">{intro}</p> : null}
      {legalDraft ? (
        <Notice tone="warning" title="Draft — requires legal review" className="mt-6">
          This document is a working draft prepared for the WishBridge MVP. It has not been reviewed by a lawyer and must be reviewed
          and adapted by a qualified legal professional for each jurisdiction before public launch.
        </Notice>
      ) : null}
      <div className="prose-legal mt-8">{children}</div>
    </div>
  );
}
