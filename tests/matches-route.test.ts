import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb, requireT01Database } from "./helpers/t01-database";
import { GET, POST } from "../app/api/matches/route";
import { PATCH, DELETE } from "../app/api/matches/[id]/route";
import { backfillLegacyMatches } from "../lib/matches/legacy-backfill";
import { VALID_RECORD_EDITIONS, LATEST_EDITION } from "../lib/fifa-editions";
import type { MatchDashboard, MatchRecord } from "../lib/matches/contracts";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("./helpers/t01-database")).testDb }));

const valid = {
  friendName: "Sam", playerClub: "PSG", opponentClub: "Madrid",
  playerScore: 3, opponentScore: 1, edition: "FC_27",
};
const req = (body: unknown, method = "POST") => new Request("http://localhost/api/matches", {
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const context = (id: string) => ({ params: Promise.resolve({ id }) });
async function dashboard(edition?: string): Promise<MatchDashboard> {
  const response = await GET(new Request(`http://localhost/api/matches${edition === undefined ? "" : `?edition=${edition}`}`));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  return response.json();
}
async function create(body: object = {}) {
  const response = await POST(req({ ...valid, ...body }));
  expect(response.status).toBe(201);
  return response.json() as Promise<MatchRecord>;
}

// One file owns schema t01 serially. The test guard runs before any database operation.
describe.skipIf(!process.env.TEST_DATABASE_URL)("match HTTP API and confirmed-ID backfill (isolated PostgreSQL)", () => {
  beforeAll(async () => {
    requireT01Database();
    await testDb.$executeRawUnsafe(`ALTER TABLE t01."Match" ALTER COLUMN "edition" SET DEFAULT 'FIFA_22'`);
    const require = createRequire(import.meta.url);
    const migration = fileURLToPath(new URL("../prisma/migrations/20261101000000_concrete_editions/migration.sql", import.meta.url));
    // Exercise the real SQL twice, only inside the guarded disposable schema.
    for (let run = 0; run < 2; run++) {
      execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "db", "execute",
        "--file", migration, "--url", process.env.TEST_DATABASE_URL!], { stdio: "pipe" });
    }
    await testDb.$connect();
  }, 30_000);
  beforeEach(async () => {
    vi.useRealTimers();
    await testDb.match.deleteMany();
    await testDb.friend.deleteMany();
  });
  afterAll(async () => { vi.useRealTimers(); await testDb.$disconnect(); });

  it("has exactly six concrete identities and opens on latest FC 27", async () => {
    expect(VALID_RECORD_EDITIONS).toEqual(["FIFA_22", "FIFA_23", "FC_24", "FC_25", "FC_26", "FC_27"]);
    expect(LATEST_EDITION).toBe("FC_27");
    await create({ edition: "FIFA_22" });
    await create();
    const data = await dashboard();
    expect(data.edition).toBe("FC_27");
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].edition).toBe("FC_27");
  });

  it("isolates every aggregate and rivalry, keeps global friends, and unions each match once", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T12:00:00.000Z"));
    const sam = await testDb.friend.create({ data: { name: "Sam" } });
    const lee = await testDb.friend.create({ data: { name: "Lee" } });
    const seed = [
      ["a", sam.id, "2026-11-01", 3, 1], ["b", sam.id, "2026-10-31", 0, 2],
      ["c", lee.id, "2026-10-30", 2, 2], ["d", sam.id, "2026-10-29", 4, 0],
      ["e", lee.id, "2026-10-28", 1, 0], ["f", sam.id, "2022-01-01", 0, 1],
    ] as const;
    for (const [id, friendId, day, playerScore, opponentScore] of seed) {
      await testDb.match.create({ data: {
        id, friendId, playerClub: "PSG", opponentClub: "Madrid", playerScore, opponentScore,
        edition: "FC_27", playedAt: new Date(`${day}T00:00:00.000Z`),
      } });
    }
    await create({ edition: "FIFA_22", playerScore: 9 });
    const data = await dashboard("FC_27");
    expect(data.matches.map((match) => match.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(data.stats).toEqual({
      totalMatches: 6, winRate: 50, goals: 10, preferredOpponent: "Sam",
      weeklyMatches: 5, recentWins: 2, recentTotal: 4, formRate: 50,
      friendStats: [
        { id: lee.id, name: "Lee", matches: 2, record: "1W - 1D - 0L", winRate: 50 },
        { id: sam.id, name: "Sam", matches: 4, record: "2W - 0D - 2L", winRate: 50 },
      ],
    });
    const old = await dashboard("FIFA_22");
    expect(old.matches).toHaveLength(1);
    expect(old.matches[0].playedAt).toBe("2026-11-01T12:00:00.000Z");
    expect(old.friends).toHaveLength(2);
    expect(old.stats.goals).toBe(9);
    expect(old.stats.friendStats.find((friend) => friend.id === sam.id)?.matches).toBe(1);
    const all = await dashboard("ALL");
    expect(new Set(all.matches.map((match) => match.id)).size).toBe(7);
    expect(all.stats).toMatchObject({ totalMatches: 7, goals: 19, winRate: 57, weeklyMatches: 6 });
    expect(await testDb.friend.count()).toBe(2);
    const empty = await dashboard("FC_24");
    expect(empty.matches).toEqual([]);
    expect(empty.friends).toHaveLength(2);
    expect(empty.stats).toEqual({
      totalMatches: 0, winRate: 0, goals: 0, preferredOpponent: null,
      weeklyMatches: 0, recentWins: 0, recentTotal: 0, formRate: 0,
      friendStats: [lee, sam].map(({ id, name }) => ({ id, name, matches: 0, record: "0W - 0D - 0L", winRate: 0 })),
    });
  });

  it.each(["", "all", "FC_28", "__proto__", "FIFA_22&edition=FC_27"])("rejects invalid/ambiguous GET scope %s", async (scope) => {
    expect((await GET(new Request(`http://localhost/api/matches?edition=${scope}`))).status).toBe(400);
  });

  it.each(["upload", "manual"])("rejects missing, invalid and aggregate editions in %s mode without writes", async (entryMode) => {
    for (const edition of [undefined, null, "", "ALL", "FC_28", "__proto__", 22]) {
      const response = await POST(req({ ...valid, entryMode, edition, playedAt: "2022-01-01" }));
      expect(response.status).toBe(400);
    }
    expect(await testDb.match.count()).toBe(0);
    expect(await testDb.friend.count()).toBe(0);
  });

  it("rejects malformed bodies, invalid modes, blank friends/clubs and implausible required scores", async () => {
    for (const body of [null, [], { ...valid, entryMode: "other" }, { ...valid, entryMode: null }, { ...valid, friendName: "  " },
      { ...valid, playerClub: " " }, { ...valid, playerScore: 999 }, { ...valid, playerScore: "3" }]) {
      expect((await POST(req(body))).status).toBe(400);
    }
    expect((await POST(new Request("http://localhost/api/matches", { method: "POST", body: "{" }))).status).toBe(400);
    expect(await testDb.match.count()).toBe(0);
    expect(await testDb.friend.count()).toBe(0);
  });

  it("shares friend identity across editions and entry modes, preserving independent match dates", async () => {
    const manual = await create({ entryMode: "manual", edition: "FIFA_22", playedAt: "2020-02-29", possession: 250 });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-02T00:03:00.000Z"));
    const uploaded = await create({ entryMode: "upload", playedAt: "1999-01-01", uploadDate: "1999-01-01" });
    expect(uploaded.friendId).toBe(manual.friendId);
    expect(manual.playedAt).toBe("2020-02-29T00:00:00.000Z");
    expect(manual.possession).toBeNull();
    // Compatibility upload uses server time; T2 will bind the earlier uploadDate via signed context.
    expect(uploaded.playedAt).toBe("2026-11-02T00:03:00.000Z");
    expect((await dashboard("FIFA_22")).matches[0].playedAt).toBe(manual.playedAt);
    expect(await testDb.friend.count()).toBe(1);
  });

  it.each([undefined, "2023-02-29", "2026-13-01", "2026-02-30", "2026-11-01T00:00:00Z"])("rejects invalid manual date %s", async (playedAt) => {
    expect((await POST(req({ ...valid, entryMode: "manual", playedAt }))).status).toBe(400);
    expect(await testDb.match.count()).toBe(0);
  });

  it("rejects unverified upload context without creating a friend or match", async () => {
    expect((await POST(req({ ...valid, uploadContext: "forged" }))).status).toBe(400);
    expect(await testDb.friend.count()).toBe(0);
    expect(await testDb.match.count()).toBe(0);
  });

  it("preserves timestamps/edition on ordinary edits and refreshes aggregates after create/edit/delete", async () => {
    const match = await create({ entryMode: "manual", playedAt: "2022-05-05", shots: 9 });
    expect((await dashboard()).stats.totalMatches).toBe(1);
    const changes = { ...valid, friendId: match.friendId, playerScore: 0, opponentScore: 2 };
    delete (changes as { edition?: string }).edition;
    const patched = await PATCH(req({ ...changes, playedAt: "2000-01-01", createdAt: "2000-01-01" }, "PATCH"), context(match.id));
    expect(patched.status).toBe(200);
    const updated = await patched.json();
    expect(updated.playedAt).toBe(match.playedAt);
    expect(updated.createdAt).toBe(match.createdAt);
    expect(updated.edition).toBe(match.edition);
    expect((await dashboard()).stats).toMatchObject({ totalMatches: 1, winRate: 0, goals: 0 });
    for (const edition of ["ALL", "", null, "FC_28"]) {
      expect((await PATCH(req({ ...changes, edition }, "PATCH"), context(match.id))).status).toBe(400);
    }
    expect((await PATCH(req({ ...changes, edition: "FC_25" }, "PATCH"), context(match.id))).status).toBe(200);
    expect((await dashboard()).stats.totalMatches).toBe(0);
    expect((await dashboard("FC_25")).stats.totalMatches).toBe(1);
    expect((await dashboard("ALL")).stats.totalMatches).toBe(1);
    expect((await DELETE(req({}, "DELETE"), context(match.id))).status).toBe(204);
    expect((await dashboard("ALL")).stats.totalMatches).toBe(0);
    expect((await dashboard("FC_25")).stats.totalMatches).toBe(0);
    expect(await testDb.friend.count()).toBe(1);
  });

  it("atomically rolls back a new friend if match persistence fails", async () => {
    await testDb.$executeRawUnsafe(`CREATE FUNCTION t01.fail_match_insert() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END; $$ LANGUAGE plpgsql`);
    await testDb.$executeRawUnsafe(`CREATE TRIGGER fail_match_insert BEFORE INSERT ON t01."Match" FOR EACH ROW EXECUTE FUNCTION t01.fail_match_insert()`);
    try {
      await expect(POST(req(valid))).rejects.toThrow();
      expect(await testDb.friend.count()).toBe(0);
      expect(await testDb.match.count()).toBe(0);
    } finally {
      await testDb.$executeRawUnsafe(`DROP TRIGGER fail_match_insert ON t01."Match"`);
      await testDb.$executeRawUnsafe(`DROP FUNCTION t01.fail_match_insert()`);
    }
  });

  it("SQL migration removes the old default and enforces concrete identities even outside HTTP", async () => {
    const columns = await testDb.$queryRaw<{ column_default: string | null }[]>`
      SELECT column_default FROM information_schema.columns
      WHERE table_schema = 't01' AND table_name = 'Match' AND column_name = 'edition'
    `;
    expect(columns).toEqual([{ column_default: null }]);
    const friend = await testDb.friend.create({ data: { name: "Sam" } });
    for (const edition of ["ALL", "FC_28", ""]) {
      await expect(testDb.match.create({ data: {
        friendId: friend.id, playerClub: "PSG", opponentClub: "Madrid",
        playerScore: 1, opponentScore: 0, edition,
      } })).rejects.toThrow();
    }
    expect(await testDb.match.count()).toBe(0);
  });

  it("backfills only explicit confirmed IDs, preserves every other field, and is repeatable", async () => {
    const friend = await testDb.friend.create({ data: { name: "Sam" } });
    const base = {
      friendId: friend.id, playerClub: "PSG", opponentClub: "Madrid", playerScore: 2, opponentScore: 1,
      possession: 52, shots: 10, imageUrl: "/legacy.png", edition: "FIFA_22",
      playedAt: new Date("2021-10-10T23:59:00.000Z"), createdAt: new Date("2022-01-01T01:02:03.000Z"),
    };
    await testDb.match.createMany({ data: [
      { ...base, id: "legacy-a" }, { ...base, id: "legacy-b", edition: "FC_25" },
      { ...base, id: "genuine-22" }, { ...base, id: "genuine-25", edition: "FC_25" },
    ] });
    const before = await testDb.match.findMany({ orderBy: { id: "asc" } });
    const options = { confirmedIds: ["legacy-a", "legacy-b", "legacy-a"] };
    const preview = await backfillLegacyMatches(testDb, options);
    expect(preview).toMatchObject({ dryRun: true, confirmedCount: 2 });
    expect(preview.changes).toHaveLength(2);
    expect(await testDb.match.findMany({ orderBy: { id: "asc" } })).toEqual(before);
    await backfillLegacyMatches(testDb, { ...options, dryRun: false });
    expect(await testDb.match.findMany({ orderBy: { id: "asc" } })).toEqual(before.map((match) => ({
      ...match, edition: match.id.startsWith("legacy-") ? "FC_27" : match.edition,
    })));
    expect((await backfillLegacyMatches(testDb, { ...options, dryRun: false })).changes).toEqual([]);
    expect(await testDb.match.count()).toBe(4);
  });

  it("handles empty cohorts/databases and rejects unknown IDs before making changes", async () => {
    expect(await backfillLegacyMatches(testDb, { confirmedIds: [], dryRun: false })).toEqual({
      dryRun: false, confirmedCount: 0, changes: [],
    });
    const match = await create({ edition: "FIFA_22" });
    await expect(backfillLegacyMatches(testDb, { confirmedIds: [match.id, "missing"], dryRun: false })).rejects.toThrow("Unknown confirmed");
    expect((await testDb.match.findUniqueOrThrow({ where: { id: match.id } })).edition).toBe("FIFA_22");
    await expect(backfillLegacyMatches(testDb, { confirmedIds: [""] })).rejects.toThrow("confirmed");
  });
});
