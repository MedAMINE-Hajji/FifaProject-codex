import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { backfillLegacyMatches } from "../lib/matches/legacy-backfill";

async function main() {
  const args = process.argv.slice(2);
  const manifest = args.find((arg) => !arg.startsWith("--"));
  if (!manifest || args.some((arg) => arg.startsWith("--") && arg !== "--apply" && arg !== "--dry-run") ||
      (args.includes("--apply") && args.includes("--dry-run"))) {
    throw new Error("Usage: npx tsx scripts/backfill-legacy.ts confirmed-ids.json [--dry-run|--apply]");
  }
  const confirmedIds: unknown = JSON.parse(await readFile(manifest, "utf8"));
  if (!Array.isArray(confirmedIds) || confirmedIds.some((id) => typeof id !== "string" || !id.trim())) {
    throw new Error("Manifest must be a JSON array of confirmed match IDs.");
  }
  const url = process.env.LEGACY_BACKFILL_DATABASE_URL;
  if (!url) throw new Error("Set LEGACY_BACKFILL_DATABASE_URL explicitly. DATABASE_URL is never used as a fallback.");
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    console.log(JSON.stringify(await backfillLegacyMatches(db, {
      confirmedIds, dryRun: !args.includes("--apply"),
    }), null, 2));
  } finally {
    await db.$disconnect();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Legacy backfill failed.");
  process.exitCode = 1;
});
