import type { ReactNode } from "react";
import type { Tone } from "@/lib/domain";
import { cn } from "@/lib/cn";

const tones: Record<Tone, string> = {
  neutral: "bg-ivory-200 text-ink-soft ring-ivory-300",
  info: "bg-plum-50 text-plum-700 ring-plum-100",
  success: "bg-sage-50 text-sage-700 ring-sage-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-700/15",
  danger: "bg-coral-50 text-coral-700 ring-coral-100",
  accent: "bg-coral-50 text-coral-700 ring-coral-100",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tones[tone], className)}>
      {children}
    </span>
  );
}

export function TestModeBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-700/20", className)}>
      Test mode
    </span>
  );
}
