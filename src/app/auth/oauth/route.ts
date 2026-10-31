import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";
import { rateLimit } from "@/lib/rate-limit";

const PROVIDERS = new Set(["google"] as const);
type Provider = "google";

// Starts a social sign-in. A plain GET link (not a form post) so the CSP
// form-action rule doesn't block the hop to the identity provider. Supabase
// uses PKCE: the verifier cookie set here is checked in /auth/confirm.
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider") as Provider | null;
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!provider || !PROVIDERS.has(provider)) redirect("/login");
  if (!(await rateLimit("oauth", 20, 10 * 60_000))) redirect("/login?error=rate");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Same origin as this request, so the PKCE cookie is readable on return.
      redirectTo: `${request.nextUrl.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}
