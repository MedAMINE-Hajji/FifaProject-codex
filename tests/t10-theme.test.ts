import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DashboardShell, { DashboardThemeProvider } from '../app/components/dashboard-shell/DashboardShell';
import fc26, { FC26Hero } from '../app/editions/fc26';
import type { DashboardShellProps } from '../lib/presentation-contracts';
import type { MatchDashboard, MatchRecord } from '../lib/matches/contracts';

const match: MatchRecord = {
  id: 't10-match', edition: 'FC_26', friendId: 'alex', friend: { id: 'alex', name: 'Alex' },
  playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1,
  possession: null, shots: null, imageUrl: null,
  playedAt: '2022-03-17T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z',
};
const dashboard: MatchDashboard = {
  edition: 'FC_26', matches: [match], friends: [match.friend],
  stats: { totalMatches: 1, winRate: 100, goals: 3, preferredOpponent: 'Alex', weeklyMatches: 0,
    recentWins: 1, recentTotal: 1, formRate: 100,
    friendStats: [{ id: 'alex', name: 'Alex', matches: 1, winRate: 100, record: '1-0-0' }] },
};
const noop = () => {};
const props: DashboardShellProps = {
  edition: 'FC_26', dashboard, loading: false, error: '', onSelectEdition: noop,
  onUpload: noop, onManual: noop, onAddFriend: noop, onEditMatch: noop,
  onDeleteMatch: noop, onEditFriend: noop, onDeleteFriend: noop,
};
function render(overrides: Partial<DashboardShellProps> = {}) {
  return renderToStaticMarkup(createElement(DashboardThemeProvider, { theme: fc26 },
    createElement(DashboardShell, { ...props, ...overrides }, createElement('div', null, 'Shared dialog slot'))));
}

describe('T10 FC 26 frozen provider integration', () => {
  it('renders one English headline, edition identity, raw records, and the shared slot', () => {
    const html = render();
    expect(fc26.id).toBe('FC_26');
    expect(html).toContain('md-theme-fc26');
    expect(html).toContain('data-edition="FC_26"');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('Every result.');
    expect(html).toContain('matchday home');
    expect(html).toContain('Arsenal 3, Inter 1');
    expect(html).toContain('17 Mar 2022');
    expect(html).toContain('1-0-0');
    expect(html).toContain('Shared dialog slot');
    expect(html).toContain('aria-hidden="true"');
  });

  it('retains match management, friend management, search and native edition controls', () => {
    const html = render();
    for (const name of ['Upload screenshot', 'Add match manually', 'Edit match against Alex',
      'Delete match against Alex', 'Edit Alex across all editions',
      'Delete Alex and their matches across all editions', 'Search matches by friend or club', 'Current edition']) {
      expect(html).toContain(name);
    }
    expect(html).toContain('<select id="matchday-edition"');
  });

  it('shows the FC 26 empty state without displaying stale records from FC 27', () => {
    const html = render({ dashboard: { ...dashboard, edition: 'FC_27' } });
    expect(html).toContain('Waiting for EA SPORTS FC 26 records');
    expect(html).not.toContain('Arsenal');
    const empty = render({ dashboard: { ...dashboard, matches: [], stats: { ...dashboard.stats, totalMatches: 0 } } });
    expect(empty).toContain('0 matches recorded');
    expect(empty).toContain('No matches recorded in EA SPORTS FC 26 yet');
  });

  it('leaves the ALL headline to the shell and excludes concrete match creation', () => {
    const html = render({ edition: 'ALL', dashboard: { ...dashboard, edition: 'ALL' } });
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).not.toContain('Upload screenshot');
    expect(html).not.toContain('Add match manually');
  });

  it('disables both hero actions when the contract requests it', () => {
    const html = renderToStaticMarkup(createElement(FC26Hero, {
      edition: 'FC_26', label: 'EA SPORTS FC 26', totalMatches: 0,
      disabled: true, onUpload: noop, onManual: noop,
    }));
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html.match(/<button\b/g)).toHaveLength(2);
    expect(html).not.toContain('<a ');
  });
});
