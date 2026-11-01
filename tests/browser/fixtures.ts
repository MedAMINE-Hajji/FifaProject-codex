import type { Page } from '@playwright/test';

// Presentation fixture only; persistence checks use a disposable test database.
export const emptyDashboard = {
  matches: [], friends: [{ id: 'friend-1', name: 'Alex' }],
  stats: {
    totalMatches: 0, winRate: 0, goals: 0, preferredOpponent: null,
    weeklyMatches: 0, recentWins: 0, recentTotal: 0, formRate: 0,
    friendStats: [],
  },
};

export async function mockEmptyDashboard(page: Page) {
  // Presentation checks stay silent. Media specs override this with short tones.
  await page.route(/\/audio\/fifa2[2-7]\.mp3(?:\?.*)?$/, route => route.fulfill({ status: 404, body: '' }));
  await page.route(/\/api\/matches(?:\?.*)?$/, async route => {
    if (route.request().method() === 'GET') {
      const edition = new URL(route.request().url()).searchParams.get('edition') ?? 'ALL';
      await route.fulfill({ json: { ...emptyDashboard, edition } });
    } else {
      await route.continue();
    }
  });
}
