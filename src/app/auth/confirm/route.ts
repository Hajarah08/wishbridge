import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";

const OTP_TYPES = new Set<EmailOtpType>(["signup", "email", "recovery", "email_change", "invite", "magiclink"]);

// Handles links from auth emails (sign-up confirmation, password recovery,
// email change). Works across devices because it uses the token hash rather
// than a PKCE code tied to the browser that started the flow.
// redirect() sends a relative Location, so the session cookie set here stays
// on the same host the link was opened on.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  let ok = false;
  let type = rawType;
  if (tokenHash && rawType && OTP_TYPES.has(rawType)) {
    const { error } = await supabase.auth.verifyOtp({ type: rawType, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    type = null;
  }

  if (!ok) redirect("/login?error=link");
  redirect(type === "recovery" ? "/reset-password" : next);
}
