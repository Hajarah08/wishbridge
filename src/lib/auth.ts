import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  email: string | undefined;
  username: string;
  role: "user" | "admin";
  status: "active" | "restricted" | "suspended";
};

/** The signed-in user with profile and account standing, or null. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: account }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("accounts").select("role, status").eq("id", user.id).single(),
  ]);
  if (!profile || !account) return null;
  return { id: user.id, email: user.email, username: profile.username, role: account.role, status: account.status };
});

export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return viewer;
}

/** Server-side admin gate for pages. The database re-checks on every admin RPC. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (viewer.role !== "admin" || viewer.status !== "active") redirect("/dashboard?denied=admin");
  return viewer;
}
