import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { issueUploadContext, resolveUploadContext } from "../lib/matches/upload-context";

const started = new Date("2026-10-31T23:59:58.000Z");
const saved = new Date("2026-11-01T00:04:00.000Z");
afterEach(() => vi.unstubAllEnvs());

describe("server-authenticated upload dates", () => {
  it("retains FIFA 22 and the upload instant across midnight and key-stable requests", async () => {
    vi.stubEnv("UPLOAD_CONTEXT_SECRET", "stable-test-secret");
    const token = issueUploadContext("FIFA_22", started);
    expect(await resolveUploadContext({ edition: "FIFA_22", uploadContext: token }, saved))
      .toEqual({ ok: true, playedAt: started });
    expect(await resolveUploadContext({ edition: "FC_27", uploadContext: token }, saved))
      .toMatchObject({ ok: false });
  });

  it("rejects changed payloads, signatures, malformed values and future dates", async () => {
    vi.stubEnv("UPLOAD_CONTEXT_SECRET", "stable-test-secret");
    const token = issueUploadContext("FIFA_22", started);
    const [payload, signature] = token.split(".");
    for (const value of [null, 12, "", "a.b.c", `${payload}.bad`, `${payload}x.${signature}`,
      `${payload}.${signature}=`, "x".repeat(1025), issueUploadContext("FIFA_22", new Date("2027-01-01"))]) {
      expect(await resolveUploadContext({ edition: "FIFA_22", uploadContext: value }, saved)).toMatchObject({ ok: false });
    }
  });

  it("validates signed claims as well as their signature", async () => {
    vi.stubEnv("UPLOAD_CONTEXT_SECRET", "stable-test-secret");
    for (const claims of [null, {}, { edition: "ALL", uploadDate: started.toISOString() },
      { edition: "FIFA_22", uploadDate: "yesterday" }, { edition: "FIFA_22", uploadDate: 1 }]) {
      const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
      const signature = createHmac("sha256", "stable-test-secret").update(payload).digest("base64url");
      expect(await resolveUploadContext({ edition: "FIFA_22", uploadContext: `${payload}.${signature}` }, saved)).toMatchObject({ ok: false });
    }
  });

  it("uses receipt time only for omitted context", async () => {
    expect(await resolveUploadContext({ edition: "FC_27" }, saved)).toEqual({ ok: true, playedAt: saved });
  });

  it("uses a stable AI key fallback and rejects tokens after signing-key rotation", async () => {
    vi.stubEnv("UPLOAD_CONTEXT_SECRET", "");
    vi.stubEnv("AI_API_KEY", "fallback-test-key");
    const token = issueUploadContext("FC_24", started);
    expect(await resolveUploadContext({ edition: "FC_24", uploadContext: token }, saved)).toEqual({ ok: true, playedAt: started });
    vi.stubEnv("AI_API_KEY", "rotated-key");
    expect(await resolveUploadContext({ edition: "FC_24", uploadContext: token }, saved)).toMatchObject({ ok: false });
  });
});
