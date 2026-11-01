type StatsInput = {
  playerScore?: unknown;
  opponentScore?: unknown;
  possession?: unknown;
  shots?: unknown;
};

export type ValidatedStats = {
  playerScore: number;
  opponentScore: number;
  possession: number | null;
  shots: number | null;
};

export type ValidateStatsResult =
  | { ok: true; stats: ValidatedStats }
  | { ok: false; reason: string };

const SCORE_LIMIT = 200;
const POSSESSION_LIMIT = 100;
const SHOTS_LIMIT = 200;

function requireScore(value: unknown, label: string): number | string {
  if (typeof value !== "number" || !Number.isFinite(value)) return `${label} must be a number`;
  if (!Number.isInteger(value)) return `${label} must be an integer`;
  if (value < 0 || value > SCORE_LIMIT) return `${label} must be between 0 and 200`;
  return value;
}

function optionalStat(value: unknown, limit: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > limit) return null;
  return value;
}

export function validateStats(input: StatsInput): ValidateStatsResult {
  const playerScore = requireScore(input.playerScore, "playerScore");
  if (typeof playerScore === "string") return { ok: false, reason: playerScore };

  const opponentScore = requireScore(input.opponentScore, "opponentScore");
  if (typeof opponentScore === "string") return { ok: false, reason: opponentScore };

  return {
    ok: true,
    stats: {
      playerScore,
      opponentScore,
      possession: optionalStat(input.possession, POSSESSION_LIMIT),
      shots: optionalStat(input.shots, SHOTS_LIMIT),
    },
  };
}
