import { expect, test } from '@playwright/test';
import { emptyDashboard } from './fixtures';

// Runnable integration gate after the coordinator mounts DashboardShell at /.
// TEST_PORT=3105; execute only after coordinator allocates a heavy browser run.
test.beforeEach(async ({ page }) => {
  await page.route(/\/api\/matches(?:\?.*)?$/, async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const edition = new URL(route.request().url()).searchParams.get('edition') ?? 'FC_27';
    const match = { id: 't05-match', edition: 'FC_27', friendId: 'friend-1', friend: { id: 'friend-1', name: 'Alex' }, playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1, possession: null, shots: null, imageUrl: null, playedAt: '2022-03-17T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z' };
    await route.fulfill({ json: { ...emptyDashboard, edition, matches: edition === 'FC_27' ? [match] : [], stats: { ...emptyDashboard.stats, totalMatches: edition === 'FC_27' ? 1 : 0, goals: edition === 'FC_27' ? 3 : 0 } } });
  });
});

test('English history supports keyboard filters and cannot leak records across editions', async ({ page }) => {
  await page.goto('/');
  const shell = page.locator('.md-shell');
  await expect(shell).toHaveAttribute('data-edition', 'FC_27');
  await expect(page.getByLabel('Arsenal 3, Inter 1')).toBeVisible();
  await expect(page.getByText('17 Mar 2022')).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search matches by friend or club' });
  await search.fill('no matching club');
  await expect(page.locator('#match-history').getByRole('status')).toContainText('No matches match these filters');
  await search.fill('Arsenal');
  await page.getByLabel('Filter by result', { exact: true }).selectOption('Loss');
  await expect(page.getByLabel('Arsenal 3, Inter 1')).toHaveCount(0);
  await page.getByLabel('Current edition', { exact: true }).selectOption('FIFA_22');
  await expect(shell).toHaveAttribute('data-edition', 'FIFA_22');
  await expect(page.getByText('No matches recorded in FIFA 22 yet.')).toBeVisible();
  await expect(page.getByLabel('Arsenal 3, Inter 1')).toHaveCount(0);
  await page.reload();
  await expect(shell).toHaveAttribute('data-edition', 'FC_27');
});

test('career does not offer aggregate match creation and shared friend deletion is explicit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Delete Alex and their matches across all editions' })).toBeVisible();
  await expect(page.getByText('Friends are shared across all editions.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Career overview' }).click();
  await expect(page.locator('.md-shell')).toHaveAttribute('data-edition', 'ALL');
  await expect(page.getByRole('button', { name: 'Upload screenshot' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add match manually' })).toHaveCount(0);
});

test('fits the viewport and offers visible keyboard focus with reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#matchday-content')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const name of ['Upload screenshot', 'Add match manually', 'Add friend']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: testInfo.outputPath('t05-shell.png'), fullPage: true, animations: 'disabled' });
});
