import { LATEST_EDITION, type FifaEdition } from "@/lib/fifa-editions";
import type { DashboardStats, MatchDashboard } from "./contracts";

export const EMPTY_STATS: DashboardStats = {
  totalMatches: 0, winRate: 0, goals: 0, preferredOpponent: null,
  weeklyMatches: 0, recentWins: 0, recentTotal: 0, formRate: 0, friendStats: [],
};
type Snapshot = { edition: FifaEdition; data: MatchDashboard | null; error: string; loading: boolean };

// One store per mounted page, never localStorage: a fresh visit starts at latest.
export function createDashboardStore(fetcher: typeof fetch = fetch) {
  let snapshot: Snapshot = { edition: LATEST_EDITION, data: null, error: "", loading: true };
  let generation = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  function publish(next: Snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  async function refresh() {
    const edition = snapshot.edition;
    const requestGeneration = ++generation;
    controller?.abort();
    controller = new AbortController();
    publish({ ...snapshot, loading: true, error: "" });
    try {
      const response = await fetcher(`/api/matches?edition=${edition}`, {
        signal: controller.signal, cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to load this edition's history.");
      const data: MatchDashboard = await response.json();
      if (generation !== requestGeneration || snapshot.edition !== edition) return;
      if (data.edition !== edition) throw new Error("The server returned a different edition. Please refresh.");
      publish({ edition, data, loading: false, error: "" });
    } catch (error: unknown) {
      if (generation !== requestGeneration || snapshot.edition !== edition) return;
      publish({ ...snapshot, loading: false, error: error instanceof Error ? error.message : "Unable to load history." });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    select(edition: FifaEdition) {
      if (edition === snapshot.edition) return;
      publish({ edition, data: null, error: "", loading: true });
      void refresh();
    },
    refresh, // Mutations always refresh the currently selected scope, never a captured old one.
    cancel() { ++generation; controller?.abort(); },
  };
}
