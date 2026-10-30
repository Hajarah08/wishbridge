import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-ivory-300 bg-white px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-ink-soft/60 shadow-sm transition focus:border-plum-300 focus:outline-none focus:ring-4 focus:ring-plum-100 aria-[invalid=true]:border-coral-500 aria-[invalid=true]:ring-coral-100 disabled:bg-ivory-200";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string[] | string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-plum-900">
        {label}
        {required ? <span className="text-coral-700"> *</span> : <span className="font-normal text-ink-soft"> (optional)</span>}
      </label>
      {children}
      {hint && !message ? <p id={`${htmlFor}-hint`} className="text-xs text-ink-soft">{hint}</p> : null}
      {message ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-coral-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11 appearance-none bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%235f3a73'%3E%3Cpath d='M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, hint, className, ...props }: ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-1", className)}>
      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-plum-700" {...props} />
      <span className="text-sm">
        <span className="font-medium text-plum-900">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-ink-soft">{hint}</span> : null}
      </span>
    </label>
  );
}
