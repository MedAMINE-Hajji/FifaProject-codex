import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as analyze } from "../app/api/matches/analyze/route";
import { POST as create, GET } from "../app/api/matches/route";

const { url, db } = await vi.hoisted(async () => {
  const { PrismaClient } = await import("@prisma/client");
  const url = "postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t02";
  return { url, db: new PrismaClient({ datasources: { db: { url } } }) };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));
const match = { friendName: "Alex", playerClub: "PSG", opponentClub: "Madrid", playerScore: 3, opponentScore: 1 };
const request = (body: object) => new Request("http://localhost/api/matches", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

describe.skipIf(!process.env.T02_DATABASE_URL)("upload HTTP flow with isolated PostgreSQL", () => {
  beforeAll(() => {
    if (process.env.T02_DATABASE_URL !== url) throw new Error("Use only the assigned local t02 test schema.");
    const require = createRequire(import.meta.url);
    execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "db", "push", "--skip-generate"], {
      stdio: "pipe", env: { ...process.env, DATABASE_URL: url },
    });
  }, 30_000);
  beforeEach(async () => {
    await db.match.deleteMany(); await db.friend.deleteMany();
    vi.stubEnv("AI_API_KEY", "fake-ai-key");
    vi.stubEnv("UPLOAD_CONTEXT_SECRET", "stable-test-key");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-31T23:59:59.000Z"));
    vi.stubGlobal("fetch", vi.fn(async () => {
      vi.setSystemTime(new Date("2026-11-01T00:02:00.000Z"));
      return Response.json({ choices: [{ message: { content: JSON.stringify({ ...match, isFifa: true }) } }] });
    }));
  });
  afterAll(async () => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); await db.$disconnect(); });

  async function upload() {
    const form = new FormData(); form.append("edition", "FIFA_22");
    form.append("image", new File(["fake image"], "result.png", { type: "image/png" }));
    const response = await analyze(new Request("http://localhost/api/matches/analyze", { method: "POST", body: form }));
    expect(response.status).toBe(200);
    return response.json();
  }

  it("persists original upload date after midnight, scopes history and ignores client/extracted dates", async () => {
    const review = await upload();
    const response = await create(request({ ...review, edition: "FIFA_22", entryMode: "upload", playedAt: "1999-01-01", uploadDate: "1999-01-01" }));
    expect(response.status).toBe(201);
    const saved = await response.json();
    expect(saved.playedAt).toBe("2026-10-31T23:59:59.000Z");
    const persisted = await db.match.findUniqueOrThrow({ where: { id: saved.id } });
    expect(persisted.edition).toBe("FIFA_22");
    expect(persisted.playedAt.toISOString()).toBe(saved.playedAt);
    const fifa22 = await (await GET(new Request("http://localhost/api/matches?edition=FIFA_22"))).json();
    const fc27 = await (await GET(new Request("http://localhost/api/matches?edition=FC_27"))).json();
    expect(fifa22.matches.map((item: { id: string }) => item.id)).toEqual([saved.id]);
    expect(fc27.matches).toEqual([]);
  });

  it("rejects a changed edition and tampered token without creating a friend or match", async () => {
    const review = await upload();
    for (const body of [{ ...review, edition: "FC_27" }, { ...review, edition: "FIFA_22", uploadContext: `${review.uploadContext}x` }]) {
      expect((await create(request({ ...body, entryMode: "upload" }))).status).toBe(400);
    }
    expect(await db.match.count()).toBe(0); expect(await db.friend.count()).toBe(0);
  });

  it("keeps old API uploads on server receipt time", async () => {
    const response = await create(request({ ...match, edition: "FC_27", playedAt: "1999-01-01" }));
    expect(response.status).toBe(201);
    expect((await response.json()).playedAt).toBe("2026-10-31T23:59:59.000Z");
  });
});
