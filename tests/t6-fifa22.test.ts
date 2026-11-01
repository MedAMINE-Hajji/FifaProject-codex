import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import DashboardShell, { DashboardThemeProvider } from '../app/components/dashboard-shell/DashboardShell';
import fifa22, { FIFA22Hero } from '../app/editions/fifa22';
import type { DashboardShellProps } from '../lib/presentation-contracts';
import type { ThemeHeroProps } from '../app/editions/theme-contract';

const heroProps: ThemeHeroProps = { edition: 'FIFA_22', label: 'FIFA 22', totalMatches: 1, disabled: false, onUpload: vi.fn(), onManual: vi.fn() };
const noop = () => {};
const match = { id: 't6', edition: 'FIFA_22' as const, friendId: 'alex', friend: { id: 'alex', name: 'Alex' }, playerClub: 'Arsenal', opponentClub: 'Inter', playerScore: 3, opponentScore: 1, playedAt: '2022-03-17T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z', possession: null, shots: null, imageUrl: null };
const props: DashboardShellProps = {
  edition: 'FIFA_22', loading: false, error: '',
  dashboard: { edition: 'FIFA_22', matches: [match], friends: [match.friend], stats: { totalMatches: 1, winRate: 100, goals: 3, preferredOpponent: 'Alex', weeklyMatches: 0, recentWins: 1, recentTotal: 1, formRate: 100, friendStats: [{ id: 'alex', name: 'Alex', matches: 1, winRate: 100, record: '1-0-0' }] } },
  onSelectEdition: noop, onUpload: noop, onManual: noop, onAddFriend: noop, onEditMatch: noop, onDeleteMatch: noop, onEditFriend: noop, onDeleteFriend: noop,
};
const render = (overrides: Partial<DashboardShellProps> = {}) => renderToStaticMarkup(createElement(DashboardThemeProvider, { theme: fifa22 }, createElement(DashboardShell, { ...props, ...overrides }, createElement('button', null, 'Shared music fixture'))));

function buttons(element: ReactElement): ReactElement<{ disabled: boolean; onClick: () => void }>[] {
  const found = element.type === 'button' ? [element as ReactElement<{ disabled: boolean; onClick: () => void }>] : [];
  const children = (element.props as { children?: unknown }).children;
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child && typeof child === 'object' && 'type' in child) found.push(...buttons(child as ReactElement));
  }
  return found;
}

describe('T6 FIFA 22 presentation', () => {
  it('mounts through the frozen provider with one heading, English identity, raw records and shared controls', () => {
    const html = render();
    expect(fifa22.id).toBe('FIFA_22');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    for (const text of ['data-theme="fifa22"', 'data-edition="FIFA_22"', 'matchday home', 'Arsenal 3, Inter 1', '17 Mar 2022', '1 match recorded', '1-0-0', 'Shared music fixture', 'aria-hidden="true"']) expect(html).toContain(text);
  });

  it('passes upload and manual callbacks unchanged and disables both controls', () => {
    const controls = buttons(FIFA22Hero(heroProps));
    expect(controls).toHaveLength(2);
    expect(controls[0].props.onClick).toBe(heroProps.onUpload);
    expect(controls[1].props.onClick).toBe(heroProps.onManual);
    controls.forEach(control => control.props.onClick());
    expect(heroProps.onUpload).toHaveBeenCalledOnce();
    expect(heroProps.onManual).toHaveBeenCalledOnce();
    expect(buttons(FIFA22Hero({ ...heroProps, disabled: true })).every(control => control.props.disabled)).toBe(true);
    const html = renderToStaticMarkup(createElement(FIFA22Hero, { ...heroProps, disabled: true, totalMatches: 0 }));
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('0 matches recorded');
  });

  it('preserves aggregate exclusion, honest empty and loading states and rejects stale edition records', () => {
    const all = render({ edition: 'ALL', career: createElement('p', null, 'Career comparison') });
    expect(all).toContain('Career comparison');
    expect(all).not.toContain('Upload screenshot');
    expect(all).not.toContain('data-theme="fifa22"');
    expect(all.match(/<h1\b/g)).toHaveLength(1);
    const empty = render({ dashboard: { ...props.dashboard!, matches: [], stats: { ...props.dashboard!.stats, totalMatches: 0 } } });
    expect(empty).toContain('No matches recorded in FIFA 22 yet');
    expect(empty).toContain('Delete Alex and their matches across all editions');
    expect(render({ loading: true })).not.toContain('Arsenal');
    expect(render({ dashboard: { ...props.dashboard!, edition: 'FC_27' } })).not.toContain('Arsenal');
  });

  it('parses CSS and scopes every selector beneath a local class, including motion and responsive rules', () => {
    const require = createRequire(import.meta.url);
    const postcss = require('postcss');
    const css = readFileSync(new URL('../app/editions/fifa22/fifa22.module.css', import.meta.url), 'utf8');
    const root = postcss.parse(css);
    root.walkRules((rule: { selectors: string[] }) => {
      for (const selector of rule.selectors) expect(selector.trim()).toMatch(/^\.[a-zA-Z]/);
    });
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('min-height: 44px');
    expect(css).not.toMatch(/url\(|@import/);
  });

  it('keeps normal text pairs above WCAG AA contrast', () => {
    const luminance = (hex: string) => {
      const channels = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const t = fifa22.tokens;
    for (const [foreground, background] of [[t['--md-foreground'], t['--md-surface']], [t['--md-muted'], t['--md-surface']], [t['--md-accent-text'], t['--md-accent']], ['#e0e4ef', '#30374c'], ['#d5f448', '#30374c'], [t['--md-muted'], '#32394d']]) {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      expect((values[0] + .05) / (values[1] + .05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
