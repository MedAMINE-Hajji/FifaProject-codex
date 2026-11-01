import { readFileSync } from 'node:fs';
import { createElement, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import { describe, expect, it, vi } from 'vitest';
import DashboardShell, { DashboardThemeProvider } from '../app/components/dashboard-shell/DashboardShell';
import fc24, { FC24Hero } from '../app/editions/fc24';
import type { DashboardShellProps } from '../lib/presentation-contracts';
import type { ThemeHeroProps } from '../app/editions/theme-contract';

const heroProps: ThemeHeroProps = { edition: 'FC_24', label: 'EA SPORTS FC 24', totalMatches: 1, disabled: false, onUpload: vi.fn(), onManual: vi.fn() };
const noop = () => {};
const props: DashboardShellProps = {
  edition: 'FC_24', loading: false, error: '',
  dashboard: {
    edition: 'FC_24', friends: [{ id: 'alex', name: 'Alex' }],
    matches: [{ id: '24', friendId: 'alex', friend: { id: 'alex', name: 'Alex' }, edition: 'FC_24', playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1, playedAt: '2022-03-17T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z', possession: null, shots: null, imageUrl: null }],
    stats: { totalMatches: 1, winRate: 100, goals: 3, preferredOpponent: 'Alex', weeklyMatches: 0, recentWins: 1, recentTotal: 1, formRate: 100, friendStats: [{ id: 'alex', name: 'Alex', matches: 1, winRate: 100, record: '1-0-0' }] },
  },
  onSelectEdition: noop, onUpload: noop, onManual: noop, onAddFriend: noop,
  onEditMatch: noop, onDeleteMatch: noop, onEditFriend: noop, onDeleteFriend: noop,
};
function render(overrides: Partial<DashboardShellProps> = {}) {
  return renderToStaticMarkup(createElement(DashboardThemeProvider, { theme: fc24 }, createElement(DashboardShell, { ...props, ...overrides }, createElement('div', null, 'Shared controls fixture'))));
}

describe('T8 FC24 frozen presentation seam', () => {
  it('renders one English heading, selected identity and unmodified records through the real shell', () => {
    const html = render();
    expect(fc24.id).toBe('FC_24');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('data-theme="fc24"');
    expect(html).toContain('data-edition="FC_24"');
    expect(html).toContain('matchday home');
    expect(html).toContain('Arsenal 3, Inter 1');
    expect(html).toContain('17 Mar 2022');
    expect(html).toContain('1-0-0');
    expect(html).toContain('Shared controls fixture');
    expect(html).toContain('aria-hidden="true"');
  });

  it('preserves action callbacks and disables both entry points when requested', () => {
    const buttons: { disabled: boolean; onClick: () => void; type: string }[] = [];
    function visit(node: ReactNode) {
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (!isValidElement<{ children?: ReactNode; disabled: boolean; onClick: () => void; type: string }>(node)) return;
      if (node.type === 'button') buttons.push(node.props);
      visit(node.props.children);
    }
    visit(FC24Hero(heroProps));
    expect(buttons).toHaveLength(2);
    buttons.forEach(button => { expect(button.type).toBe('button'); expect(button.disabled).toBe(false); button.onClick(); });
    expect(heroProps.onUpload).toHaveBeenCalledOnce();
    expect(heroProps.onManual).toHaveBeenCalledOnce();
    const disabled = renderToStaticMarkup(createElement(FC24Hero, { ...heroProps, disabled: true, totalMatches: 0 }));
    expect(disabled.match(/disabled=""/g)).toHaveLength(2);
    expect(disabled).toContain('0 matches recorded');
  });

  it('leaves aggregate exclusion and stale-edition protection to the frozen shell', () => {
    const career = render({ edition: 'ALL', career: createElement('p', null, 'Career fixture') });
    expect(career.match(/<h1\b/g)).toHaveLength(1);
    expect(career).toContain('Career fixture');
    expect(career).not.toContain('Upload screenshot');
    expect(career).not.toContain('Add match manually');
    const stale = render({ edition: 'FC_27' });
    expect(stale).not.toContain('Arsenal');
    expect(stale).not.toContain('1-0-0');
  });

  it('parses the CSS module and keeps shell overrides under the local theme root', () => {
    const css = readFileSync(new URL('../app/editions/fc24/fc24.module.css', import.meta.url), 'utf8');
    const root = postcss.parse(css);
    root.walkRules(rule => {
      if (rule.selector.includes(':global(')) expect(rule.selector.startsWith('.theme ')).toBe(true);
    });
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain(':focus-visible');
    expect(css).not.toMatch(/url\(/);
  });
});
