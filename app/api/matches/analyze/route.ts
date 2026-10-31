import { NextResponse } from "next/server";
import { validateStats } from "@/lib/match-stats";

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
  if (typeof content !== "string") throw new Error("La reponse IA n'est pas une chaine JSON.");

  const normalized = content
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start === -1 || end < start) throw new Error("Aucun objet JSON trouve.");

  return JSON.parse(normalized.slice(start, end + 1)) as ExtractedMatch;
}

const extractionPrompt = `Analyse cette capture d'écran. D'abord, détermine s'il s'agit bien d'un écran de résultat FIFA/EA FC: si c'est un autre jeu ou une photo sans aucun lien avec FIFA/EA FC, retourne uniquement {"isFifa": false}. Sinon, retourne uniquement un JSON valide avec ces clés: isFifa, friendName, playerClub, opponentClub, playerScore, opponentScore, possession, shots. Pour un écran FIFA/EA FC, isFifa vaut true. Si une valeur n'est pas visible, utilise null. friendName doit être "A confirmer" si le nom de l'adversaire n'est pas présent. Les scores et statistiques doivent être des nombres.`;

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File)) return NextResponse.json({ error: "Une image est obligatoire." }, { status: 400 });

  const apiKey = process.env.AI_API_KEY ?? process.env.AI_Api_Key;
  const apiUrl = process.env.AI_API_URL ?? "https://ollama.com/api";
  const model = process.env.AI_MODEL ?? "llama3.1";
  if (!apiKey) return NextResponse.json({ error: "AI_API_KEY n'est pas configuree sur le serveur." }, { status: 503 });

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

  if (!response.ok) return NextResponse.json({ error: "Le service IA n'a pas pu analyser cette capture." }, { status: 502 });
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) return NextResponse.json({ error: "La reponse IA est vide." }, { status: 502 });

  try {
    const extracted = parseExtractedMatch(content);

    if (extracted.isFifa !== true) {
      return NextResponse.json(
        { error: "Cette image n'est pas une capture de résultat FIFA/EA FC." },
        { status: 422 },
      );
    }

    const validated = validateStats(extracted);
    if (!validated.ok) {
      return NextResponse.json(
        { error: `Statistiques de match non plausibles: ${validated.reason}` },
        { status: 422 },
      );
    }

    return NextResponse.json({
      friendName: extracted.friendName,
      playerClub: extracted.playerClub,
      opponentClub: extracted.opponentClub,
      ...validated.stats,
    });
  } catch (error) {
    console.error("Réponse IA invalide:", error);
    return NextResponse.json({ error: "La reponse IA n'est pas un JSON valide." }, { status: 502 });
  }
}
