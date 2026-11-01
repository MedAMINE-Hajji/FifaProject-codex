import { expect, test } from '@playwright/test';
import { emptyDashboard } from './fixtures';

// Coordinator acceptance gate: register FIFA_23 first, then allocate a browser
// slot before running. No writes, AI calls or persistence fixture is required.
// DATABASE_URL=postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t7
// TEST_PORT=<allocated port> npx playwright test tests/browser/t7-fifa23.spec.ts
test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/(?:matches|friends)(?:\?.*)?$/, async route => {
    // Fail closed: even an accidental interaction must not mutate a database.
    if (route.request().method() !== 'GET') return route.abort();
    if (new URL(route.request().url()).pathname === '/api/friends') return route.fulfill({ json: emptyDashboard.friends });
    const edition = new URL(route.request().url()).searchParams.get('edition') ?? 'FC_27';
    const match = { id: 't7-match', edition: 'FIFA_23', friendId: 'friend-1', friend: emptyDashboard.friends[0], playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1, possession: null, shots: null, imageUrl: null, playedAt: '2022-03-17T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z' };
    await route.fulfill({ json: { ...emptyDashboard, edition, matches: edition === 'FIFA_23' ? [match] : [], stats: { ...emptyDashboard.stats, totalMatches: edition === 'FIFA_23' ? 1 : 0, goals: edition === 'FIFA_23' ? 3 : 0 } } });
  });
  await page.route(/\/api\/analyze(?:\?.*)?$/, route => route.abort());
});

for (const width of [390, 1280]) {
  test(`FIFA 23 composition fits ${width}px with focus, touch controls and reduced motion`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByLabel('Current edition', { exact: true }).selectOption('FIFA_23');
    const shell = page.locator('.md-shell.fifa23-theme[data-edition="FIFA_23"]');
    await expect(shell).toBeVisible();
    // This ID belongs only to this theme: prevents a false pass using FC27 fallback.
    await expect(shell.locator('#fifa23-heading')).toContainText('FIFA 23');
    await expect(shell.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(shell.getByLabel('Arsenal 3, Inter 1')).toBeVisible();
    await expect(shell.getByText('17 Mar 2022')).toBeVisible();
    await expect(shell.locator('.md-backdrop')).toHaveAttribute('aria-hidden', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const control of await shell.locator('button, select, input, .md-nav a').all()) {
      if (!await control.isVisible()) continue;
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    const upload = shell.getByRole('button', { name: /Upload screenshot/ });
    await upload.focus();
    await expect(upload).toBeFocused();
    expect(await upload.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
    expect(await shell.locator('.md-hero').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
    await page.screenshot({ path: testInfo.outputPath(`t7-fifa23-${width}.png`), fullPage: true, animations: 'disabled' });
    await page.getByLabel('Current edition', { exact: true }).selectOption('FC_27');
    await expect(page.locator('.md-shell')).toHaveAttribute('data-edition', 'FC_27');
    await expect(page.locator('#fifa23-heading')).toHaveCount(0);
    await expect(page.getByLabel('Arsenal 3, Inter 1')).toHaveCount(0);
  });
}

test('FIFA 23 keyboard creation actions still open the existing English workflows', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Current edition', { exact: true }).selectOption('FIFA_23');
  await expect(page.locator('#fifa23-heading')).toBeVisible();
  await page.getByRole('button', { name: /Add match manually/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('FIFA 23');
  await page.getByRole('button', { name: 'Close manual match dialog', exact: true }).click();
  await page.getByRole('button', { name: /Upload screenshot/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('FIFA 23');
});
