import { describe, expect, it } from "vitest";
import { validateStats } from "../lib/match-stats";

const validMatch = { playerScore: 3, opponentScore: 1 };

describe("stat sanity validation", () => {
  it("accepts a match with plausible FIFA stats", () => {
    const result = validateStats({
      ...validMatch,
      possession: 55,
      shots: 12,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats).toEqual({
        playerScore: 3,
        opponentScore: 1,
        possession: 55,
        shots: 12,
      });
    }
  });

  it("rejects when a required score is missing", () => {
    expect(validateStats({ opponentScore: 1 }).ok).toBe(false);
  });

  it("rejects impossible scores like 999", () => {
    expect(validateStats({ playerScore: 999, opponentScore: 1 }).ok).toBe(false);
  });

  it("rejects negative scores", () => {
    expect(validateStats({ playerScore: -1, opponentScore: 1 }).ok).toBe(false);
  });

  it("rejects non-numeric scores", () => {
    expect(
      validateStats({ playerScore: "three", opponentScore: 1 }).ok,
    ).toBe(false);
  });

  it("nulls an implausible optional stat instead of rejecting the match", () => {
    const result = validateStats({ playerScore: 2, opponentScore: 2, possession: 250 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.possession).toBeNull();
    }
  });

  it("keeps missing optional stats as null", () => {
    const result = validateStats(validMatch);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.possession).toBeNull();
      expect(result.stats.shots).toBeNull();
    }
  });
});
