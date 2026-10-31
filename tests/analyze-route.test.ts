import { describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/matches/analyze/route";

function fakeImage(): File {
  return new File(["fake image bytes"], "result.png", { type: "image/png" });
}

function makeRequest(image: File): Request {
  const formData = new FormData();
  formData.append("image", image);
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

    expect(prompt).toContain("autre jeu");
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
