import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isConcreteEdition } from "@/lib/fifa-editions";
import { validateStats } from "@/lib/match-stats";
import { resolveManualDate } from "./manual-date";
import { resolveUploadContext } from "./upload-context";

export async function readMatchBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function validateMatchFields(body: Record<string, unknown>) {
  const playerClub = typeof body.playerClub === "string" ? body.playerClub.trim() : "";
  const opponentClub = typeof body.opponentClub === "string" ? body.opponentClub.trim() : "";
  if (!playerClub || !opponentClub) return { ok: false as const, error: "Both clubs are required." };
  const result = validateStats(body);
  if (!result.ok) return { ok: false as const, error: result.reason };
  return { ok: true as const, data: { ...result.stats, playerClub, opponentClub } };
}

export async function createMatch(request: Request) {
  const body = await readMatchBody(request);
  if (!body) return NextResponse.json({ error: "Send a valid match object." }, { status: 400 });
  if (!isConcreteEdition(body.edition)) {
    return NextResponse.json({ error: "Choose a concrete edition before saving a match." }, { status: 400 });
  }
  const entryMode = body.entryMode === undefined ? "upload" : body.entryMode;
  if (entryMode !== "upload" && entryMode !== "manual") {
    return NextResponse.json({ error: "Entry mode must be upload or manual." }, { status: 400 });
  }
  const friendName = typeof body.friendName === "string" ? body.friendName.trim() : "";
  if (!friendName || friendName.length > 80) {
    return NextResponse.json({ error: "Enter a friend name between 1 and 80 characters." }, { status: 400 });
  }
  const fields = validateMatchFields(body);
  if (!fields.ok) return NextResponse.json({ error: fields.error }, { status: 400 });
  const date = entryMode === "manual"
    ? resolveManualDate(body.playedAt)
    : await resolveUploadContext({ edition: body.edition, uploadContext: body.uploadContext }, new Date());
  if (!date.ok) return NextResponse.json({ error: date.error }, { status: 400 });
  const edition = body.edition;
  const match = await prisma.$transaction(async (tx) => {
    const friend = await tx.friend.upsert({
      where: { name: friendName }, update: {}, create: { name: friendName },
    });
    return tx.match.create({
      data: {
        ...fields.data,
        friendId: friend.id,
        edition,
        playedAt: date.playedAt,
        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      },
      include: { friend: true },
    });
  });
  return NextResponse.json(match, { status: 201 });
}
