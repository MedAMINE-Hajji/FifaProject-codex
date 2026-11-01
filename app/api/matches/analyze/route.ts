import { NextResponse } from "next/server";
import { validateStats } from "@/lib/match-stats";
import { isConcreteEdition } from "@/lib/fifa-editions";
import { issueUploadContext } from "@/lib/matches/upload-context";

type ExtractedMatch = {
  isFifa?: boolean | null;
  friendName: string;
  playerClub: string;
  opponentClub: string;
  playerScore: number;
  opponentScore: number;
  possession?: number | null;
  shots?: number | null;
};

function parseExtractedMatch(content: unknown): ExtractedMatch {
  if (typeof content === "object" && content !== null) return content as ExtractedMatch;
  if (typeof content !== "string") throw new Error("Invalid analysis format.");

  const normalized = content
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start === -1 || end < start) throw new Error("No JSON object found.");

  return JSON.parse(normalized.slice(start, end + 1)) as ExtractedMatch;
}

const extractionPrompt = `Analyze this screenshot. First confirm it is a FIFA/EA FC match result. For another game or an unrelated photo, return only {"isFifa": false}. Otherwise return valid JSON with these keys: isFifa, friendName, playerClub, opponentClub, playerScore, opponentScore, possession, shots. For FIFA/EA FC set isFifa to true. Use null for values that are not visible, including an unknown friendName. Scores and statistics must be numbers. Do not infer a game edition or match date.`;

export async function POST(request: Request) {
  const uploadDate = new Date();
  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: "Send a screenshot using an image upload." }, { status: 400 }); }
  const image = formData.get("image");
  if (!(image instanceof File) || !image.size || !image.type.startsWith("image/")) {
    return NextResponse.json({ error: "Choose a nonempty image file." }, { status: 400 });
  }
  const edition = formData.get("edition");
  if (edition !== null && !isConcreteEdition(edition)) {
    return NextResponse.json({ error: "Choose a concrete edition before uploading." }, { status: 400 });
  }

  const apiKey = process.env.AI_API_KEY ?? process.env.AI_Api_Key;
  const apiUrl = process.env.AI_API_URL ?? "https://ollama.com/api";
  const model = process.env.AI_MODEL ?? "llama3.1";
  if (!apiKey) return NextResponse.json({ error: "Screenshot analysis is unavailable. Please try again later." }, { status: 503 });

  try {
    // Capture and sign before image conversion or the slow external request.
    const uploadContext = isConcreteEdition(edition) ? issueUploadContext(edition, uploadDate) : undefined;
    const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: [{ type: "text", text: extractionPrompt }, { type: "image_url", image_url: { url: `data:${image.type};base64,${base64}` } }] }],
      }),
    });

    if (!response.ok) return NextResponse.json({ error: "Could not analyze this screenshot. Please try again." }, { status: 502 });
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) return NextResponse.json({ error: "No result was found. Please try another screenshot." }, { status: 502 });

    const extracted = parseExtractedMatch(content);

    if (extracted.isFifa !== true) {
      return NextResponse.json(
        { error: "Choose a FIFA/EA FC match result screenshot." },
        { status: 422 },
      );
    }

    const validated = validateStats(extracted);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "The extracted scores are not plausible. Please try a clearer screenshot." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      friendName: extracted.friendName,
      playerClub: extracted.playerClub,
      opponentClub: extracted.opponentClub,
      ...validated.stats,
      ...(uploadContext ? { uploadContext } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Could not read the match result. Please try again with a clear screenshot." }, { status: 502 });
  }
}
