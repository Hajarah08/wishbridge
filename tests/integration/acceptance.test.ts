/**
 * End-to-end acceptance workflow against the real local Supabase stack
 * (GoTrue auth, PostgREST, Postgres RLS + functions). Numbered comments map to
 * the acceptance criteria in the product specification (§16).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { anonClient, registerUser, serviceClient, signIn, wishArgs, type Client } from "./helpers";

let wisher: Awaited<ReturnType<typeof registerUser>>;
let giver: Awaited<ReturnType<typeof registerUser>>;
let other: Awaited<ReturnType<typeof registerUser>>;
let admin: { client: Client; id: string };
let anon: Client;
let wishId: string;
let offerId: string;

beforeAll(async () => {
  [wisher, giver, other] = await Promise.all([registerUser("wisher"), registerUser("giver"), registerUser("other")]);
  admin = await signIn("admin@wishbridge.test", "WishBridge2026");
  anon = anonClient();
});

describe("1. registration", () => {
  it("creates a public profile, private account (role user) and settings", async () => {
    const { data: profile } = await wisher.client.from("profiles").select("username").eq("id", wisher.id).single();
    expect(profile?.username).toBe(wisher.username);
    const { data: account } = await wisher.client.from("accounts").select("role, status").eq("id", wisher.id).single();
    expect(account).toEqual({ role: "user", status: "active" });
    const { data: settings } = await wisher.client.from("user_settings").select("anonymous_giving_default").eq("user_id", wisher.id).single();
    expect(settings?.anonymous_giving_default).toBe(true);
  });

  it("users cannot make themselves administrators", async () => {
    const { error } = await wisher.client.from("accounts").update({ role: "admin" }).eq("id", wisher.id);
    expect(error).not.toBeNull();
    const { data } = await wisher.client.from("accounts").select("role").eq("id", wisher.id).single();
    expect(data?.role).toBe("user");
  });
});

describe("2-3. wish creation and review queue", () => {
  it("creates a draft that is not public", async () => {
    const { data, error } = await wisher.client.rpc("create_wish", wishArgs());
    expect(error).toBeNull();
    wishId = data!;
    const { data: w } = await wisher.client.from("wishes").select("status").eq("id", wishId).single();
    expect(w?.status).toBe("draft");
    const { data: pub } = await anon.from("public_wishes").select("id").eq("id", wishId);
    expect(pub).toEqual([]);
  });

  it("rejects invalid input on the server", async () => {
    const { error } = await wisher.client.rpc("create_wish", wishArgs({ p_title: "Hi" }));
    expect(error?.code).toBe("22023");
    const { error: e2 } = await wisher.client.rpc("create_wish", wishArgs({ p_fulfilment_method: "monetary_contribution" }));
    expect(e2?.message).toMatch(/target amount/i);
  });

  it("submission enters the review queue and notifies the wisher", async () => {
    expect((await wisher.client.rpc("submit_wish", { p_wish_id: wishId })).error).toBeNull();
    const { data: queue } = await admin.client.from("wishes").select("id").eq("status", "pending_review");
    expect(queue?.map((q) => q.id)).toContain(wishId);
    const { data: notes } = await wisher.client.from("notifications").select("type").eq("type", "wish_submitted");
    expect(notes?.length).toBeGreaterThan(0);
  });
});

describe("4. administrator approval", () => {
  it("non-admins cannot moderate", async () => {
    const { error } = await giver.client.rpc("admin_moderate_wish", { p_wish_id: wishId, p_action: "approve" });
    expect(error?.code).toBe("42501");
    const { error: e2 } = await anon.rpc("admin_moderate_wish", { p_wish_id: wishId, p_action: "approve" });
    expect(e2).not.toBeNull();
  });

  it("admin approval publishes the wish, notifies the wisher and is audited", async () => {
    const { data, error } = await admin.client.rpc("admin_moderate_wish", { p_wish_id: wishId, p_action: "approve" });
    expect(error).toBeNull();
    expect(data).toBe("active");
    const { data: notes } = await wisher.client.from("notifications").select("type").eq("type", "wish_approved");
    expect(notes?.length).toBe(1);
    const { data: audit } = await admin.client.from("audit_logs").select("action, actor_id").eq("entity_id", wishId);
    expect(audit).toContainEqual({ action: "wish.approve", actor_id: admin.id });
  });
});

describe("5-6. public listing and viewing", () => {
  it("appears in public listings without private identifiers", async () => {
    const { data } = await anon.from("public_wishes").select("*").eq("id", wishId).single();
    expect(data?.status).toBe("active");
    expect(data?.wisher_username).toBe(wisher.username);
    expect(Object.keys(data!)).not.toContain("owner_id");
  });

  it("anonymous wishers are not identifiable", async () => {
    const { data: id } = await wisher.client.rpc("create_wish", wishArgs({ p_wisher_identity: "anonymous", p_submit: true }));
    await admin.client.rpc("admin_moderate_wish", { p_wish_id: id!, p_action: "approve" });
    const { data } = await anon.from("public_wishes").select("*").eq("id", id!).single();
    expect(data?.wisher_username).toBeNull();
    expect(JSON.stringify(data)).not.toContain(wisher.username);
    expect(JSON.stringify(data)).not.toContain(wisher.id);
  });

  it("a second user can view the wish (base table stays private)", async () => {
    const { data: pub } = await giver.client.from("public_wishes").select("title").eq("id", wishId).single();
    expect(pub?.title).toContain("telescope");
    const { data: base } = await giver.client.from("wishes").select("id").eq("id", wishId);
    expect(base).toEqual([]);
  });
});

describe("7 & 15. fulfilment offers and duplicate protection", () => {
  it("wishers cannot offer on their own wish", async () => {
    const { error } = await wisher.client.rpc("make_offer", { p_wish_id: wishId, p_idempotency_key: randomUUID() });
    expect(error?.code).toBe("42501");
  });

  it("creates an anonymous offer; replays with the same key are idempotent", async () => {
    const key = randomUUID();
    const args = { p_wish_id: wishId, p_idempotency_key: key, p_message: "Happy to help!", p_is_anonymous: true };
    const [a, b] = await Promise.all([giver.client.rpc("make_offer", args), giver.client.rpc("make_offer", args)]);
    // Concurrent duplicates: one wins; the other either returns the same id or a safe conflict.
    const ids = [a, b].filter((r) => !r.error).map((r) => r.data);
    expect(ids.length).toBeGreaterThan(0);
    offerId = ids[0]!;
    const replay = await giver.client.rpc("make_offer", args);
    expect(replay.data).toBe(offerId);
    const { data: rows } = await giver.client.from("fulfilment_offers").select("id").eq("wish_id", wishId);
    expect(rows?.length).toBe(1);
  });

  it("a second open offer from the same giver is refused", async () => {
    const { error } = await giver.client.rpc("make_offer", { p_wish_id: wishId, p_idempotency_key: randomUUID() });
    expect(error?.message).toMatch(/already have an open offer/i);
  });

  it("another user can also offer", async () => {
    const { error } = await other.client.rpc("make_offer", { p_wish_id: wishId, p_idempotency_key: randomUUID(), p_is_anonymous: false });
    expect(error).toBeNull();
  });
});

describe("8-10. acceptance, anonymity and notifications", () => {
  it("only the wisher can accept or decline", async () => {
    const { error } = await giver.client.rpc("respond_to_offer", { p_offer_id: offerId, p_accept: true });
    expect(error).not.toBeNull();
    const { error: e2 } = await other.client.rpc("respond_to_offer", { p_offer_id: offerId, p_accept: true });
    expect(e2).not.toBeNull();
  });

  it("the wisher sees offers with display labels only — never giver identity", async () => {
    const { data, error } = await wisher.client.rpc("get_wish_offers", { p_wish_id: wishId });
    expect(error).toBeNull();
    const mine = data!.find((o) => o.id === offerId)!;
    expect(mine.giver_display).toBe("An anonymous giver");
    const named = data!.find((o) => o.id !== offerId)!;
    expect(named.giver_display).toBe(`@${other.username}`);
    const json = JSON.stringify(data);
    expect(json).not.toContain(giver.id);
    expect(json).not.toContain(giver.username);
    expect(json).not.toContain(giver.email);
    // Direct table access does not leak giver_id either.
    const { data: direct } = await wisher.client.from("fulfilment_offers").select("giver_id").eq("wish_id", wishId);
    expect(direct).toEqual([]);
  });

  it("other users cannot read the wish's offers", async () => {
    const { error } = await other.client.rpc("get_wish_offers", { p_wish_id: wishId });
    expect(error).not.toBeNull();
  });

  it("accepting moves the wish to fulfilment pending and notifies the giver", async () => {
    expect((await wisher.client.rpc("respond_to_offer", { p_offer_id: offerId, p_accept: true })).error).toBeNull();
    // duplicate click is harmless
    expect((await wisher.client.rpc("respond_to_offer", { p_offer_id: offerId, p_accept: true })).error).toBeNull();
    const { data: pub } = await anon.from("public_wishes").select("status").eq("id", wishId).single();
    expect(pub?.status).toBe("fulfilment_pending");
    const { data: notes } = await giver.client.from("notifications").select("type, body").eq("type", "offer_accepted");
    expect(notes?.length).toBe(1);
  });

  it("only one offer can be accepted at a time", async () => {
    const { data } = await wisher.client.rpc("get_wish_offers", { p_wish_id: wishId });
    const second = data!.find((o) => o.id !== offerId)!;
    const { error } = await wisher.client.rpc("respond_to_offer", { p_offer_id: second.id, p_accept: true });
    expect(error).not.toBeNull();
  });

  it("wisher notifications never reveal the anonymous giver", async () => {
    const { data } = await wisher.client.from("notifications").select("title, body, link");
    const json = JSON.stringify(data);
    expect(json).toContain("An anonymous giver");
    expect(json).not.toContain(giver.username);
    expect(json).not.toContain(giver.id);
  });

  it("the private offer thread hides giver identity from the wisher", async () => {
    await giver.client.rpc("send_offer_message", { p_offer_id: offerId, p_body: "I'll send an e-gift card." });
    const { data, error } = await wisher.client.rpc("get_offer_thread", { p_offer_id: offerId });
    expect(error).toBeNull();
    const json = JSON.stringify(data);
    expect(json).toContain("e-gift card");
    expect(json).not.toContain(giver.id);
    expect(json).not.toContain(giver.username);
    const { error: e2 } = await other.client.rpc("get_offer_thread", { p_offer_id: offerId });
    expect(e2).not.toBeNull();
  });
});

describe("11. status changes only through authorised actions", () => {
  it("wishers cannot mark delivered; givers cannot confirm receipt", async () => {
    expect((await wisher.client.rpc("offer_action", { p_offer_id: offerId, p_action: "mark_delivered" })).error?.code).toBe("42501");
    expect((await giver.client.rpc("offer_action", { p_offer_id: offerId, p_action: "confirm_received" })).error?.code).toBe("42501");
  });

  it("the wisher cannot confirm before the giver reports delivery", async () => {
    const { error } = await wisher.client.rpc("offer_action", { p_offer_id: offerId, p_action: "confirm_received" });
    expect(error?.code).toBe("55000");
  });

  it("direct status writes are refused", async () => {
    const { error } = await wisher.client.from("wishes").update({ status: "fulfilled" }).eq("id", wishId);
    expect(error).not.toBeNull();
  });

  it("completes only after both sides confirm", async () => {
    expect((await giver.client.rpc("offer_action", { p_offer_id: offerId, p_action: "mark_delivered" })).error).toBeNull();
    let { data: pub } = await anon.from("public_wishes").select("status").eq("id", wishId).maybeSingle();
    expect(pub?.status).toBe("fulfilment_pending");
    expect((await wisher.client.rpc("offer_action", { p_offer_id: offerId, p_action: "confirm_received" })).error).toBeNull();
    const { data: w } = await wisher.client.from("wishes").select("status").eq("id", wishId).single();
    expect(w?.status).toBe("fulfilled");
    // Not consented to public display after fulfilment.
    ({ data: pub } = await anon.from("public_wishes").select("status").eq("id", wishId).maybeSingle());
    expect(pub).toBeNull();
    // The other pending offer was closed and its giver told.
    const { data: notes } = await other.client.from("notifications").select("type").eq("type", "offer_cancelled");
    expect(notes?.length).toBe(1);
  });
});

describe("12. reports and investigation", () => {
  let reportId: string;
  let reportedWish: string;
  it("users can report; duplicates are collapsed", async () => {
    const { data: w } = await other.client.rpc("create_wish", wishArgs({ p_title: "Suspicious wish for testing reports", p_submit: true }));
    reportedWish = w!;
    await admin.client.rpc("admin_moderate_wish", { p_wish_id: reportedWish, p_action: "approve" });
    const a = await giver.client.rpc("report_wish", { p_wish_id: reportedWish, p_reason: "fraud_or_scam", p_details: "Looks off" });
    const b = await giver.client.rpc("report_wish", { p_wish_id: reportedWish, p_reason: "fraud_or_scam" });
    expect(a.error).toBeNull();
    expect(b.data).toBe(a.data);
    reportId = a.data!;
    const { error } = await anon.rpc("report_wish", { p_wish_id: reportedWish, p_reason: "spam" });
    expect(error).not.toBeNull();
  });

  it("the reported wisher cannot see the report", async () => {
    const { data } = await other.client.from("reports").select("id").eq("wish_id", reportedWish);
    expect(data).toEqual([]);
  });

  it("an admin investigates, suspends and resolves; actions are audited", async () => {
    expect((await giver.client.rpc("admin_update_report", { p_report_id: reportId, p_status: "resolved" })).error).not.toBeNull();
    expect((await admin.client.rpc("admin_update_report", { p_report_id: reportId, p_status: "investigating", p_note: "Checking" })).error).toBeNull();
    expect((await admin.client.rpc("admin_moderate_wish", { p_wish_id: reportedWish, p_action: "suspend" })).error?.code).toBe("22023");
    expect((await admin.client.rpc("admin_moderate_wish", { p_wish_id: reportedWish, p_action: "suspend", p_note: "Under investigation" })).error).toBeNull();
    const { data: pub } = await anon.from("public_wishes").select("id").eq("id", reportedWish);
    expect(pub).toEqual([]);
    expect((await admin.client.rpc("admin_update_report", { p_report_id: reportId, p_status: "resolved", p_note: "Confirmed spam" })).error).toBeNull();
    const { data: notes } = await giver.client.from("notifications").select("type").eq("type", "report_update");
    expect(notes?.length).toBe(1);
    const { data: audit } = await admin.client.from("audit_logs").select("action").eq("entity_id", reportId);
    expect(audit?.map((a) => a.action)).toEqual(expect.arrayContaining(["report.investigating", "report.resolved"]));
  });
});

describe("13. unauthorised users cannot read private data", () => {
  it("anonymous visitors see nothing private", async () => {
    for (const table of ["profiles", "accounts", "wishes", "notifications", "fulfilment_offers", "contributions", "reports", "audit_logs", "support_requests", "offer_messages"] as const) {
      const { data } = await anon.from(table).select("*").limit(5);
      expect(data ?? [], `anon read ${table}`).toEqual([]);
    }
  });

  it("users cannot read each other's private rows", async () => {
    const { data: notes } = await other.client.from("notifications").select("user_id");
    expect(new Set(notes?.map((n) => n.user_id))).toEqual(new Set(notes?.length ? [other.id] : []));
    const { data: profiles } = await other.client.from("profiles").select("id");
    expect(profiles?.map((p) => p.id)).toEqual([other.id]);
    const { data: audit } = await other.client.from("audit_logs").select("id");
    expect(audit).toEqual([]);
    const { error } = await other.client.rpc("admin_list_users", {});
    expect(error?.code).toBe("42501");
  });

  it("users cannot mark someone else's notifications read", async () => {
    const { data: before } = await wisher.client.from("notifications").select("id").is("read_at", null);
    await other.client.from("notifications").update({ read_at: new Date().toISOString() }).neq("user_id", other.id);
    const { data: after } = await wisher.client.from("notifications").select("id").is("read_at", null);
    expect(after?.length).toBe(before?.length);
  });

  it("only the server (service role) can record payment outcomes", async () => {
    const { error } = await giver.client.rpc("record_contribution_result", { p_contribution_id: randomUUID(), p_succeeded: true, p_provider_reference: "x" });
    expect(error).not.toBeNull();
  });
});

describe("14. users cannot modify another user's wishes", () => {
  let target: string;
  beforeAll(async () => {
    const { data } = await wisher.client.rpc("create_wish", wishArgs({ p_title: "Wish that others must not touch" }));
    target = data!;
  });
  it("update, submit, withdraw and image calls by non-owners fail", async () => {
    const { p_title: _t, ...rest } = wishArgs();
    void _t;
    expect((await giver.client.rpc("update_wish", { p_wish_id: target, p_title: "Hijacked title here", ...rest })).error?.code).toBe("P0002");
    expect((await giver.client.rpc("submit_wish", { p_wish_id: target })).error).not.toBeNull();
    expect((await giver.client.rpc("withdraw_wish", { p_wish_id: target })).error).not.toBeNull();
    expect((await giver.client.from("wishes").update({ title: "Hijacked" }).eq("id", target)).error).not.toBeNull();
    const { data } = await wisher.client.from("wishes").select("title, status").eq("id", target).single();
    expect(data).toEqual({ title: "Wish that others must not touch", status: "draft" });
  });
});

describe("test-mode contributions", () => {
  let cWish: string;
  const service = () => serviceClient();
  beforeAll(async () => {
    const { data } = await wisher.client.rpc("create_wish", wishArgs({
      p_title: "Contribution goal for integration test", p_wish_type: "financial_goal",
      p_fulfilment_method: "monetary_contribution", p_target_amount_minor: 10000, p_estimated_cost_minor: undefined, p_submit: true,
    }));
    cWish = data!;
    await admin.client.rpc("admin_moderate_wish", { p_wish_id: cWish, p_action: "approve" });
  });

  it("records simulated contributions idempotently and labels them as test mode", async () => {
    const key = randomUUID();
    const { data: id } = await giver.client.rpc("create_contribution_intent", { p_wish_id: cWish, p_amount_minor: 4000, p_idempotency_key: key });
    const replay = await giver.client.rpc("create_contribution_intent", { p_wish_id: cWish, p_amount_minor: 4000, p_idempotency_key: key });
    expect(replay.data).toBe(id);
    const r1 = await service().rpc("record_contribution_result", { p_contribution_id: id!, p_succeeded: true, p_provider_reference: `sim_${key}` });
    const r2 = await service().rpc("record_contribution_result", { p_contribution_id: id!, p_succeeded: true, p_provider_reference: `sim_${key}` });
    expect([r1.data, r2.data]).toEqual(["succeeded", "succeeded"]);
    const { data: pub } = await anon.from("public_wishes").select("test_pledged_minor, progress_percent").eq("id", cWish).single();
    expect(pub).toEqual({ test_pledged_minor: 4000, progress_percent: 40 });
    const { data: mine } = await giver.client.from("contributions").select("mode").eq("id", id!).single();
    expect(mine?.mode).toBe("test");
  });

  it("refuses over-contribution and self-contribution", async () => {
    expect((await giver.client.rpc("create_contribution_intent", { p_wish_id: cWish, p_amount_minor: 9000, p_idempotency_key: randomUUID() })).error?.code).toBe("22023");
    expect((await wisher.client.rpc("create_contribution_intent", { p_wish_id: cWish, p_amount_minor: 100, p_idempotency_key: randomUUID() })).error?.code).toBe("42501");
  });

  it("reaching the target needs wisher confirmation before fulfilment", async () => {
    const { data: id } = await other.client.rpc("create_contribution_intent", { p_wish_id: cWish, p_amount_minor: 6000, p_idempotency_key: randomUUID(), p_is_anonymous: true });
    await service().rpc("record_contribution_result", { p_contribution_id: id!, p_succeeded: true, p_provider_reference: `sim_${randomUUID()}` });
    const { data: w } = await wisher.client.from("wishes").select("status").eq("id", cWish).single();
    expect(w?.status).toBe("fulfilment_pending");
    const { data: list } = await wisher.client.rpc("get_wish_contributions", { p_wish_id: cWish });
    expect(JSON.stringify(list)).not.toContain(other.id);
    expect(list?.some((c) => c.supporter_display === "An anonymous giver")).toBe(true);
    expect((await giver.client.rpc("confirm_wish_fulfilled", { p_wish_id: cWish })).error).not.toBeNull();
    expect((await wisher.client.rpc("confirm_wish_fulfilled", { p_wish_id: cWish })).error).toBeNull();
  });

  it("live-mode records are rejected by the database", async () => {
    const { error } = await service().from("contributions").insert({
      wish_id: cWish, contributor_id: giver.id, amount_minor: 100, currency: "GBP", mode: "live", provider: "stripe", idempotency_key: randomUUID(),
    });
    expect(error?.message).toMatch(/test_mode_only/);
  });
});

describe("withdrawal and account restriction", () => {
  it("withdrawing closes open offers and notifies givers", async () => {
    const { data: id } = await wisher.client.rpc("create_wish", wishArgs({ p_title: "Wish that will be withdrawn", p_submit: true }));
    await admin.client.rpc("admin_moderate_wish", { p_wish_id: id!, p_action: "approve" });
    const { data: oid } = await other.client.rpc("make_offer", { p_wish_id: id!, p_idempotency_key: randomUUID() });
    expect((await wisher.client.rpc("withdraw_wish", { p_wish_id: id!, p_reason: "No longer needed" })).error).toBeNull();
    const { data: offer } = await other.client.from("fulfilment_offers").select("status").eq("id", oid!).single();
    expect(offer?.status).toBe("cancelled");
  });

  it("restricted accounts cannot create wishes or offers; admins cannot restrict themselves", async () => {
    const victim = await registerUser("restricted");
    expect((await admin.client.rpc("admin_set_account_status", { p_user_id: victim.id, p_status: "restricted" })).error?.code).toBe("22023");
    expect((await admin.client.rpc("admin_set_account_status", { p_user_id: victim.id, p_status: "restricted", p_reason: "Spam behaviour" })).error).toBeNull();
    expect((await victim.client.rpc("create_wish", wishArgs())).error?.code).toBe("42501");
    expect((await admin.client.rpc("admin_set_account_status", { p_user_id: admin.id, p_status: "restricted", p_reason: "test self" })).error?.code).toBe("42501");
  });
});
