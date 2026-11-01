import { PrismaClient } from "@prisma/client";

const testUrl = process.env.TEST_DATABASE_URL;
export const testSchema = new URL(testUrl ?? "postgresql://localhost/matchday_test?schema=t01").searchParams.get("schema") ?? "t01";
export function requireT01Database() {
  if (!testUrl) throw new Error("Set TEST_DATABASE_URL to the disposable T1 database.");
  const url = new URL(testUrl);
  if (url.hostname !== "127.0.0.1" || url.port !== "55432" ||
      url.pathname !== "/matchday_test" || !/^t01(?:_[a-z0-9]+)?$/.test(url.searchParams.get("schema") ?? "")) {
    throw new Error("T1 tests require the disposable localhost database and a t01-prefixed isolated schema.");
  }
}
// No production environment lookup, and never a shared generated client.
export const testDb = new PrismaClient({ datasources: { db: {
  url: testUrl ?? "postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t01",
} } });
