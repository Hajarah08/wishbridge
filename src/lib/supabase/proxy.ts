import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";

/** Refreshes the auth session cookie on each request and returns the user (if any). */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseKey) {
    return { response, user: null };
  }
  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getUser() validates the JWT with the auth server; never trust getSession() alone.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, user };
}
