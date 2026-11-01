import { expect, test } from '@playwright/test';
import { emptyDashboard } from './fixtures';

// Coordinator acceptance gate: run only after registry mounting and browser-slot
// allocation. No real DB or AI: all API reads are fixtures and writes are blocked.
// TEST_PORT=<allocated>; DATABASE_URL=postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t9
// npx playwright test tests/browser/t9-fc25.spec.ts
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async route => {
    const request = route.request();
    if (request.method() !== 'GET') return route.abort();
    const url = new URL(request.url());
    if (url.pathname === '/api/friends') return route.fulfill({ json: emptyDashboard.friends });
    if (url.pathname !== '/api/matches') return route.fulfill({ json: {} });
    const edition = url.searchParams.get('edition') ?? 'FC_27';
    const match = { id: 't9-record', edition: 'FC_25', friendId: 'friend-1', friend: emptyDashboard.friends[0], playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1, possession: null, shots: null, imageUrl: null, playedAt: '2025-03-17T00:00:00.000Z', createdAt: '2025-03-17T12:00:00.000Z' };
    await route.fulfill({ json: { ...emptyDashboard, edition, matches: edition === 'FC_25' ? [match] : [], stats: { ...emptyDashboard.stats, totalMatches: edition === 'FC_25' ? 1 : 0, goals: edition === 'FC_25' ? 3 : 0 } } });
  });
});

for (const width of [390, 1280]) {
  test(`FC25 native selection, keyboard actions and full layout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByLabel('Current edition', { exact: true }).selectOption('FC_25');
    const shell = page.locator('.md-shell.fc25-theme[data-edition="FC_25"]');
    const root = shell.locator('.md-hero[data-theme="fc25"]');
    await expect(root).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(shell.getByLabel('Arsenal 3, Inter 1')).toBeVisible();
    await expect(shell.getByText('17 Mar 2025')).toBeVisible();
    await expect(shell.locator('.md-backdrop')).toHaveAttribute('aria-hidden', 'true');
    for (const locator of [shell.locator('button:visible'), shell.locator('select:visible'), shell.locator('input:visible'), shell.locator('a:visible:not(.md-skip)')]) {
      for (const control of await locator.all()) {
        const box = await control.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box?.width).toBeGreaterThanOrEqual(44);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const upload = root.getByRole('button', { name: /Upload screenshot/ });
    await upload.focus();
    await expect(upload).toBeFocused();
    expect(await upload.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Import match', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close import dialog' }).click();
    await root.getByRole('button', { name: /Add match manually/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Add match manually', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close manual match dialog' }).click();
    await page.screenshot({ path: testInfo.outputPath(`t9-fc25-${width}.png`), fullPage: true, animations: 'disabled' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await upload.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Current edition', { exact: true }).selectOption('FC_27');
    await expect(page.locator('.md-shell')).toHaveAttribute('data-edition', 'FC_27');
    await expect(page.locator('[data-theme="fc25"]')).toHaveCount(0);
    await expect(page.locator('.fc25-theme')).toHaveCount(0);
    await expect(page.getByLabel('Arsenal 3, Inter 1')).toHaveCount(0);
  });
}
