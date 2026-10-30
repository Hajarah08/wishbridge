#!/usr/bin/env node
// Grants the admin role to an existing user. Run only from a trusted machine.
// Usage: SUPABASE_SECRET_KEY=... NEXT_PUBLIC_SUPABASE_URL=... npm run make-admin -- person@example.com
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const email = process.argv[2]?.toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !url || !key) {
  console.error("Usage: npm run make-admin -- <email>  (requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY)");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
let user;
for (let page = 1; !user; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email);
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`No user found with email ${email}. They must sign up first.`);
  process.exit(1);
}
const { error } = await supabase.from("accounts").update({ role: "admin" }).eq("id", user.id);
if (error) throw error;
await supabase.from("audit_logs").insert({ actor_role: "system", action: "account.grant_admin", entity_type: "account", entity_id: user.id, details: { via: "scripts/make-admin.mjs" } });
console.log(`✓ ${email} is now an administrator.`);
