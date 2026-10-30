"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/lib/errors";
import { Notice } from "./misc";

/**
 * Small wrapper for forms that call a server action returning ActionState.
 * Shows the result inline and lets children read field errors via render prop.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode | ((state: ActionState) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
    }
  }, [state, resetOnSuccess, onSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      {typeof children === "function" ? children(state) : children}
      {state.error ? <Notice tone="danger" className="mt-3">{state.error}</Notice> : null}
      {state.ok && state.message ? <Notice tone="success" className="mt-3">{state.message}</Notice> : null}
    </form>
  );
}
