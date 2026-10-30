import "server-only";
import { headers } from "next/headers";

// Per-instance, in-memory limiter for unauthenticated endpoints (sign-in,
// sign-up, password reset, contact form). It complements the durable,
// database-backed limits enforced inside SQL functions and Supabase Auth's own
// rate limits. On multi-instance hosting, replace with a shared store
// (e.g. Redis/Upstash) — see docs/SECURITY.md.
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function rateLimit(name: string, limit: number, windowMs: number): Promise<boolean> {
  const key = `${name}:${await clientIp()}`;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
