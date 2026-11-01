import type { PrismaClient } from "@prisma/client";

export type LegacyBackfillOptions = { confirmedIds: readonly string[]; dryRun?: boolean };

// No defaults, dates, or edition values are evidence of legacy membership.
export async function backfillLegacyMatches(
  db: Pick<PrismaClient, "$transaction">,
  { confirmedIds, dryRun = true }: LegacyBackfillOptions,
) {
  if (!Array.isArray(confirmedIds) || confirmedIds.some((id) => typeof id !== "string" || !id.trim())) {
    throw new Error("Provide confirmed, nonempty match IDs.");
  }
  const ids = [...new Set(confirmedIds)];
  return db.$transaction(async (tx) => {
    const matches = await tx.match.findMany({ where: { id: { in: ids } } });
    const found = new Set(matches.map((match) => match.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) throw new Error(`Unknown confirmed match IDs: ${missing.join(", ")}`);
    const changes = matches.filter((match) => match.edition !== "FC_27")
      .map((match) => ({ id: match.id, from: match.edition, to: "FC_27" as const }));
    if (!dryRun && changes.length) {
      await tx.match.updateMany({
        where: { id: { in: changes.map((match) => match.id) } },
        data: { edition: "FC_27" },
      });
    }
    return { dryRun, confirmedCount: ids.length, changes };
  });
}
