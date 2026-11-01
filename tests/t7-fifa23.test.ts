import { Children, createElement, isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { describe, expect, it, vi } from 'vitest';
import DashboardShell, { DashboardThemeProvider } from '../app/components/dashboard-shell/DashboardShell';
import fifa23, { FIFA23Hero } from '../app/editions/fifa23';
import type { ThemeHeroProps } from '../app/editions/theme-contract';
import type { DashboardShellProps } from '../lib/presentation-contracts';
import type { MatchDashboard, MatchRecord } from '../lib/matches/contracts';

const match: MatchRecord = {
  id: 't7-match', edition: 'FIFA_23', friendId: 'alex', friend: { id: 'alex', name: 'Alex' },
  playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1,
  possession: null, shots: null, imageUrl: null,
  playedAt: '2022-03-17T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z',
};
const dashboard: MatchDashboard = {
  edition: 'FIFA_23', matches: [match], friends: [match.friend],
  stats: { totalMatches: 1, winRate: 100, goals: 3, preferredOpponent: 'Alex', weeklyMatches: 0, recentWins: 1, recentTotal: 1, formRate: 100, friendStats: [{ id: 'alex', name: 'Alex', matches: 1, winRate: 100, record: '1-0-0' }] },
};
const noop = () => {};
const props: DashboardShellProps = {
  edition: 'FIFA_23', dashboard, loading: false, error: '', onSelectEdition: noop,
  onUpload: noop, onManual: noop, onAddFriend: noop, onEditMatch: noop,
  onDeleteMatch: noop, onEditFriend: noop, onDeleteFriend: noop,
};
const render = (overrides: Partial<DashboardShellProps> = {}) => renderToStaticMarkup(
  createElement(DashboardThemeProvider, { theme: fifa23 },
    createElement(DashboardShell, { ...props, ...overrides }, createElement('div', null, 'Shared controls fixture'))),
);
const heroProps: ThemeHeroProps = { edition: 'FIFA_23', label: 'FIFA 23', totalMatches: 1, disabled: false, onUpload: noop, onManual: noop };

describe('T7 FIFA 23 frozen presentation integration', () => {
  it('mounts through the frozen provider with one h1 and preserves raw records, dates and shared controls', () => {
    const html = render();
    expect(fifa23.id).toBe('FIFA_23');
    expect(fifa23.className).toBeTruthy();
    expect(html).toContain(fifa23.className);
    expect(html).toContain('data-edition="FIFA_23"');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    for (const text of ['FIFA 23 only', '1 match recorded', 'Arsenal 3, Inter 1', '17 Mar 2022', '1-0-0', 'Shared controls fixture', 'matchday home', 'Current edition']) expect(html).toContain(text);
    expect(html).toContain('id="fifa23-heading"');
    expect(html).toContain('class="md-backdrop" aria-hidden="true"');
    expect(html).not.toMatch(/<(?:img|audio|video)\b/);
  });

  it('forwards each action to its own supplied callback without wrapping or changing it', () => {
    const onUpload = vi.fn();
    const onManual = vi.fn();
    const hero = FIFA23Hero({ ...heroProps, onUpload, onManual });
    const children = Children.toArray(hero.props.children);
    const actions = children.find(child => isValidElement(child) && String((child.props as { className?: string }).className).includes('md-actions')) as ReactElement<{ children: ReactElement<{ onClick: () => void; type: string }>[] }>;
    const [upload, manual] = actions.props.children;
    expect(upload.props.type).toBe('button');
    expect(manual.props.type).toBe('button');
    expect(upload.props.onClick).toBe(onUpload);
    expect(manual.props.onClick).toBe(onManual);
    upload.props.onClick();
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onManual).not.toHaveBeenCalled();
    manual.props.onClick();
    expect(onManual).toHaveBeenCalledTimes(1);
  });

  it('uses native disabled buttons for both creation actions', () => {
    const html = renderToStaticMarkup(createElement(FIFA23Hero, { ...heroProps, disabled: true }));
    expect(html.match(/<button\b/g)).toHaveLength(2);
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('Upload screenshot');
    expect(html).toContain('Add match manually');
  });

  it('reflects current totals and does not show stale edition records or invent history', () => {
    const html = render({ dashboard: { ...dashboard, matches: [], stats: { ...dashboard.stats, totalMatches: 0, goals: 0, winRate: 0, friendStats: [] } } });
    expect(html).toContain('0 matches recorded');
    expect(html).toContain('No matches recorded in FIFA 23 yet');
    expect(html).not.toContain('Arsenal');
    const stale = render({ dashboard: { ...dashboard, edition: 'FC_27' } });
    expect(stale).not.toContain('Arsenal');
    expect(stale).toContain('Waiting for FIFA 23 records');
    expect(render({ loading: true })).not.toContain('Arsenal');
    expect(render({ error: 'Try again.' })).toContain('role="alert"');
  });

  it('allows the shell to render ALL without edition creation actions or a second h1', () => {
    const html = render({ edition: 'ALL', dashboard: { ...dashboard, edition: 'ALL' }, career: createElement('p', null, 'Career fixture') });
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('Career fixture');
    expect(html).not.toContain('Upload screenshot');
    expect(html).not.toContain('Add match manually');
  });

  it('parses the CSS and keeps every shared override scoped to the module root', () => {
    const css = readFileSync(new URL('../app/editions/fifa23/fifa23.module.css', import.meta.url), 'utf8');
    const root = postcss.parse(css);
    root.walkRules(rule => {
      if (rule.selector.includes(':global(')) {
        for (const selector of rule.selector.split(',')) expect(selector.trim()).toMatch(/^\.theme\s/);
      }
    });
    expect(css).toContain('(prefers-reduced-motion: reduce)');
    expect(css).toContain(':focus-visible');
    expect(css).not.toMatch(/url\(|@import/);
  });
});
