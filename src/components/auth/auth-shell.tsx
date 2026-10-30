import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
      <div aria-hidden className="pointer-events-none absolute -top-10 left-1/2 size-72 -translate-x-1/2 rounded-full bg-coral-100/60 blur-3xl" />
      <div className="relative rounded-3xl bg-white p-6 shadow-lift ring-1 ring-ivory-300 sm:p-8">
        <h1 className="text-2xl font-semibold text-plum-900 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-soft">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="relative mt-6 text-center text-sm text-ink-soft">{footer}</div> : null}
    </div>
  );
}
