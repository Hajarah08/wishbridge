import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ivory-300/70 sm:p-6", className)}>{children}</div>;
}

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    info: "bg-plum-50 text-plum-800 ring-plum-100",
    success: "bg-sage-50 text-sage-700 ring-sage-100",
    warning: "bg-amber-50 text-amber-700 ring-amber-700/15",
    danger: "bg-coral-50 text-coral-700 ring-coral-100",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl px-4 py-3 text-sm ring-1 ring-inset", styles, className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-0.5" : undefined}>{children}</div>
    </div>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-ivory-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p}
        aria-label={label ?? "Progress"}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-coral-400 to-coral-500 transition-[width] duration-700" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-plum-200 bg-white/60 px-6 py-12 text-center">
      <div aria-hidden className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-coral-50 text-2xl">✨</div>
      <h3 className="text-lg font-semibold text-plum-900">{title}</h3>
      {children ? <div className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-plum-900 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ivory-300/70">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-plum-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}
