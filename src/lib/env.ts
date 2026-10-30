// Public configuration. Only NEXT_PUBLIC_* values may be read here because this
// module is imported by browser code.

/**
 * Tolerates common copy-paste slips in dashboard-entered URLs: surrounding
 * spaces or quotes, a missing scheme, trailing slashes, and (for Supabase) a
 * pasted "/rest/v1" API path. Returns "" when the value still isn't a URL.
 */
export function normalizeUrl(raw: string | undefined, { stripApiPath = false } = {}): string {
  let value = (raw ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    let path = url.pathname;
    if (stripApiPath) path = path.replace(/\/(rest|auth|storage)\/v1\/?.*$/i, "");
    return `${url.protocol}//${url.host}${path}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

export const publicEnv = {
  supabaseUrl: normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, { stripApiPath: true }),
  supabaseKey: (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  ).trim(),
  siteUrl:
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeUrl(vercelUrl) ||
    "http://localhost:3000",
};

export function assertPublicEnv() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL (e.g. https://<project>.supabase.co) and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
}
