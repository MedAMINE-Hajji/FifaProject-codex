import { readMatches } from "@/lib/matches/read";
import { createMatch } from "@/lib/matches/write";

export async function GET(request: Request) {
  return readMatches(request);
}

export async function POST(request: Request) {
  return createMatch(request);
}
