"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play } from "lucide-react";
import { isConcreteEdition, LATEST_EDITION, type ConcreteEdition, type FifaEdition } from "@/lib/fifa-editions";
import { AUDIO_CATALOG, AUDIO_EDITION_KEY, AUDIO_PREFERENCES_KEY, DEFAULT_AUDIO_VOLUME, mediaDuration, parseAudioPreferences } from "@/lib/audio-catalog";
import styles from "./EaTraxPlayer.module.css";

type Status = "paused" | "playing" | "loading" | "blocked" | "unavailable" | "background";
type Player = { select: (edition: FifaEdition) => void; toggle: () => void; volume: (value: number) => void };

export default function EaTraxPlayer({ edition }: { edition: FifaEdition }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [activeEdition, setActiveEdition] = useState<ConcreteEdition>(LATEST_EDITION);
  const [volume, setVolume] = useState(DEFAULT_AUDIO_VOLUME);
  const [status, setStatus] = useState<Status>("loading");
  const [duration, setDuration] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let saved: string | null = null;
    let lastEdition: ConcreteEdition = LATEST_EDITION;
    try {
      saved = localStorage.getItem(AUDIO_PREFERENCES_KEY);
      const previous = localStorage.getItem(AUDIO_EDITION_KEY);
      if (isConcreteEdition(previous)) lastEdition = previous;
    } catch { /* Storage is optional. */ }
    const preferences = parseAudioPreferences(saved);
    let manualPause = preferences.paused;
    let targetVolume = preferences.volume;
    let failed = false;
    let disposed = false;
    let resumeOnVisible = false;
    let pendingPlay = false;
    let selected: ConcreteEdition | null = null;
    let requested: ConcreteEdition | null = null;
    let transition = new AbortController();
    let cancelFade = () => {};
    let selectionTimer: ReturnType<typeof setTimeout> | undefined;
    audio.loop = true;
    audio.volume = targetVolume;

    const save = () => {
      try { localStorage.setItem(AUDIO_PREFERENCES_KEY, JSON.stringify({ volume: targetVolume, paused: manualPause })); }
      catch { /* Private browsing and quota failures are nonblocking. */ }
    };
    const fade = (out: boolean, signal: AbortSignal) => new Promise<void>(resolve => {
      cancelFade();
      const start = performance.now();
      const initial = audio.volume;
      let frame = 0;
      const finish = () => { cancelAnimationFrame(frame); signal.removeEventListener("abort", finish); resolve(); };
      cancelFade = finish;
      signal.addEventListener("abort", finish, { once: true });
      const step = (now: number) => {
        if (signal.aborted || disposed) { finish(); return; }
        const progress = Math.min((now - start) / 220, 1);
        audio.volume = out ? initial * (1 - progress) : targetVolume * progress;
        if (progress < 1) frame = requestAnimationFrame(step);
        else finish();
      };
      frame = requestAnimationFrame(step);
    });
    const play = async (signal: AbortSignal, fadeIn = true) => {
      if (disposed || signal.aborted || failed || manualPause || document.hidden) return;
      pendingPlay = true;
      setStatus("loading");
      try {
        await audio.play();
        if (signal.aborted || disposed) return;
        if (manualPause || document.hidden) { audio.pause(); return; }
        if (fadeIn) await fade(false, signal);
      } catch (error: unknown) {
        if (disposed || signal.aborted || manualPause || document.hidden) return;
        if (error instanceof DOMException && error.name === "NotAllowedError") setStatus("blocked");
        else if (error instanceof DOMException && error.name === "AbortError") setStatus("paused");
        else { failed = true; setStatus("unavailable"); }
      } finally {
        if (!signal.aborted) pendingPlay = false;
      }
    };
    const onPlaying = () => {
      if (manualPause || document.hidden || failed) audio.pause();
      else setStatus("playing");
    };
    const onPause = () => {
      if (!disposed && !failed) setStatus(document.hidden && !manualPause ? "background" : "paused");
    };
    const onWaiting = () => { if (!manualPause && !failed && !document.hidden) setStatus("loading"); };
    const onError = () => { failed = true; pendingPlay = false; cancelFade(); audio.pause(); setDuration(null); setStatus("unavailable"); };
    const onMetadata = () => setDuration(mediaDuration(audio.duration));
    const onVisibility = () => {
      if (document.hidden) {
        resumeOnVisible = !manualPause && !failed && (resumeOnVisible || !audio.paused || pendingPlay);
        cancelFade();
        pendingPlay = false;
        audio.pause();
        if (resumeOnVisible) setStatus("background");
      } else if (resumeOnVisible && !manualPause && !failed) {
        resumeOnVisible = false;
        audio.volume = 0;
        void play(transition.signal);
      }
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("error", onError);
    audio.addEventListener("loadedmetadata", onMetadata);
    audio.addEventListener("durationchange", onMetadata);
    document.addEventListener("visibilitychange", onVisibility);

    playerRef.current = {
      select(next) {
        const concrete = isConcreteEdition(next) ? next : lastEdition;
        if (concrete === requested) return;
        requested = concrete;
        lastEdition = concrete;
        transition.abort();
        transition = new AbortController();
        const signal = transition.signal;
        clearTimeout(selectionTimer);
        // Defer source work so rapid edition changes collapse into one transition.
        selectionTimer = setTimeout(async () => {
          setVolume(targetVolume);
          if (!audio.paused) await fade(true, signal);
          if (signal.aborted || disposed) return;
          audio.pause();
          const initial = selected === null;
          selected = concrete;
          lastEdition = concrete;
          try { localStorage.setItem(AUDIO_EDITION_KEY, concrete); } catch { /* Optional. */ }
          failed = false;
          pendingPlay = false;
          setActiveEdition(concrete);
          setDuration(null);
          setStatus(manualPause ? "paused" : document.hidden ? "background" : "loading");
          audio.src = AUDIO_CATALOG[concrete].src;
          audio.volume = manualPause || initial ? targetVolume : 0;
          audio.load();
          if (document.hidden) resumeOnVisible = !manualPause;
          else await play(signal, !initial);
        }, 0);
      },
      toggle() {
        if (failed || !selected) return;
        cancelFade();
        if (!audio.paused || pendingPlay) {
          manualPause = true;
          pendingPlay = false;
          resumeOnVisible = false;
          audio.pause();
          setStatus("paused");
        } else {
          manualPause = false;
          audio.volume = 0;
          void play(transition.signal);
        }
        save();
      },
      volume(value) {
        targetVolume = value;
        audio.volume = value;
        setVolume(value);
        save();
      },
    };
    return () => {
      disposed = true;
      transition.abort();
      clearTimeout(selectionTimer);
      playerRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("loadedmetadata", onMetadata);
      audio.removeEventListener("durationchange", onMetadata);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, []);

  useEffect(() => { playerRef.current?.select(edition); }, [edition]);

  const playing = status === "playing";
  const canPause = playing || status === "loading";
  const statusText: Record<Status, string> = {
    playing: "Playing", paused: "Paused", loading: "Loading music…", blocked: "Select Play music to start",
    unavailable: "Music unavailable", background: "Paused while in background",
  };
  return (
    <section className={styles.player} aria-label="Edition music">
      <audio ref={audioRef} loop preload="metadata" />
      <Music aria-hidden="true" size={20} className={styles.icon} />
      <div className={styles.info}>
        <span className={styles.brand}>EA TRAX</span>
        <span className={styles.title}>{AUDIO_CATALOG[activeEdition].title}</span>
        <span role="status" className={styles.status}>{statusText[status]}{duration ? ` · ${duration}` : ""}</span>
      </div>
      <button type="button" className={styles.play} onClick={() => playerRef.current?.toggle()}
        disabled={status === "unavailable"} aria-label={canPause ? "Pause music" : "Play music"}>
        {playing ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
        <span>{canPause ? "Pause" : "Play music"}</span>
      </button>
      <label className={styles.volume}>
        <span>Volume {Math.round(volume * 100)}%</span>
        <input aria-label="Music volume" type="range" min="0" max="100" step="1" value={Math.round(volume * 100)}
          onChange={event => playerRef.current?.volume(Number(event.target.value) / 100)} />
      </label>
    </section>
  );
}
