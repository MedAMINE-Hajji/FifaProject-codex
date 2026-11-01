import { expect, test } from '@playwright/test';
import { mockEmptyDashboard } from './fixtures';

test('fresh visits open FC 27 and selecting FIFA 22 requests its own scope', async ({ page }) => {
  await mockEmptyDashboard(page);
  const scopes: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/matches?')) {
      scopes.push(new URL(request.url()).searchParams.get('edition') ?? '');
    }
  });
  await page.goto('/');
  await expect.poll(() => scopes.at(-1)).toBe('FC_27');
  await page.getByRole('button', { name: /EA SPORTS FC 27/ }).first().click();
  await page.getByRole('button', { name: /FIFA 22/ }).click();
  await expect.poll(() => scopes.at(-1)).toBe('FIFA_22');
  await page.reload();
  await expect.poll(() => scopes.at(-1)).toBe('FC_27');
});
