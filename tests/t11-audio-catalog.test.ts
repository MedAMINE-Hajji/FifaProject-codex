import { describe, expect, it } from "vitest";
import { AUDIO_CATALOG, mediaDuration, parseAudioPreferences } from "../lib/audio-catalog";

describe("T11 audio contract", () => {
  it("associates exactly one distinct agreed URL with each concrete edition", () => {
    expect(Object.entries(AUDIO_CATALOG).map(([edition, track]) => [edition, track.src])).toEqual([
      ["FIFA_22", "/audio/fifa22.mp3"], ["FIFA_23", "/audio/fifa23.mp3"],
      ["FC_24", "/audio/fifa24.mp3"], ["FC_25", "/audio/fifa25.mp3"],
      ["FC_26", "/audio/fifa26.mp3"], ["FC_27", "/audio/fifa27.mp3"],
    ]);
    expect(Object.values(AUDIO_CATALOG).every(track => track.title.endsWith(" soundtrack"))).toBe(true);
  });
  it.each([null, "broken", "[]", "42", '{"volume":2}', '{"volume":-1}', '{"volume":"0.5"}'])
    ("defaults safely for invalid preferences %s", saved => {
      expect(parseAudioPreferences(saved)).toEqual({ volume: .15, paused: false });
    });
  it("retains silence and deliberate pause", () => {
    expect(parseAudioPreferences('{"volume":0,"paused":true}')).toEqual({ volume: 0, paused: true });
    expect(parseAudioPreferences('{"volume":0.47,"paused":false}')).toEqual({ volume: .47, paused: false });
  });
  it("displays only finite actual media duration", () => {
    expect(mediaDuration(NaN)).toBeNull();
    expect(mediaDuration(Infinity)).toBeNull();
    expect(mediaDuration(-1)).toBeNull();
    expect(mediaDuration(0)).toBe("0:00");
    expect(mediaDuration(183.9)).toBe("3:03");
  });
});
