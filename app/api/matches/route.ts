import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const matches = await prisma.match.findMany({ include: { friend: true }, orderBy: { playedAt: "desc" } });
  const friends = await prisma.friend.findMany({ orderBy: { name: "asc" } });
  const wins = matches.filter((match) => match.playerScore > match.opponentScore).length;
  const recentMatches = matches.slice(0, 4);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weeklyMatches = matches.filter((match) => match.playedAt >= weekStart).length;
  const friendStats = friends.map((friend) => {
    const friendMatches = matches.filter((match) => match.friendId === friend.id);
    const friendWins = friendMatches.filter((match) => match.playerScore > match.opponentScore).length;
    const draws = friendMatches.filter((match) => match.playerScore === match.opponentScore).length;
    return {
      id: friend.id,
      name: friend.name,
      matches: friendMatches.length,
      record: `${friendWins}V - ${draws}N - ${friendMatches.length - friendWins - draws}D`,
      winRate: friendMatches.length ? Math.round(friendWins / friendMatches.length * 100) : 0,
    };
  });
  const preferredOpponent = [...friendStats].sort((a, b) => b.matches - a.matches)[0]?.name ?? null;
  return NextResponse.json({
    matches,
    friends,
    stats: {
      totalMatches: matches.length,
      winRate: matches.length ? Math.round(wins / matches.length * 100) : 0,
      goals: matches.reduce((total, match) => total + match.playerScore, 0),
      preferredOpponent,
      weeklyMatches,
      recentWins: recentMatches.filter((match) => match.playerScore > match.opponentScore).length,
      recentTotal: recentMatches.length,
      formRate: recentMatches.length ? Math.round(recentMatches.filter((match) => match.playerScore > match.opponentScore).length / recentMatches.length * 100) : 0,
      friendStats,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const required = ["friendName", "playerClub", "opponentClub", "playerScore", "opponentScore"];
  if (required.some((field) => body[field] === undefined || body[field] === "")) {
    return NextResponse.json({ error: "Les champs du match sont obligatoires." }, { status: 400 });
  }

  const friend = await prisma.friend.upsert({ where: { name: body.friendName.trim() }, update: {}, create: { name: body.friendName.trim() } });
  const match = await prisma.match.create({
    data: {
      friendId: friend.id,
      playerClub: String(body.playerClub),
      opponentClub: String(body.opponentClub),
      playerScore: Number(body.playerScore),
      opponentScore: Number(body.opponentScore),
      possession: body.possession == null ? null : Number(body.possession),
      shots: body.shots == null ? null : Number(body.shots),
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
    },
    include: { friend: true },
  });
  return NextResponse.json(match, { status: 201 });
}
