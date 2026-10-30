const ZERO_DECIMAL = new Set(["JPY", "UGX", "RWF", "KRW", "VND"]);

export function minorUnitFactor(currency: string) {
  return ZERO_DECIMAL.has(currency) ? 1 : 100;
}

export function formatMoney(minor: number | null | undefined, currency: string | null | undefined) {
  if (minor == null || !currency) return "";
  const value = minor / minorUnitFactor(currency);
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** Parses a user-entered decimal amount into integer minor units. */
export function toMinor(input: string | number | null | undefined, currency: string): number | null {
  if (input == null || input === "") return null;
  const n = typeof input === "number" ? input : Number(String(input).replace(/[,\s]/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * minorUnitFactor(currency));
}

export function fromMinor(minor: number | null | undefined, currency: string | null | undefined) {
  if (minor == null || !currency) return "";
  return String(minor / minorUnitFactor(currency));
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export function timeAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}
