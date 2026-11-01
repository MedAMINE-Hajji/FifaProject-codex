import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DashboardShell, { DashboardThemeProvider } from '../app/components/dashboard-shell/DashboardShell';
import fc27 from '../app/editions/fc27';
import type { DashboardShellProps } from '../lib/presentation-contracts';
import type { MatchDashboard, MatchRecord } from '../lib/matches/contracts';

const match: MatchRecord = {
  id: 'match-27', friendId: 'alex', friend: { id: 'alex', name: 'Alex' },
  playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1,
  possession: null, shots: null, imageUrl: null, edition: 'FC_27',
  playedAt: '2022-03-17T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z',
};
const dashboard: MatchDashboard = {
  edition: 'FC_27', matches: [match], friends: [match.friend],
  stats: { totalMatches: 1, winRate: 100, goals: 3, preferredOpponent: 'Alex', weeklyMatches: 0, recentWins: 1, recentTotal: 1, formRate: 100, friendStats: [{ id: 'alex', name: 'Alex', matches: 1, winRate: 100, record: '1-0-0' }] },
};
const noop = () => {};
const props: DashboardShellProps = {
  edition: 'FC_27', dashboard, loading: false, error: '',
  onSelectEdition: noop, onUpload: noop, onManual: noop, onAddFriend: noop,
  onEditMatch: noop, onDeleteMatch: noop, onEditFriend: noop, onDeleteFriend: noop,
};
const render = (overrides: Partial<DashboardShellProps> = {}) => renderToStaticMarkup(createElement(DashboardShell, { ...props, ...overrides }));

describe('T05 shell presentation contract', () => {
  it('renders raw API scores, played date, edition aggregates and English result labels', () => {
    const html = render();
    expect(html).toContain('Arsenal 3, Inter 1');
    expect(html).toContain('17 Mar 2022');
    expect(html).toContain('1 win in your last 1 match');
    expect(html).toContain('aria-label="Win"');
    expect(html).toContain('EA SPORTS FC 27 statistics');
    expect(html).toContain('1-0-0');
  });

  it('hides an earlier edition dashboard, including its aggregates and friend records', () => {
    const html = render({ edition: 'FIFA_22' });
    expect(html).not.toContain('Arsenal');
    expect(html).not.toContain('1-0-0');
    expect(html).not.toContain('100% win rate');
    expect(html).toContain('Waiting for FIFA 22 records');
  });

  it('does not display records while a refresh is loading or when an error is present', () => {
    expect(render({ loading: true })).not.toContain('Arsenal');
    const html = render({ error: 'Connection interrupted. Try again.' });
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('Arsenal');
  });

  it('renders the supplied ALL career slot and omits match creation and history', () => {
    const html = render({ edition: 'ALL', dashboard: { ...dashboard, edition: 'ALL' }, career: createElement('div', null, 'Career comparison fixture') });
    expect(html).toContain('Career comparison fixture');
    expect(html).not.toContain('Upload screenshot');
    expect(html).not.toContain('Add match manually');
    expect(html).not.toContain('id="match-history"');
    expect(html).not.toContain('Arsenal');
  });

  it('renders honest edition empty state while retaining shared friends and cross-edition warnings', () => {
    const html = render({ dashboard: { ...dashboard, matches: [], stats: { ...dashboard.stats, totalMatches: 0, winRate: 0, goals: 0, recentWins: 0, recentTotal: 0, friendStats: [] } } });
    expect(html).toContain('No matches recorded in EA SPORTS FC 27 yet');
    expect(html).toContain('No rivalry results in this edition');
    expect(html).toContain('Delete Alex and their matches across all editions');
    expect(html).toContain('Deleting a friend removes their associated matches across all editions.');
  });

  it('does not turn an accidentally mixed match list into actionable other-edition rows', () => {
    const html = render({ dashboard: { ...dashboard, matches: [{ ...match, edition: 'FIFA_22', friend: { id: 'old', name: 'Wrong scope' } }] } });
    expect(html).not.toContain('Wrong scope');
    expect(html).not.toContain('Arsenal');
  });

  it('accepts an independently supplied theme renderer without changing shell props or dialogs', () => {
    const html = renderToStaticMarkup(createElement(DashboardThemeProvider, {
      theme: { ...fc27, id: 'FIFA_22', Hero: () => createElement('h1', null, 'Independent edition renderer') },
    }, createElement(DashboardShell, props, createElement('div', null, 'Shared player fixture'))));
    expect(html).toContain('Independent edition renderer');
    expect(html).toContain('Shared player fixture');
    expect(html).toContain('Arsenal 3, Inter 1');
  });
});
