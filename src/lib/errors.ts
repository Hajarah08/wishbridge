// Maps database / auth errors to messages that are safe to show users.
// Messages raised deliberately by our SQL functions use known SQLSTATE codes and
// are written for end users; anything else gets a generic message.
const SAFE_CODES = new Set(["22023", "42501", "55000", "P0002", "23505", "WB429"]);

type MaybePgError = { code?: string; message?: string } | null | undefined;

export function friendlyError(error: MaybePgError, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  if (error.code && SAFE_CODES.has(error.code) && error.message) {
    if (error.code === "23505" && /duplicate key|unique constraint/i.test(error.message)) {
      return "That request was already received.";
    }
    return error.message;
  }
  if (process.env.NODE_ENV !== "production") {
    console.error("[wishbridge] unexpected error", error);
  }
  return fallback;
}

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted values echoed back so forms can repopulate after an error. */
  values?: Record<string, string>;
};

export const initialActionState: ActionState = {};
