import { NextResponse } from "next/server";
import type { Friend, Match } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FIFA_EDITIONS, isEditionScope, LATEST_EDITION, VALID_RECORD_EDITIONS } from "@/lib/fifa-editions";
import type { DashboardStats, EditionComparison } from "./contracts";

// Shared aggregation seam for T4's career comparisons. Input is already scope-filtered.
export function summarizeMatches(matches: Match[], friends: Friend[], now = new Date()): DashboardStats {
  const wins = matches.filter((match) => match.playerScore > match.opponentScore).length;
  const recentMatches = matches.slice(0, 4);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const friendStats = friends.map((friend) => {
    const rows = matches.filter((match) => match.friendId === friend.id);
    const friendWins = rows.filter((match) => match.playerScore > match.opponentScore).length;
    const draws = rows.filter((match) => match.playerScore === match.opponentScore).length;
    return {
      id: friend.id,
      name: friend.name,
      matches: rows.length,
      record: `${friendWins}W - ${draws}D - ${rows.length - friendWins - draws}L`,
      winRate: rows.length ? Math.round((friendWins / rows.length) * 100) : 0,
    };
  });
  const recentWins = recentMatches.filter((match) => match.playerScore > match.opponentScore).length;
  return {
    totalMatches: matches.length,
    winRate: matches.length ? Math.round((wins / matches.length) * 100) : 0,
    goals: matches.reduce((total, match) => total + match.playerScore, 0),
    preferredOpponent: [...friendStats].filter((friend) => friend.matches > 0)
      .sort((a, b) => b.matches - a.matches)[0]?.name ?? null,
    weeklyMatches: matches.filter((match) => match.playedAt >= weekStart).length,
    recentWins,
    recentTotal: recentMatches.length,
    formRate: recentMatches.length ? Math.round(recentWins / recentMatches.length * 100) : 0,
    friendStats,
  };
}

export async function readMatches(request: Request) {
  const params = new URL(request.url).searchParams;
  const edition = params.get("edition") ?? LATEST_EDITION;
  if (params.getAll("edition").length > 1 || !isEditionScope(edition)) {
    return NextResponse.json({ error: "Choose a valid edition or ALL for career history." }, { status: 400 });
  }
  const [matches, friends] = await Promise.all([
    prisma.match.findMany({
      where: edition === "ALL" ? {} : { edition },
      include: { friend: true },
      orderBy: [{ playedAt: "desc" }, { id: "asc" }],
    }),
    prisma.friend.findMany({ orderBy: { name: "asc" } }),
  ]);
  const comparisons: EditionComparison[] | undefined = edition === "ALL"
    ? VALID_RECORD_EDITIONS.map((id) => {
      const rows = matches.filter((match) => match.edition === id);
      const wins = rows.filter((match) => match.playerScore > match.opponentScore).length;
      const draws = rows.filter((match) => match.playerScore === match.opponentScore).length;
      return {
        edition: id, name: FIFA_EDITIONS[id].name, matches: rows.length,
        wins, draws, losses: rows.length - wins - draws,
        goals: rows.reduce((total, match) => total + match.playerScore, 0),
        winRate: rows.length ? Math.round(wins / rows.length * 100) : 0,
      };
    }) : undefined;
  return NextResponse.json({ edition, matches, friends, stats: summarizeMatches(matches, friends), comparisons }, {
    headers: { "Cache-Control": "no-store" },
  });
}
