import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

function matchData(body: Record<string, unknown>) {
  const playerScore = Number(body.playerScore);
  const opponentScore = Number(body.opponentScore);
  if (!Number.isInteger(playerScore) || playerScore < 0 || !Number.isInteger(opponentScore) || opponentScore < 0) {
    return null;
  }
  return { playerScore, opponentScore, playerClub: String(body.playerClub ?? "").trim(), opponentClub: String(body.opponentClub ?? "").trim() };
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();
  const data = matchData(body);
  const friendId = typeof body.friendId === "string" ? body.friendId : "";
  if (!data || !data.playerClub || !data.opponentClub || !friendId) {
    return NextResponse.json({ error: "Les données du match sont invalides." }, { status: 400 });
  }
  try {
    const match = await prisma.match.update({
      where: { id },
      data: {
        ...data,
        friendId,
        possession: body.possession == null ? null : Number(body.possession),
        shots: body.shots == null ? null : Number(body.shots),
      },
      include: { friend: true },
    });
    return NextResponse.json(match);
  } catch {
    return NextResponse.json({ error: "Match introuvable." }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  try {
    await prisma.match.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Match introuvable." }, { status: 404 });
  }
}
