import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../lib/prisma";
import { GET, POST } from "../app/api/matches/route";
import type { MatchDashboard, MatchRecord } from "../lib/matches/contracts";

vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const url = new URL(process.env.T03_DATABASE_URL ?? "postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t03");
  if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/matchday_test" || url.searchParams.get("schema") !== "t03") {
    throw new Error("T3 API tests require the disposable localhost test server with schema=t03.");
  }
  return { prisma: new PrismaClient({ datasources: { db: { url: url.toString() } } }) };
});

const valid = {
  entryMode: "manual", edition: "FIFA_22", friendName: "Alex", playerClub: "Arsenal",
  opponentClub: "Madrid", playerScore: 3, opponentScore: 1, playedAt: "2024-02-29",
};
const post = (changes: object = {}) => POST(new Request("http://localhost/api/matches", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...valid, ...changes }),
}));
const dashboard = async (edition: string): Promise<MatchDashboard> =>
  (await GET(new Request(`http://localhost/api/matches?edition=${edition}`))).json();

describe.skipIf(!process.env.T03_DATABASE_URL)("T3 manual entry HTTP API (isolated schema t03)", () => {
  beforeAll(() => {
    const require = createRequire(import.meta.url);
    execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "db", "push", "--skip-generate"], {
      stdio: "pipe", env: { ...process.env, DATABASE_URL: process.env.T03_DATABASE_URL! },
    });
  }, 30_000);
  beforeEach(async () => { await prisma.match.deleteMany(); await prisma.friend.deleteMany(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("creates a shared friend, preserves a leap day on reload and refreshes scoped statistics", async () => {
    const response = await post();
    expect(response.status).toBe(201);
    const first: MatchRecord = await response.json();
    expect(first).toMatchObject({ edition: "FIFA_22", playedAt: "2024-02-29T00:00:00.000Z", imageUrl: null, possession: null, shots: null });
    expect((await prisma.match.findUniqueOrThrow({ where: { id: first.id } })).playedAt.toISOString()).toBe("2024-02-29T00:00:00.000Z");
    const second: MatchRecord = await (await post({ edition: "FC_27", playedAt: "2022-01-01", possession: 55, shots: 9 })).json();
    expect(second.friendId).toBe(first.friendId);
    expect(second).toMatchObject({ edition: "FC_27", playedAt: "2022-01-01T00:00:00.000Z", possession: 55, shots: 9 });
    expect(await prisma.friend.count()).toBe(1);
    expect((await dashboard("FIFA_22")).matches.map(match => match.id)).toEqual([first.id]);
    expect((await dashboard("FC_27")).stats).toMatchObject({ totalMatches: 1, goals: 3, winRate: 100 });
    expect((await dashboard("ALL")).stats.totalMatches).toBe(2);
  });

  it.each([undefined, "", "2023-02-29", "2026-04-31", "2022-01-01T23:00:00-08:00"])("rejects date %s without creating a friend or match", async (playedAt) => {
    expect((await post({ playedAt })).status).toBe(400);
    expect(await prisma.match.count()).toBe(0);
    expect(await prisma.friend.count()).toBe(0);
  });

  it.each([
    { edition: "ALL" }, { edition: "unknown" }, { friendName: " " }, { friendName: "x".repeat(81) },
    { playerClub: " " }, { opponentClub: "" }, { playerScore: -1 }, { opponentScore: 201 }, { playerScore: 1.5 },
  ])("rejects invalid manual fields %j", async (changes) => {
    expect((await post(changes)).status).toBe(400);
    expect(await prisma.match.count()).toBe(0);
    expect(await prisma.friend.count()).toBe(0);
  });

  it("accepts score boundaries and applies shared optional-stat validation", async () => {
    const response = await post({ playerScore: 0, opponentScore: 200, possession: 101, shots: -1 });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ playerScore: 0, opponentScore: 200, possession: null, shots: null });
  });
});
