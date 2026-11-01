import { expect, test } from '@playwright/test';
import { emptyDashboard } from './fixtures';

// Coordinator gate AFTER registry mount, in an allocated browser slot.
// DATABASE_URL=postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t8
// TEST_PORT=<allocated port> npx playwright test tests/browser/t8-fc24.spec.ts
// Root contract: .md-shell[data-edition="FC_24"] contains [data-theme="fc24"].
test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/matches(?:\?.*)?$/, async route => {
    if (route.request().method() !== 'GET') return route.abort();
    const edition = new URL(route.request().url()).searchParams.get('edition') ?? 'FC_27';
    await route.fulfill({ json: { ...emptyDashboard, edition } });
  });
});

for (const width of [390, 1280]) {
  test(`FC24 selected menu, focus, motion and touch targets at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByLabel('Current edition', { exact: true }).selectOption('FC_24');
    const shell = page.locator('.md-shell[data-edition="FC_24"]');
    const hero = shell.locator('[data-theme="fc24"]');
    await expect(hero).toBeVisible();
    await expect(shell.getByRole('heading', { level: 1 })).toHaveText('Welcome toyour club.');
    await expect(shell.getByText('No matches recorded in EA SPORTS FC 24 yet.')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ['Upload screenshot', 'Add match manually', 'Add friend']) {
      const button = shell.getByRole('button', { name, exact: true });
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    const upload = hero.getByRole('button', { name: 'Upload screenshot' });
    await upload.focus();
    await page.keyboard.press('Tab');
    const manual = hero.getByRole('button', { name: 'Add match manually' });
    await expect(manual).toBeFocused();
    expect(await manual.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    expect(await manual.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    await page.screenshot({ path: testInfo.outputPath(`t8-fc24-${width}.png`), fullPage: true, animations: 'disabled' });
    await page.getByLabel('Current edition', { exact: true }).selectOption('FC_27');
    await expect(page.locator('[data-theme="fc24"]')).toHaveCount(0);
  });
}
