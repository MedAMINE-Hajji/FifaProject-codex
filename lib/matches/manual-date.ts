import type { EntryDateResult } from "./contracts";

// T3 owns this adapter. Keep calendar dates separate from upload timestamps.
export function resolveManualDate(value: unknown): EntryDateResult {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, error: "Choose a match date in YYYY-MM-DD format." };
  }
  const playedAt = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(playedAt.getTime()) || playedAt.toISOString().slice(0, 10) !== value) {
    return { ok: false, error: "Choose a valid calendar date." };
  }
  return { ok: true, playedAt };
}
