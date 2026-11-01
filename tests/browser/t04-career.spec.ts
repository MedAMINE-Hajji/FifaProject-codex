import { expect, test } from "@playwright/test";
import { emptyDashboard } from "./fixtures";
import { FIFA_EDITIONS, VALID_RECORD_EDITIONS } from "../../lib/fifa-editions";

// Integration gate: coordinator mounts CareerPanel for ALL and wires onSelectEdition.
// Run with TEST_PORT=3104 and DATABASE_URL pointing to schema t04 after mounting.
test("career totals, keyboard edition navigation and responsive comparisons", async ({ page }) => {
  const requests: string[] = [];
  await page.route(/\/api\/matches(?:\?.*)?$/, async (route) => {
    const edition = new URL(route.request().url()).searchParams.get("edition") ?? "FC_27";
    requests.push(edition);
    await route.fulfill({ json: {
      ...emptyDashboard, edition,
      comparisons: edition === "ALL" ? VALID_RECORD_EDITIONS.map((id) => ({ edition: id, name: FIFA_EDITIONS[id].name, matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, winRate: 0 })) : undefined,
    } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /EA SPORTS FC 27/ }).first().click();
  await page.getByRole("button", { name: /All editions/ }).click();
  const panel = page.getByRole("region", { name: "Career overview" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("No matches recorded yet.", { exact: false })).toBeVisible();
  await expect(panel.getByRole("button")).toHaveCount(6);
  await expect(panel.getByText("No matches recorded", { exact: true })).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const button = panel.getByRole("button", { name: "View FIFA 22 history", exact: true });
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => requests.at(-1)).toBe("FIFA_22");
  await expect(panel).toHaveCount(0);
});
