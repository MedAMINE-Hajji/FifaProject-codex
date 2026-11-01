import { expect, test } from '@playwright/test';

test('real manual and photo workflows share a friend, retain dates and delete across editions', async ({ page, request }) => {
  const dbUrl = new URL(process.env.DATABASE_URL ?? 'http://invalid');
  expect(dbUrl.hostname).toBe('127.0.0.1');
  expect(dbUrl.port).toBe('55432');
  expect(dbUrl.pathname).toBe('/matchday_test');
  expect(dbUrl.searchParams.get('schema')).toBe('integration');
  const name = `E2E Rival ${Date.now()}-${test.info().project.name}`;
  const career = async () => {
    const response = await request.get('/api/matches?edition=ALL');
    expect(response.ok()).toBe(true);
    return response.json();
  };
  try {
    await page.route(/\/audio\/.*\.mp3$/, route => route.fulfill({ status: 404, body: '' }));
    await page.goto('/');
    await page.getByLabel('Current edition', { exact: true }).selectOption('FIFA_22');
    await page.getByRole('button', { name: /manual/i }).first().click();
    const manual = page.getByRole('dialog', { name: 'Add match manually' });
    await manual.getByLabel('Friend name', { exact: true }).fill(name);
    await manual.getByLabel('Match date', { exact: true }).fill('2024-02-29');
    await manual.getByLabel('Your club', { exact: true }).fill('Arsenal');
    await manual.getByLabel('Opponent club', { exact: true }).fill('Barcelona');
    await manual.getByLabel('Your score', { exact: true }).fill('3');
    await manual.getByLabel('Opponent score', { exact: true }).fill('1');
    await manual.getByRole('button', { name: 'Save match', exact: true }).click();
    await expect(manual).not.toBeVisible();
    await expect(page.locator('#match-history').getByText(name, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: new RegExp(`^Edit match against ${name}`) }).click();
    const edit = page.getByRole('dialog', { name: 'Edit match', exact: true });
    await edit.getByLabel('Your score', { exact: true }).fill('4');
    await edit.getByRole('button', { name: 'Save match', exact: true }).click();
    await expect(edit).not.toBeVisible();

    await page.getByLabel('Current edition', { exact: true }).selectOption('FC_27');
    await page.getByRole('button', { name: 'Upload screenshot', exact: true }).click();
    const photo = page.getByRole('dialog', { name: 'Import match', exact: true });
    const beforeUpload = Date.now();
    await photo.getByLabel('Photo library or file').setInputFiles({ name: 'result.png', mimeType: 'image/png', buffer: Buffer.from('local provider fixture') });
    await photo.getByLabel('Friend name', { exact: true }).fill(name);
    await photo.getByRole('button', { name: 'Save match', exact: true }).click();
    await expect(photo).not.toBeVisible();
    const all = await career();
    const rows = all.matches.filter((match: { friend: { name: string } }) => match.friend.name === name);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((match: { friendId: string }) => match.friendId)).size).toBe(1);
    expect(rows.find((match: { edition: string }) => match.edition === 'FIFA_22')).toMatchObject({ playerScore: 4, playedAt: '2024-02-29T00:00:00.000Z' });
    const uploaded = rows.find((match: { edition: string }) => match.edition === 'FC_27');
    expect(new Date(uploaded.playedAt).getTime()).toBeGreaterThanOrEqual(beforeUpload);
    expect(new Date(uploaded.playedAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect(all.stats.totalMatches).toBe(all.matches.length);
    expect(all.comparisons.reduce((sum: number, row: { matches: number }) => sum + row.matches, 0)).toBe(all.matches.length);
    await page.getByRole('button', { name: 'Career overview', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Career overview' })).toBeVisible();
    await page.getByLabel('Current edition', { exact: true }).selectOption('FC_27');
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('across EVERY edition');
      await dialog.accept();
    });
    await page.getByRole('button', { name: `Delete ${name} and their matches across all editions`, exact: true }).click();
    await expect.poll(async () => (await career()).matches.filter((match: { friend: { name: string } }) => match.friend.name === name).length).toBe(0);
  } finally {
    const all = await career().catch(() => null);
    for (const friend of all?.friends.filter((friend: { name: string }) => friend.name === name) ?? []) {
      await request.delete(`/api/friends/${encodeURIComponent(friend.id)}`).catch(() => undefined);
    }
  }
});
