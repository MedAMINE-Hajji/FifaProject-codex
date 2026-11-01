import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) return NextResponse.json({ error: "A friend name is required." }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: "Friend names must be 80 characters or fewer." }, { status: 400 });

  const friend = await prisma.friend.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  return NextResponse.json(friend, { status: 201 });
}
