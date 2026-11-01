import { expect, test } from '@playwright/test';
import { emptyDashboard } from './fixtures';

// Coordinator gate: mount fifa22 through DashboardThemeProvider + registry first.
// Allocate a browser slot before running. No production services or write APIs.
// DATABASE_URL=postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t6
// TEST_PORT=<allocated>; npx playwright test tests/browser/t6-fifa22.spec.ts
// Root contract: .md-shell[data-edition="FIFA_22"] contains [data-theme="fifa22"].
test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/matches(?:\?.*)?$/, async route => {
    if (route.request().method() !== 'GET') throw new Error('T6 presentation gate must not mutate matches');
    const edition = new URL(route.request().url()).searchParams.get('edition') ?? 'FC_27';
    const active = edition === 'FIFA_22';
    const match = { id: 't6-match', edition: 'FIFA_22', friendId: 'friend-1', friend: emptyDashboard.friends[0], playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1, possession: null, shots: null, imageUrl: null, playedAt: '2022-03-17T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z' };
    await route.fulfill({ json: { ...emptyDashboard, edition, matches: active ? [match] : [], stats: { ...emptyDashboard.stats, totalMatches: active ? 1 : 0, goals: active ? 3 : 0 } } });
  });
});

test('FIFA 22 selection mounts the independent theme and preserves records, filters and action dialogs', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Current edition').selectOption('FIFA_22');
  const shell = page.locator('.md-shell[data-edition="FIFA_22"]');
  await expect(shell.locator('[data-theme="fifa22"]')).toBeVisible();
  await expect(shell.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(shell.getByRole('link', { name: 'matchday home' })).toBeVisible();
  await expect(shell.getByLabel('Arsenal 3, Inter 1')).toBeVisible();
  await expect(shell.getByText('17 Mar 2022')).toBeVisible();
  await shell.getByRole('searchbox').fill('not-a-club');
  await expect(shell.locator('#match-history').getByRole('status')).toHaveText('No matches match these filters.');
  await shell.getByRole('searchbox').fill('');
  await shell.getByRole('button', { name: /^Upload screenshot/ }).click();
  await expect(page.getByRole('dialog', { name: 'Import match' })).toBeVisible();
  await page.getByRole('button', { name: 'Close import dialog' }).click();
  await shell.getByRole('button', { name: /^Add match manually/ }).click();
  await expect(page.getByRole('dialog', { name: 'Add match manually' })).toBeVisible();
  await page.getByRole('button', { name: 'Close manual match dialog' }).click();
  await page.getByLabel('Current edition').selectOption('FIFA_23');
  await expect(page.locator('.md-shell')).toHaveAttribute('data-edition', 'FIFA_23');
  await expect(page.locator('[data-theme="fifa22"]')).toHaveCount(0);
  await expect(page.getByLabel('Arsenal 3, Inter 1')).toHaveCount(0);
});

for (const width of [390, 1280]) {
  test(`FIFA 22 fits ${width}px with keyboard focus, touch targets and reduced motion`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByLabel('Current edition').selectOption('FIFA_22');
    const shell = page.locator('.md-shell[data-edition="FIFA_22"]');
    const hero = shell.locator('[data-theme="fifa22"]');
    await expect(hero).toBeVisible();
    await expect(shell.getByLabel('Arsenal 3, Inter 1')).toBeVisible();
    await page.getByLabel('Current edition').press('Tab');
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeFocused();
    const outline = await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle);
    expect(outline).toBe('solid');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const control of await shell.locator('button, select, input, .md-nav a').all()) {
      if (!await control.isVisible()) continue;
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    for (const control of await hero.getByRole('button').all()) {
      expect(await control.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
    }
    await page.screenshot({ path: testInfo.outputPath(`t6-fifa22-${width}.png`), fullPage: true, animations: 'disabled' });
  });
}
