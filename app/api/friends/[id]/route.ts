import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) return NextResponse.json({ error: "Le nom de l'ami est invalide." }, { status: 400 });
  try {
    const friend = await prisma.friend.update({ where: { id }, data: { name } });
    return NextResponse.json(friend);
  } catch {
    return NextResponse.json({ error: "Ami introuvable ou nom déjà utilisé." }, { status: 409 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  try {
    await prisma.friend.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Ami introuvable." }, { status: 404 });
  }
}
