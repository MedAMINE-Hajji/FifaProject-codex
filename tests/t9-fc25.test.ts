import { Children, createElement, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { transform } from 'lightningcss';
import { describe, expect, it, vi } from 'vitest';
import DashboardShell, { DashboardThemeProvider } from '../app/components/dashboard-shell/DashboardShell';
import fc25, { FC25Hero } from '../app/editions/fc25';
import type { DashboardShellProps } from '../lib/presentation-contracts';
import type { MatchDashboard, MatchRecord } from '../lib/matches/contracts';

const match: MatchRecord = {
  id: 't9-match', edition: 'FC_25', friendId: 'alex', friend: { id: 'alex', name: 'Alex' },
  playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1,
  playedAt: '2025-03-17T00:00:00.000Z', createdAt: '2025-03-17T12:00:00.000Z',
  possession: null, shots: null, imageUrl: null,
};
const dashboard: MatchDashboard = {
  edition: 'FC_25', matches: [match], friends: [match.friend],
  stats: { totalMatches: 1, winRate: 100, goals: 3, weeklyMatches: 0, preferredOpponent: 'Alex', recentWins: 1, recentTotal: 1, formRate: 100, friendStats: [{ id: 'alex', name: 'Alex', matches: 1, winRate: 100, record: '1-0-0' }] },
};
const noop = () => {};
const props: DashboardShellProps = {
  edition: 'FC_25', dashboard, loading: false, error: '',
  onSelectEdition: noop, onUpload: noop, onManual: noop, onAddFriend: noop,
  onEditMatch: noop, onDeleteMatch: noop, onEditFriend: noop, onDeleteFriend: noop,
};
const render = (overrides: Partial<DashboardShellProps> = {}) => renderToStaticMarkup(
  createElement(DashboardThemeProvider, { theme: fc25 }, createElement(DashboardShell, { ...props, ...overrides }, createElement('div', null, 'Shared controls fixture'))),
);

describe('T9 FC25 frozen presentation integration', () => {
  it('renders one heading, English raw records, edition identity and shared controls', () => {
    const html = render();
    expect(fc25.id).toBe('FC_25');
    expect(fc25.className).toContain('fc25-theme');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    for (const text of ['data-theme="fc25"', 'data-edition="FC_25"', 'matchday home', 'Arsenal 3, Inter 1', '17 Mar 2025', '1 match recorded', '1-0-0', 'Shared controls fixture']) expect(html).toContain(text);
    expect(html).toMatch(/class="md-backdrop" aria-hidden="true"/);
    expect(html).not.toMatch(/<(?:img|audio|video|iframe)\b/);
  });

  it('retains edition isolation, loading/error states and honest empty records', () => {
    const mixed = render({ dashboard: { ...dashboard, matches: [{ ...match, edition: 'FC_27', friend: { id: 'other', name: 'Wrong edition' } }] } });
    expect(mixed).not.toContain('Wrong edition');
    expect(mixed).not.toContain('Arsenal');
    expect(mixed).toContain('No matches recorded in EA SPORTS FC 25 yet');
    expect(render({ loading: true })).not.toContain('Arsenal');
    expect(render({ error: 'Retry connection.' })).toContain('role="alert"');
    expect(render({ dashboard: { ...dashboard, edition: 'FC_27' } })).toContain('Waiting for EA SPORTS FC 25 records');
  });

  it('lets the shell own ALL and omits theme match actions in that scope', () => {
    const html = render({ edition: 'ALL', dashboard: null, career: createElement('p', null, 'Career fixture') });
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('Career fixture');
    expect(html).not.toContain('data-theme="fc25"');
    expect(html).not.toContain('Upload screenshot');
    expect(html).not.toContain('Add match manually');
  });

  it('forwards both callbacks unchanged and disables every hero action when requested', () => {
    const onUpload = vi.fn();
    const onManual = vi.fn();
    const buttons: Array<{ onClick?: () => void; disabled?: boolean; type?: string }> = [];
    function visit(node: ReactNode) {
      Children.forEach(node, child => {
        if (!isValidElement<{ children?: ReactNode; onClick?: () => void; disabled?: boolean; type?: string }>(child)) return;
        if (child.type === 'button') buttons.push(child.props);
        visit(child.props.children);
      });
    }
    visit(FC25Hero({ edition: 'FC_25', label: 'EA SPORTS FC 25', totalMatches: 0, disabled: true, onUpload, onManual }));
    expect(buttons).toHaveLength(2);
    expect(buttons.every(button => button.disabled && button.type === 'button')).toBe(true);
    expect(buttons.map(button => button.onClick)).toEqual([onUpload, onManual]);
    const enabled = renderToStaticMarkup(createElement(FC25Hero, { edition: 'FC_25', label: 'EA SPORTS FC 25', totalMatches: 2, disabled: false, onUpload, onManual }));
    expect(enabled).toContain('2 matches recorded');
    expect(enabled).not.toContain('disabled=""');
    expect(onUpload).not.toHaveBeenCalled();
    expect(onManual).not.toHaveBeenCalled();
  });

  it('parses and compiles scoped CSS Modules with all frozen tokens and reduced motion', () => {
    const css = readFileSync(new URL('../app/editions/fc25/fc25.module.css', import.meta.url));
    const compiled = transform({ filename: 'fc25.module.css', code: css, cssModules: true, minify: true });
    expect(compiled.exports?.theme).toBeDefined();
    expect(compiled.warnings).toEqual([]);
    expect(css.toString()).toContain('prefers-reduced-motion: reduce');
    expect(Object.keys(fc25.tokens)).toHaveLength(12);
    expect(Object.values(fc25.tokens).every(value => typeof value === 'string' && value.length > 0)).toBe(true);
  });
});
