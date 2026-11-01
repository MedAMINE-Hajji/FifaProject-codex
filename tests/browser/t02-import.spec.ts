import { expect, test } from "@playwright/test";
import { mockEmptyDashboard } from "./fixtures";

// Coordinator integration gate: mount ImportMatchDialog from a button named
// "Import match" and refresh the active workspace in its single onSaved callback.
// Run both configured desktop/phone projects with TEST_PORT=3102 after wiring.
const image = { name: "result.png", mimeType: "image/png", buffer: Buffer.from("test fixture") };
const extraction = { friendName: "Alex", playerClub: "PSG", opponentClub: "Madrid", playerScore: 3, opponentScore: 1,
  possession: null, shots: 10, uploadContext: "server-issued-opaque-context" };

test.beforeEach(async ({ page }) => { await mockEmptyDashboard(page); });

test("review remains editable, saves once with upload context, and refreshes the workspace", async ({ page }) => {
  let uploadedEdition = "";
  let saves = 0;
  let reads = 0;
  page.on("request", req => { if (req.method() === "GET" && req.url().includes("/api/matches?")) reads++; });
  await page.route("**/api/matches/analyze", async route => {
    expect(route.request().postData()).toContain('name="edition"');
    expect(route.request().postData()).toContain("FC_27");
    uploadedEdition = "FC_27";
    await route.fulfill({ json: extraction });
  });
  await page.route(/\/api\/matches(?:\?.*)?$/, async route => {
    if (route.request().method() !== "POST") return route.fallback();
    saves++;
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({ edition: uploadedEdition, entryMode: "upload", uploadContext: extraction.uploadContext,
      friendName: "Alex", playerScore: 4, opponentScore: 1, opponentClub: "Barcelona", possession: null });
    expect(body).not.toHaveProperty("playedAt");
    await route.fulfill({ status: 201, json: { ...body, id: "saved", friendId: "friend-1", friend: { id: "friend-1", name: "Alex" },
      playedAt: "2026-10-31T23:59:59.000Z", createdAt: "2026-11-01T00:01:00.000Z", imageUrl: null } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Import match|Upload screenshot/ }).click();
  const dialog = page.getByRole("dialog", { name: "Import match" });
  await dialog.getByLabel("Photo library or file").setInputFiles(image);
  await expect(dialog.getByText("Saving to EA SPORTS FC 27")).toBeVisible();
  await dialog.getByLabel("Your score", { exact: true }).fill("4");
  await dialog.getByLabel("Opponent club", { exact: true }).fill("Barcelona");
  const before = reads;
  await dialog.getByRole("button", { name: "Save match", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(saves).toBe(1);
  await expect.poll(() => reads).toBeGreaterThan(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("analysis and save failures preserve records and allow correction/retry", async ({ page }) => {
  let analyses = 0;
  await page.route("**/api/matches/analyze", async route => {
    analyses++;
    await route.fulfill(analyses === 1 ? { status: 502, json: { error: "private details" } } : { json: extraction });
  });
  await page.route(/\/api\/matches(?:\?.*)?$/, async route => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({ status: 400, json: { error: "private details" } });
  });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /Import match|Upload screenshot/ });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Import match" });
  await dialog.getByLabel("Take a photo").setInputFiles(image);
  await expect(dialog.getByRole("alert")).toContainText("Could not analyze");
  await expect(dialog).not.toContainText("private details");
  await dialog.getByLabel("Photo library or file").setInputFiles(image);
  await dialog.getByLabel("Your club", { exact: true }).fill("Liverpool");
  await dialog.getByRole("button", { name: "Save match", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Could not save");
  await expect(dialog.getByLabel("Your club", { exact: true })).toHaveValue("Liverpool");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("career imports require an explicit concrete edition", async ({ page }) => {
  await page.route("**/api/matches/analyze", async route => {
    expect(route.request().postData()).toContain("FIFA_22");
    await route.fulfill({ json: extraction });
  });
  await page.goto("/");
  await page.getByLabel("Current edition", { exact: true }).selectOption("ALL");
  await page.getByRole("button", { name: "Import match", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Import match" });
  await expect(dialog.getByLabel("Photo library or file")).toBeDisabled();
  await dialog.getByLabel("Match edition").selectOption("FIFA_22");
  await dialog.getByLabel("Photo library or file").setInputFiles(image);
  await expect(dialog.getByText("Saving to FIFA 22")).toBeVisible();
});
