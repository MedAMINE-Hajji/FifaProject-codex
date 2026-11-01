import { describe, expect, it } from "vitest";
import { resolveManualDate } from "../lib/matches/manual-date";

describe("manual calendar dates", () => {
  it.each(["2024-02-29", "2022-01-01", "2026-12-31"])("preserves %s at UTC midnight", (day) => {
    const result = resolveManualDate(day);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.playedAt.toISOString()).toBe(`${day}T00:00:00.000Z`);
  });

  it.each([undefined, null, 20261101, "", "2023-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-01-00", "2026-1-01", "2026-01-01T23:00:00-08:00"])("rejects invalid date %s", (value) => {
    expect(resolveManualDate(value).ok).toBe(false);
  });
});
