import type { ConcreteEdition } from "./fifa-editions";

// Filenames identify editions, not recordings. Add artist/title only when the
// owner confirms the supplied recording; duration always comes from the media.
export const AUDIO_CATALOG = {
  FIFA_22: { src: "/audio/fifa22.mp3", title: "FIFA 22 soundtrack" },
  FIFA_23: { src: "/audio/fifa23.mp3", title: "FIFA 23 soundtrack" },
  FC_24: { src: "/audio/fifa24.mp3", title: "FC 24 soundtrack" },
  FC_25: { src: "/audio/fifa25.mp3", title: "FC 25 soundtrack" },
  FC_26: { src: "/audio/fifa26.mp3", title: "FC 26 soundtrack" },
  FC_27: { src: "/audio/fifa27.mp3", title: "FC 27 soundtrack" },
} as const satisfies Record<ConcreteEdition, { src: string; title: string }>;

export const AUDIO_PREFERENCES_KEY = "matchday.audio.v1";
export const AUDIO_EDITION_KEY = "matchday.audio.edition.v1";
export const DEFAULT_AUDIO_VOLUME = 0.15;

export function parseAudioPreferences(saved: string | null): { volume: number; paused: boolean } {
  try {
    const value: unknown = JSON.parse(saved ?? "null");
    if (typeof value === "object" && value !== null) {
      const { volume, paused } = value as Record<string, unknown>;
      return {
        volume: typeof volume === "number" && Number.isFinite(volume) && volume >= 0 && volume <= 1
          ? volume : DEFAULT_AUDIO_VOLUME,
        paused: paused === true,
      };
    }
  } catch { /* Unavailable or corrupt storage must not block the dashboard. */ }
  return { volume: DEFAULT_AUDIO_VOLUME, paused: false };
}

export function mediaDuration(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
