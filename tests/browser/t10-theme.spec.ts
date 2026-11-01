import { expect, test } from '@playwright/test';
import { emptyDashboard } from './fixtures';

// Coordinator integration gate: run only after registering fc26 and allocating
// browser capacity. No database or analyzer calls: all /api traffic is stubbed.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname !== '/api/matches' || route.request().method() !== 'GET') {
      return route.fulfill({ status: 418, json: { error: 'T10 presentation gate forbids real API calls' } });
    }
    const edition = url.searchParams.get('edition') ?? 'FC_27';
    const isFC26 = edition === 'FC_26';
    await route.fulfill({ json: {
      ...emptyDashboard, edition,
      matches: isFC26 ? [{ id: 't10-match', edition, friendId: 'friend-1', friend: { id: 'friend-1', name: 'Alex' },
        playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1,
        possession: null, shots: null, imageUrl: null,
        playedAt: '2022-03-17T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z' }] : [],
      stats: { ...emptyDashboard.stats, totalMatches: isFC26 ? 1 : 0, goals: isFC26 ? 3 : 0 },
    } });
  });
});

for (const width of [390, 1280]) {
  test(`FC 26 fits ${width}px with keyboard focus, touch targets and reduced motion`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const select = page.getByLabel('Current edition', { exact: true });
    await select.selectOption('FC_26');
    const root = page.locator('.md-shell.md-theme-fc26[data-edition="FC_26"]');
    await expect(root).toBeVisible();
    await expect(root.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(root.getByLabel('Arsenal 3, Inter 1')).toBeVisible();
    await expect(root.getByText('17 Mar 2022')).toBeVisible();
    await expect(root.locator('.md-backdrop')).toHaveAttribute('aria-hidden', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const control of await root.locator('button, select, input, .md-nav a').all()) {
      if (!await control.isVisible()) continue;
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    await select.focus();
    await page.keyboard.press('Tab');
    await expect(root.getByRole('link', { name: 'Overview', exact: true })).toBeFocused();
    expect(await root.getByRole('link', { name: 'Overview', exact: true }).evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
    expect(await root.getByRole('button', { name: 'Upload screenshot', exact: true }).evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    await page.screenshot({ path: testInfo.outputPath(`t10-fc26-${width}.png`), fullPage: true, animations: 'disabled' });

    // Filters still act on FC 26 data; switching removes this edition's rows.
    await root.getByRole('searchbox').fill('missing club');
    await expect(root.locator('#match-history').getByRole('status')).toContainText('No matches match these filters');
    await root.getByRole('searchbox').fill('');
    await select.selectOption('FC_27');
    await expect(page.locator('.md-shell')).toHaveAttribute('data-edition', 'FC_27');
    await expect(page.getByLabel('Arsenal 3, Inter 1')).toHaveCount(0);
    await select.selectOption('FC_26');
    await expect(root.getByLabel('Arsenal 3, Inter 1')).toBeVisible();

    // Reach both existing dialogs via the theme's forwarded callbacks. Do not save.
    await root.getByRole('button', { name: 'Add match manually', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Close manual match dialog', exact: true }).click();
    await root.getByRole('button', { name: 'Upload screenshot', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
}
