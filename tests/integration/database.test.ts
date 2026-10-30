/** Direct SQL checks on invariants that must hold regardless of who issues the query. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { WISH_TRANSITIONS } from "@/lib/domain";

let db: pg.Client;
beforeAll(async () => {
  db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
});
afterAll(() => db.end());

describe("database invariants", () => {
  it("the UI transition mirror matches the database table exactly", async () => {
    const { rows } = await db.query("select from_status as from, to_status as to, actor from public.wish_status_transitions");
    const key = (t: { from: string; to: string; actor: string }) => `${t.from}>${t.to}:${t.actor}`;
    expect(new Set(rows.map(key))).toEqual(new Set(WISH_TRANSITIONS.map(key)));
  });

  it("the trigger blocks invalid wish transitions even for privileged sessions", async () => {
    await db.query("begin");
    try {
      await expect(
        db.query("update public.wishes set status = 'fulfilled' where id = 'b0000000-0000-4000-8000-000000000011'"),
      ).rejects.toThrow(/Invalid wish status change from draft to fulfilled/);
    } finally {
      await db.query("rollback");
    }
  });

  it("the audit log is append-only", async () => {
    await db.query("begin");
    try {
      await expect(db.query("delete from public.audit_logs")).rejects.toThrow(/append-only/);
    } finally {
      await db.query("rollback");
    }
  });

  it("RLS is enabled on every public table", async () => {
    const { rows } = await db.query(
      "select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity",
    );
    expect(rows).toEqual([]);
  });

  it("anon cannot execute privileged functions", async () => {
    const { rows } = await db.query(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
      order by 1`);
    expect(rows.map((r) => r.proname).sort()).toEqual(["public_stats", "submit_support_request", "username_available"]);
  });

  it("no view or function returns owner_id / giver_id to the public", async () => {
    const { rows } = await db.query(`
      select table_name, column_name from information_schema.columns
      where table_schema = 'public' and table_name like 'public_%'
        and column_name in ('owner_id', 'giver_id', 'contributor_id', 'provider_reference', 'reporter_id')`);
    expect(rows).toEqual([]);
  });
});
