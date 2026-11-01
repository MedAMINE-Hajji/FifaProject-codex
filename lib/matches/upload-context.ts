import { createHmac, timingSafeEqual } from "node:crypto";
import { isConcreteEdition, type ConcreteEdition } from "@/lib/fifa-editions";
import type { EntryDateResult, UploadContextClaims } from "./contracts";

// Server-only: do not import into client components. Configure a stable
// UPLOAD_CONTEXT_SECRET across instances/restarts; AI_API_KEY is the fallback.
// Key rotation invalidates pending reviews, which must be uploaded again.
function secret(): string {
  const key = process.env.UPLOAD_CONTEXT_SECRET || process.env.AI_API_KEY || process.env.AI_Api_Key;
  if (!key) throw new Error("Upload signing is unavailable.");
  return key;
}

export function issueUploadContext(edition: ConcreteEdition, now: Date): string {
  if (!isConcreteEdition(edition) || !Number.isFinite(now.getTime())) throw new Error("Invalid upload claims.");
  const claims: UploadContextClaims = { edition, uploadDate: now.toISOString() };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export async function resolveUploadContext(
  input: { edition: ConcreteEdition; uploadContext?: unknown },
  now: Date,
): Promise<EntryDateResult> {
  // Compatibility callers use server receipt time, never a client date.
  if (input.uploadContext === undefined) return { ok: true, playedAt: now };
  const invalid: EntryDateResult = { ok: false, error: "Upload context is invalid. Please upload the screenshot again." };
  try {
    if (typeof input.uploadContext !== "string" || input.uploadContext.length > 1024) return invalid;
    const parts = input.uploadContext.split(".");
    if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return invalid;
    const [payload, signature] = parts;
    const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return invalid;
    const claims: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!claims || typeof claims !== "object" || !("edition" in claims) || !("uploadDate" in claims)) return invalid;
    if (!isConcreteEdition(claims.edition) || claims.edition !== input.edition || typeof claims.uploadDate !== "string") return invalid;
    const playedAt = new Date(claims.uploadDate);
    if (!Number.isFinite(playedAt.getTime()) || playedAt.toISOString() !== claims.uploadDate || playedAt > now) return invalid;
    return { ok: true, playedAt };
  } catch {
    return invalid;
  }
}
