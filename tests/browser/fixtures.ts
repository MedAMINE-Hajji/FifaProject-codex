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
  await page.route(/\/api\/matches(?:\?.*)?$/, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: emptyDashboard });
    } else {
      await route.continue();
    }
  });
}
