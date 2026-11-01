import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isConcreteEdition } from "@/lib/fifa-editions";
import { readMatchBody, validateMatchFields } from "@/lib/matches/write";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await readMatchBody(request);
  if (!body) return NextResponse.json({ error: "Send a valid match object." }, { status: 400 });
  const fields = validateMatchFields(body);
  const friendId = typeof body.friendId === "string" ? body.friendId.trim() : "";
  if (!fields.ok || !friendId) {
    return NextResponse.json({ error: fields.ok ? "Choose an existing friend." : fields.error }, { status: 400 });
  }
  if (body.edition !== undefined && !isConcreteEdition(body.edition)) {
    return NextResponse.json({ error: "Choose a concrete edition." }, { status: 400 });
  }
  try {
    const match = await prisma.match.update({
      where: { id },
      data: {
        ...fields.data,
        ...(isConcreteEdition(body.edition) ? { edition: body.edition } : {}),
        friendId,
        // Editing scores/clubs/friend never rewrites playedAt or createdAt.
      },
      include: { friend: true },
    });
    return NextResponse.json(match);
  } catch {
    return NextResponse.json({ error: "Match or friend not found." }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  try {
    await prisma.match.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }
}
