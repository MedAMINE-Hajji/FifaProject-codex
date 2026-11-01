import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/matches/route";
import type { MatchDashboard } from "../lib/matches/contracts";
import { VALID_RECORD_EDITIONS } from "../lib/fifa-editions";

const databaseUrl = "postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t04";
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_, key) => Reflect.get(db, key) }) }));

async function read(edition = "ALL"): Promise<MatchDashboard> {
  const response = await GET(new Request(`http://localhost/api/matches?edition=${edition}`));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  return response.json();
}

describe("T4 career HTTP API with isolated PostgreSQL schema t04", () => {
  beforeAll(() => {
    const require = createRequire(import.meta.url);
    execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "db", "push", "--skip-generate"], {
      stdio: "pipe", env: { ...process.env, DATABASE_URL: databaseUrl },
    });
  }, 30_000);
  beforeEach(async () => { await db.match.deleteMany(); await db.friend.deleteMany(); });
  afterAll(async () => { await db.$disconnect(); });

  it("counts one union with six comparisons and shared friend rivalries, independent of match dates", async () => {
    const sam = await db.friend.create({ data: { name: "Sam" } });
    const unused = await db.friend.create({ data: { name: "No games" } });
    for (const [edition, playerScore, opponentScore] of [
      ["FIFA_22", 3, 1], ["FIFA_22", 1, 1], ["FIFA_22", 0, 2], ["FC_27", 5, 0],
    ] as const) {
      await db.match.create({ data: {
        friendId: sam.id, edition, playerScore, opponentScore,
        playerClub: "PSG", opponentClub: "Madrid", playedAt: new Date("2020-01-01T00:00:00Z"),
      } });
    }
    const career = await read();
    expect(career.stats).toMatchObject({ totalMatches: 4, goals: 9, winRate: 50 });
    expect(career.matches).toHaveLength(4);
    expect(new Set(career.matches.map((row) => row.id)).size).toBe(4);
    expect(career.friends).toHaveLength(2);
    expect(career.stats.friendStats).toContainEqual({ id: sam.id, name: "Sam", matches: 4, record: "2W - 1D - 1L", winRate: 50 });
    expect(career.stats.friendStats).toContainEqual({ id: unused.id, name: "No games", matches: 0, record: "0W - 0D - 0L", winRate: 0 });
    expect(career.comparisons?.map((row) => row.edition)).toEqual(VALID_RECORD_EDITIONS);
    expect(career.comparisons?.[0]).toEqual({ edition: "FIFA_22", name: "FIFA 22", matches: 3, wins: 1, draws: 1, losses: 1, goals: 4, winRate: 33 });
    expect(career.comparisons?.[5]).toMatchObject({ matches: 1, wins: 1, goals: 5, winRate: 100 });
    expect(career.comparisons?.reduce((sum, row) => sum + row.matches, 0)).toBe(4);
    expect(career.comparisons?.reduce((sum, row) => sum + row.goals, 0)).toBe(9);
    const concrete = await read("FIFA_22");
    expect(concrete.matches).toHaveLength(3);
    expect(concrete.comparisons).toBeUndefined();
    expect(concrete.stats).toMatchObject({ totalMatches: 3, winRate: 33, goals: 4 });
    expect((await read("FC_24")).stats.totalMatches).toBe(0);
  });

  it("shows six honest zero rows for empty history and reflects subsequent mutations", async () => {
    const empty = await read();
    expect(empty.matches).toEqual([]);
    expect(empty.comparisons).toHaveLength(6);
    for (const row of empty.comparisons!) expect(row).toMatchObject({ matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, winRate: 0 });
    const friend = await db.friend.create({ data: { name: "Alex" } });
    const match = await db.match.create({ data: { friendId: friend.id, edition: "FC_25", playerClub: "PSG", opponentClub: "Madrid", playerScore: 2, opponentScore: 0 } });
    expect((await read()).comparisons?.[3]).toMatchObject({ matches: 1, wins: 1, goals: 2 });
    await db.match.update({ where: { id: match.id }, data: { playerScore: 0, opponentScore: 1 } });
    expect((await read()).comparisons?.[3]).toMatchObject({ wins: 0, losses: 1, goals: 0 });
    await db.match.delete({ where: { id: match.id } });
    expect((await read()).stats.totalMatches).toBe(0);
  });
});
