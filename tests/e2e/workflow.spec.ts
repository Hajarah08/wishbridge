import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const PASSWORD = "Testing-Pass-2026";

async function newUser(browser: Browser, prefix: string) {
  const page = await (await browser.newContext()).newPage();
  const id = randomUUID().slice(0, 6);
  const username = `${prefix}_${id}`;
  await page.goto("/signup");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(`${username}@example.test`);
  await page.locator("#password").fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/dashboard/);
  return { page, username };
}

async function adminPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@wishbridge.test");
  await page.locator("#password").fill("WishBridge2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/);
  return page;
}

test("full wish lifecycle through the UI", async ({ browser }) => {
  const title = `E2E wish ${randomUUID().slice(0, 8)} for a sketchbook`;

  // 1-3. Register, create a wish, submit for review
  const wisher = await newUser(browser, "wisher");
  await wisher.page.goto("/dashboard/wishes/new");
  await wisher.page.getByRole("button", { name: "Submit for review" }).click();
  await expect(wisher.page.getByText("Please check the highlighted fields.")).toBeVisible();
  await wisher.page.getByLabel("Title").fill(title);
  await wisher.page.getByRole("textbox", { name: /^Description/ }).fill("I keep a daily sketch diary and I'm about to run out of pages — a new sketchbook would be lovely.");
  await wisher.page.getByLabel("Category").selectOption("creative");
  await wisher.page.getByLabel("Wish type").selectOption("physical_gift");
  await wisher.page.getByLabel("Country").selectOption("GB");
  await wisher.page.getByLabel("Preferred fulfilment method").selectOption("gift_card");
  await wisher.page.getByRole("button", { name: "Submit for review" }).click();
  await wisher.page.waitForURL(/\/dashboard\/wishes\/[0-9a-f-]+\?submitted=1/);
  await expect(wisher.page.getByText("Pending review").first()).toBeVisible();
  const wishUrl = wisher.page.url().split("?")[0];
  const wishId = wishUrl.split("/").pop()!;

  // Not public yet
  const visitor = await (await browser.newContext()).newPage();
  expect((await visitor.goto(`/wishes/${wishId}`))?.status()).toBe(404);

  // Non-admins are kept out of the admin area
  await wisher.page.goto("/admin");
  await expect(wisher.page).toHaveURL(/denied=admin/);

  // 4. Admin approves
  const admin = await adminPage(browser);
  await admin.goto(`/admin/wishes/${wishId}`);
  await admin.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByText(/wish is now active/)).toBeVisible();

  // 5-6. Public listing and detail
  await visitor.goto(`/wishes?q=${encodeURIComponent(title.split(" ").slice(2, 3).join(""))}`);
  await expect(visitor.getByRole("link", { name: title })).toBeVisible();
  await visitor.getByRole("link", { name: title }).click();
  await expect(visitor.getByRole("heading", { name: title })).toBeVisible();
  await expect(visitor.getByText(`@${wisher.username}`).first()).toBeVisible();

  // 7. Second user offers anonymously
  const giver = await newUser(browser, "giver");
  await giver.page.goto(`/wishes/${wishId}`);
  await giver.page.getByLabel("Message to the wisher").fill("Enjoy the new pages!");
  await expect(giver.page.getByLabel("Give anonymously")).toBeChecked();
  await giver.page.getByRole("button", { name: "Offer to fulfil this wish" }).click();
  await expect(giver.page.getByText(/Offer sent!/)).toBeVisible();

  // 8-10. Wisher sees an anonymous offer and a notification, and accepts
  await wisher.page.goto(wishUrl);
  await expect(wisher.page.getByText("An anonymous giver").first()).toBeVisible();
  expect(await wisher.page.content()).not.toContain(giver.username);
  await wisher.page.goto("/dashboard/notifications");
  await expect(wisher.page.getByText("Someone offered to fulfil your wish")).toBeVisible();
  await wisher.page.goto(wishUrl);
  await wisher.page.getByRole("button", { name: "Accept offer" }).click();
  await expect(wisher.page.getByText("Accepted", { exact: true })).toBeVisible();

  // 11. Giver reports delivery; wisher confirms
  await giver.page.goto("/dashboard/giving");
  await giver.page.getByRole("link", { name: "Open →" }).first().click();
  await giver.page.getByRole("button", { name: "I've fulfilled this wish" }).click();
  await expect(giver.page.getByText(/Waiting for the wisher to confirm/)).toBeVisible();

  await wisher.page.goto(wishUrl);
  await wisher.page.getByRole("button", { name: "Confirm I received it" }).click();
  await expect(wisher.page.getByText(/This wish is fulfilled/)).toBeVisible();
  await expect(wisher.page.getByText("Completed", { exact: true })).toBeVisible();
});

test("signed-out visitors are redirected away from private areas", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login/);
});

for (const [name, viewport] of [
  ["mobile", { width: 375, height: 812 }],
  ["tablet", { width: 768, height: 1024 }],
  ["desktop", { width: 1440, height: 900 }],
] as const) {
  test(`responsive layout without horizontal overflow: ${name}`, async ({ browser }) => {
    const page = await (await browser.newContext({ viewport })).newPage();
    for (const path of ["/", "/wishes", "/wishes/b0000000-0000-4000-8000-000000000002", "/how-it-works", "/safety", "/login", "/signup", "/support"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      await expect(page.getByRole("banner")).toBeVisible();
    }
  });
}
