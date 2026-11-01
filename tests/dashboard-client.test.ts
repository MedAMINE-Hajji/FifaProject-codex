import { describe, expect, it } from "vitest";
import { createDashboardStore } from "../lib/matches/dashboard-client";
import type { FifaEdition } from "../lib/fifa-editions";

function pendingFetches() {
  const pending: { url: string; resolve: (value: Response) => void; reject: (error: Error) => void }[] = [];
  const fetcher: typeof fetch = (input) => new Promise((resolve, reject) => {
    pending.push({ url: String(input), resolve, reject });
  });
  const settle = async (index: number, edition: FifaEdition) => {
    pending[index].resolve(Response.json({ edition, matches: [], friends: [], stats: {} }));
    // Drain both fetch and response.json continuations.
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { pending, fetcher, settle };
}

describe("dashboard request ownership", () => {
  it("starts every new visit at FC 27 and discards a delayed earlier edition response", async () => {
    const network = pendingFetches();
    const store = createDashboardStore(network.fetcher);
    const initial = store.refresh();
    expect(store.getSnapshot().edition).toBe("FC_27");
    store.select("FIFA_22");
    expect(store.getSnapshot().data).toBeNull();
    await network.settle(1, "FIFA_22");
    await network.settle(0, "FC_27");
    await initial;
    expect(store.getSnapshot().data?.edition).toBe("FIFA_22");
    expect(createDashboardStore(network.fetcher).getSnapshot().edition).toBe("FC_27");
  });

  it("uses explicit ALL, clears previous scope while loading and ignores stale errors", async () => {
    const network = pendingFetches();
    const store = createDashboardStore(network.fetcher);
    const first = store.refresh();
    await network.settle(0, "FC_27");
    await first;
    const oldMutation = store.refresh();
    store.select("ALL");
    expect(store.getSnapshot().data).toBeNull();
    expect(network.pending[2].url).toBe("/api/matches?edition=ALL");
    await network.settle(2, "ALL");
    network.pending[1].reject(new Error("late failure"));
    await oldMutation;
    expect(store.getSnapshot()).toMatchObject({ edition: "ALL", error: "", loading: false });
    expect(store.getSnapshot().data?.edition).toBe("ALL");
    const currentMutation = store.refresh();
    expect(network.pending[3].url).toContain("edition=ALL");
    await network.settle(3, "ALL");
    await currentMutation;
  });

  it("keeps only the latest mutation refresh and invalidates unmounted requests", async () => {
    const network = pendingFetches();
    const store = createDashboardStore(network.fetcher);
    const old = store.refresh();
    const latest = store.refresh();
    await network.settle(1, "FC_27");
    const snapshot = store.getSnapshot();
    await network.settle(0, "FC_27");
    await Promise.all([old, latest]);
    expect(store.getSnapshot()).toBe(snapshot);
    const abandoned = store.refresh();
    const beforeCancel = store.getSnapshot();
    store.cancel();
    await network.settle(2, "FC_27");
    await abandoned;
    expect(store.getSnapshot()).toBe(beforeCancel);
  });

  it("rejects a response whose edition differs from the active request", async () => {
    const network = pendingFetches();
    const store = createDashboardStore(network.fetcher);
    const request = store.refresh();
    await network.settle(0, "FIFA_22");
    await request;
    expect(store.getSnapshot().data).toBeNull();
    expect(store.getSnapshot().error).toContain("different edition");
  });
});
