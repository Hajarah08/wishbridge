"use client";

import { useRef, type ReactNode } from "react";
import { Button } from "./button";

/** Accessible modal built on the native <dialog> element (focus trap + Esc for free). */
export function Dialog({
  trigger,
  title,
  description,
  children,
  triggerVariant = "secondary",
  triggerSize = "md",
  triggerClassName,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  children: () => ReactNode;
  triggerVariant?: "primary" | "secondary" | "coral" | "ghost" | "danger" | "success";
  triggerSize?: "sm" | "md" | "lg";
  triggerClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} className={triggerClassName} onClick={() => ref.current?.showModal()}>
        {trigger}
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="dialog-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-ink shadow-lift"
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
      >
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="dialog-title" className="text-xl font-semibold text-plum-900">{title}</h2>
              {description ? <div className="mt-1 text-sm text-ink-soft">{description}</div> : null}
            </div>
            <button type="button" onClick={close} className="rounded-full p-1 text-ink-soft hover:bg-ivory-200" aria-label="Close">
              <svg viewBox="0 0 20 20" className="size-5" fill="currentColor" aria-hidden><path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4z" /></svg>
            </button>
          </div>
          {children()}
        </div>
      </dialog>
    </>
  );
}
