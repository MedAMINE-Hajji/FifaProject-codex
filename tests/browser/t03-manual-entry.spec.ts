import { expect, test, type Locator, type Page } from "@playwright/test";
import { emptyDashboard } from "./fixtures";
import type { MatchRecord } from "../../lib/matches/contracts";

// Integration gate: coordinator mounts ManualMatchDialog behind a button whose
// accessible name includes "manual". No production HTTP request is made here.
// Run with TEST_PORT=3103 after mounting, for both existing Playwright projects.
test.use({ timezoneId: "America/Los_Angeles" });

async function fixture(page: Page, failFirst = false, delay = 0) {
  const posts: Record<string, unknown>[] = [];
  const scopes: string[] = [];
  const matches: MatchRecord[] = [];
  await page.route(/\/api\/matches(?:\?.*)?$/, async route => {
    if (route.request().method() === "GET") {
      const edition = new URL(route.request().url()).searchParams.get("edition") ?? "FC_27";
      scopes.push(edition);
      const scoped = matches.filter(match => edition === "ALL" || match.edition === edition);
      await route.fulfill({ json: { ...emptyDashboard, edition, matches: scoped,
        stats: { ...emptyDashboard.stats, totalMatches: scoped.length } } });
      return;
    }
    const body = route.request().postDataJSON();
    posts.push(body);
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    if (failFirst && posts.length === 1) {
      await route.fulfill({ status: 503, json: { error: "Saving is temporarily unavailable. Please try again." } });
      return;
    }
    const match: MatchRecord = { ...body, id: `manual-${posts.length}`, friendId: "friend-1",
      friend: { id: "friend-1", name: body.friendName }, imageUrl: null,
      playedAt: `${body.playedAt}T00:00:00.000Z`, createdAt: "2026-11-01T12:00:00.000Z" };
    matches.push(match);
    await route.fulfill({ status: 201, json: match });
  });
  await page.goto("/");
  return { posts, scopes };
}

async function openManual(page: Page) {
  await page.getByRole("button", { name: /manual/i }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add match manually" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function details(dialog: Locator, friend = "Alex") {
  await dialog.getByLabel("Friend name", { exact: true }).fill(friend);
  await dialog.getByLabel("Match date", { exact: true }).fill("2024-02-29");
  await dialog.getByLabel("Your club", { exact: true }).fill("Arsenal");
  await dialog.getByLabel("Opponent club", { exact: true }).fill("Madrid");
  await dialog.getByLabel("Your score", { exact: true }).fill("3");
  await dialog.getByLabel("Opponent score", { exact: true }).fill("1");
}

test("manual form saves an existing friend, optional stats and chosen calendar day; refreshes and reloads", async ({ page }) => {
  const { posts, scopes } = await fixture(page);
  const dialog = await openManual(page);
  await expect(dialog).toContainText("EA SPORTS FC 27", { ignoreCase: true });
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  await expect(dialog.getByLabel("Match date", { exact: true })).toHaveValue(today);
  await details(dialog);
  await dialog.getByLabel("Existing friend", { exact: true }).selectOption({ label: "Alex" });
  await expect(dialog.getByLabel("Friend name", { exact: true })).toHaveValue("Alex");
  await dialog.getByLabel("Possession % (optional)", { exact: true }).fill("55");
  await dialog.getByLabel("Shots (optional)", { exact: true }).fill("9");
  const reads = scopes.length;
  await dialog.getByRole("button", { name: "Save match", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ entryMode: "manual", edition: "FC_27", friendName: "Alex",
    playedAt: "2024-02-29", playerScore: 3, opponentScore: 1, possession: 55, shots: 9 });
  await expect.poll(() => scopes.length).toBeGreaterThan(reads);
  await page.reload();
  // Coordinator's UTC date presentation must preserve the chosen leap day in this timezone.
  await expect(page.getByText(/29 Feb 2024|Feb 29,? 2024|February 29,? 2024/).first()).toBeVisible();
});

test("requires valid fields, keeps values on save failure and prevents duplicate submits while busy", async ({ page }) => {
  const { posts } = await fixture(page, true, 700);
  const dialog = await openManual(page);
  const save = dialog.getByRole("button", { name: "Save match", exact: true });
  await save.click();
  expect(posts).toHaveLength(0);
  await details(dialog, "New friend");
  await dialog.getByLabel("Your score", { exact: true }).fill("201");
  await save.click();
  expect(posts).toHaveLength(0);
  await dialog.getByLabel("Your score", { exact: true }).fill("3");
  await dialog.getByLabel("Match date", { exact: true }).fill("");
  await save.click();
  expect(posts).toHaveLength(0);
  await dialog.getByLabel("Match date", { exact: true }).fill("2024-02-29");
  await save.click();
  await expect(dialog.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Close manual match dialog" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("temporarily unavailable");
  await expect(dialog.getByRole("alert")).toBeFocused();
  await expect(dialog.getByLabel("Friend name", { exact: true })).toHaveValue("New friend");
  await expect(dialog.getByLabel("Match date", { exact: true })).toHaveValue("2024-02-29");
  await save.click();
  await expect(dialog).not.toBeVisible();
  expect(posts).toHaveLength(2);
  expect(posts[0]).toEqual(posts[1]);
});

test("All editions requires a concrete choice before entry; keyboard focus stays in responsive dialog", async ({ page }) => {
  const { posts } = await fixture(page);
  await page.getByRole("button", { name: /EA SPORTS FC 27/i }).first().click();
  await page.getByRole("button", { name: /All editions/i }).click();
  const dialog = await openManual(page);
  const edition = dialog.getByLabel("Match edition", { exact: true });
  await expect(edition).toBeFocused();
  await expect(dialog.getByLabel("Friend name", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Save match", exact: true })).toHaveCount(0);
  await edition.selectOption("FIFA_22");
  await expect(dialog).toContainText("Saving to FIFA 22");
  await expect(dialog.getByLabel("Existing friend", { exact: true })).toBeFocused();
  await details(dialog, "New shared friend");
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  for (let index = 0; index < 16; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await dialog.getByRole("button", { name: "Save match", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(posts[0]).toMatchObject({ edition: "FIFA_22", playedAt: "2024-02-29", friendName: "New shared friend" });
  await openManual(page);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: /manual/i }).first()).toBeFocused();
});
