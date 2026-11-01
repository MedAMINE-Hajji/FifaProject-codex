import type { ConcreteEdition } from "@/lib/fifa-editions";
import type { EntryDateResult } from "./contracts";

// T2 owns this adapter and will issue/verify an opaque context in the analyzer.
// Its signed claims must bind BOTH edition and server-recorded uploadDate.
// Client playedAt/uploadDate values are never timestamp authority for uploads.
export async function resolveUploadContext(
  input: { edition: ConcreteEdition; uploadContext?: unknown },
  now: Date,
): Promise<EntryDateResult> {
  if (input.uploadContext !== undefined) {
    return { ok: false, error: "Upload context is invalid or unsupported. Please upload again." };
  }
  // Existing callers without context remain compatibility uploads until T2 wires capture.
  return { ok: true, playedAt: now };
}
