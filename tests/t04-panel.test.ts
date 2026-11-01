import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CareerPanel from "../app/components/CareerPanel";
import { FIFA_EDITIONS, VALID_RECORD_EDITIONS } from "../lib/fifa-editions";
import type { MatchDashboard } from "../lib/matches/contracts";

const dashboard: MatchDashboard = {
  edition: "ALL", matches: [], friends: [],
  stats: { totalMatches: 0, winRate: 0, goals: 0, preferredOpponent: null, weeklyMatches: 0, recentWins: 0, recentTotal: 0, formRate: 0, friendStats: [] },
  comparisons: VALID_RECORD_EDITIONS.map((edition) => ({ edition, name: FIFA_EDITIONS[edition].name, matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, winRate: 0 })),
};

describe("T4 CareerPanel rendered content", () => {
  it("exposes labeled lifetime totals and six concrete edition buttons with honest empty states", () => {
    const html = renderToStaticMarkup(createElement(CareerPanel, { dashboard, onSelectEdition: () => {} }));
    expect(html).toContain('aria-label="Career overview"');
    expect(html).toContain('aria-label="Lifetime totals"');
    expect(html).toContain("No matches recorded yet");
    expect(html.match(/type="button"/g)).toHaveLength(6);
    for (const edition of VALID_RECORD_EDITIONS) expect(html).toContain(`View ${FIFA_EDITIONS[edition].name} history`);
    expect(html).toContain("No friend rivalries yet");
    expect(html).toContain("choose a game edition in the entry dialog");
  });
  it("does not present a concrete dashboard as lifetime results", () => {
    expect(renderToStaticMarkup(createElement(CareerPanel, { dashboard: { ...dashboard, edition: "FC_27" }, onSelectEdition: () => {} }))).toBe("");
  });
  it("renders populated lifetime totals and global rivalries without the empty-history message", () => {
    const populated: MatchDashboard = {
      ...dashboard,
      matches: [{
        id: "match-1", friendId: "sam", friend: { id: "sam", name: "Sam" },
        edition: "FIFA_22", playerClub: "PSG", opponentClub: "Madrid",
        playerScore: 3, opponentScore: 1, possession: null, shots: null, imageUrl: null,
        playedAt: "2026-01-01T00:00:00Z", createdAt: "2026-01-01T00:00:00Z",
      }],
      stats: { ...dashboard.stats, totalMatches: 1, goals: 3, winRate: 100,
        friendStats: [{ id: "sam", name: "Sam", matches: 1, record: "1W - 0D - 0L", winRate: 100 }] },
      comparisons: dashboard.comparisons?.map((row) => row.edition === "FIFA_22"
        ? { ...row, matches: 1, wins: 1, goals: 3, winRate: 100 } : row),
    };
    const html = renderToStaticMarkup(createElement(CareerPanel, { dashboard: populated, onSelectEdition: () => {} }));
    expect(html).toContain("<dt>Matches</dt><dd>1</dd>");
    expect(html).toContain("<dt>Goals scored</dt><dd>3</dd>");
    expect(html).toContain("<dt>Win rate</dt><dd>100%</dd>");
    expect(html).toContain("Sam</strong><span>1 match · 1W - 0D - 0L · 100% win rate");
    expect(html).not.toContain("No matches recorded yet");
  });
  it("reports unavailable comparisons rather than inventing zero results", () => {
    const html = renderToStaticMarkup(createElement(CareerPanel, { dashboard: { ...dashboard, comparisons: undefined }, onSelectEdition: () => {} }));
    expect(html).toContain("Edition comparisons are unavailable");
  });
});
