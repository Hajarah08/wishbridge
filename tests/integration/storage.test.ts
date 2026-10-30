import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { anonClient, registerUser, signIn, wishArgs } from "./helpers";

let png: Buffer;
beforeAll(async () => {
  png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#e8664f" } }).webp().toBuffer();
});

describe("wish image storage", () => {
  it("owners upload to their own draft; others cannot; visibility follows the wish", async () => {
    const owner = await registerUser("imgowner");
    const stranger = await registerUser("imgstranger");
    const admin = await signIn("admin@wishbridge.test", "WishBridge2026");
    const { data: wishId } = await owner.client.rpc("create_wish", wishArgs({ p_title: "Wish with an image attached" }));
    const path = `${wishId}/${randomUUID()}.webp`;

    const bad = await stranger.client.storage.from("wish-images").upload(`${wishId}/${randomUUID()}.webp`, png, { contentType: "image/webp" });
    expect(bad.error).not.toBeNull();

    const ok = await owner.client.storage.from("wish-images").upload(path, png, { contentType: "image/webp" });
    expect(ok.error).toBeNull();
    expect((await stranger.client.rpc("add_wish_image", { p_wish_id: wishId!, p_storage_path: path })).error).not.toBeNull();
    expect((await owner.client.rpc("add_wish_image", { p_wish_id: wishId!, p_storage_path: path, p_width: 40, p_height: 30 })).error).toBeNull();

    // Not public while in draft
    const anon = anonClient();
    expect((await anon.storage.from("wish-images").createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await owner.client.storage.from("wish-images").createSignedUrl(path, 60)).error).toBeNull();

    await owner.client.rpc("submit_wish", { p_wish_id: wishId! });
    await admin.client.rpc("admin_moderate_wish", { p_wish_id: wishId!, p_action: "approve" });
    const signed = await anon.storage.from("wish-images").createSignedUrl(path, 60);
    expect(signed.error).toBeNull();
    const res = await fetch(signed.data!.signedUrl);
    expect(res.status).toBe(200);
    const { data: pub } = await anon.from("public_wishes").select("cover_image_path").eq("id", wishId!).single();
    expect(pub?.cover_image_path).toBe(path);

    // Approved wishes lock their images
    const late = await owner.client.storage.from("wish-images").upload(`${wishId}/${randomUUID()}.webp`, png, { contentType: "image/webp" });
    expect(late.error).not.toBeNull();
  });
});
