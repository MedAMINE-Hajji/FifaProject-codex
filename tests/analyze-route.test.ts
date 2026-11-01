import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/matches/analyze/route";
import { resolveUploadContext } from "../lib/matches/upload-context";

function fakeImage(): File {
  return new File(["fake image bytes"], "result.png", { type: "image/png" });
}

function makeRequest(image: File, edition?: string): Request {
  const formData = new FormData();
  formData.append("image", image);
  if (edition !== undefined) formData.append("edition", edition);
  return new Request("http://localhost/api/matches/analyze", {
    method: "POST",
    body: formData,
  });
}

type CapturedAiRequest = {
  url: string;
  model: string;
  promptText: string;
};

const aiResponses: unknown[] = [];
const capturedRequests: CapturedAiRequest[] = [];

vi.stubEnv("AI_API_KEY", "test-key");

vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body));
  capturedRequests.push({
    url: String(url),
    model: body.model,
    promptText: body.messages[0].content[0].text,
  });
  return new Response(JSON.stringify(aiResponses.shift()), { status: 200 });
}));

function lastAiRequest(): CapturedAiRequest {
  return capturedRequests[capturedRequests.length - 1];
}

describe("POST /api/matches/analyze", () => {
  it("instructs the AI to classify the screenshot as FIFA/EA FC before extracting stats", async () => {
    aiResponses.push({
      choices: [{ message: { content: JSON.stringify({ playerScore: 3, opponentScore: 1 }) } }],
    });

    await POST(makeRequest(fakeImage()));
    const prompt = lastAiRequest().promptText.toLowerCase();

    expect(prompt).toContain("fifa");
    expect(prompt).toContain("ea fc");
  });

  it("instructs the AI to identify the competing game when the screenshot is not FIFA", async () => {
    aiResponses.push({
      choices: [{ message: { content: JSON.stringify({ playerScore: 3, opponentScore: 1 }) } }],
    });

    await POST(makeRequest(fakeImage()));
    const prompt = lastAiRequest().promptText.toLowerCase();

    expect(prompt).toContain("another game");
  });

  it("rejects a screenshot identified as another game with 422", async () => {
    aiResponses.push({
      choices: [{ message: { content: JSON.stringify({ isFifa: false }) } }],
    });

    const response = await POST(makeRequest(fakeImage()));

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects when the AI could not confirm a FIFA screen with 422", async () => {
    aiResponses.push({
      choices: [{ message: { content: JSON.stringify({ isFifa: null }) } }],
    });

    const response = await POST(makeRequest(fakeImage()));

    expect(response.status).toBe(422);
  });

  it("sanitizes implausible AI-extracted stats instead of returning them", async () => {
    aiResponses.push({
      choices: [{
        message: {
          content: JSON.stringify({
            isFifa: true,
            playerScore: 3,
            opponentScore: 1,
            possession: 250,
            shots: 12,
          }),
        },
      }],
    });

    const response = await POST(makeRequest(fakeImage()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.possession).toBeNull();
    expect(body.shots).toBe(12);
  });

  it("rejects AI output whose required scores are impossible with 422", async () => {
    aiResponses.push({
      choices: [{
        message: {
          content: JSON.stringify({
            isFifa: true,
            playerScore: 999,
            opponentScore: 1,
          }),
        },
      }],
    });

    const response = await POST(makeRequest(fakeImage()));

    expect(response.status).toBe(422);
  });

  it("returns the validated stats for a genuine FIFA screenshot", async () => {
    aiResponses.push({
      choices: [{
        message: {
          content: JSON.stringify({
            isFifa: true,
            friendName: "Kevin",
            playerClub: "PSG",
            opponentClub: "Real Madrid",
            playerScore: 3,
            opponentScore: 1,
            possession: 55,
            shots: 12,
          }),
        },
      }],
    });

    const response = await POST(makeRequest(fakeImage()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      friendName: "Kevin",
      playerClub: "PSG",
      opponentClub: "Real Madrid",
      playerScore: 3,
      opponentScore: 1,
      possession: 55,
      shots: 12,
    });
  });
});

afterEach(() => { vi.useRealTimers(); aiResponses.length = 0; vi.mocked(fetch).mockClear(); });

describe("edition-aware screenshot analysis", () => {
  const extracted = { isFifa: true, friendName: "Alex", playerClub: "PSG", opponentClub: "Real Madrid", playerScore: 2, opponentScore: 1 };

  it("captures edition and server time before slow analysis crosses midnight", async () => {
    vi.useFakeTimers();
    const started = new Date("2026-10-31T23:59:59.000Z");
    vi.setSystemTime(started);
    vi.mocked(fetch).mockImplementationOnce(async () => {
      vi.setSystemTime(new Date("2026-11-01T00:05:00.000Z"));
      return Response.json({ choices: [{ message: { content: JSON.stringify({ ...extracted, edition: "FC_27", uploadDate: "1999-01-01" }) } }] });
    });
    const response = await POST(makeRequest(fakeImage(), "FIFA_22"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(await resolveUploadContext({ edition: "FIFA_22", uploadContext: body.uploadContext }, new Date())).toEqual({ ok: true, playedAt: started });
    expect(await resolveUploadContext({ edition: "FC_27", uploadContext: body.uploadContext }, new Date())).toMatchObject({ ok: false });
  });

  it.each(["ALL", "", "FIFA_99", "2022"])("rejects edition %s before contacting AI", async edition => {
    const response = await POST(makeRequest(fakeImage(), edition));
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles malformed multipart requests without exposing internals", async () => {
    const response = await POST(new Request("http://localhost/api/matches/analyze", { method: "POST", body: "bad" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Send a screenshot using an image upload." });
  });

  it.each([new File([], "empty.png", { type: "image/png" }), new File(["text"], "note.txt", { type: "text/plain" })])("rejects invalid image input", async image => {
    expect((await POST(makeRequest(image, "FC_27"))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles provider network failures with a safe English error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("private provider details"));
    const response = await POST(makeRequest(fakeImage(), "FC_27"));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Could not read the match result. Please try again with a clear screenshot." });
  });

  it("handles invalid provider JSON without exposing internal details", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not json"));
    expect((await POST(makeRequest(fakeImage(), "FC_27"))).status).toBe(502);
  });
});
