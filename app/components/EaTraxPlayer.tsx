"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Play, Pause, SkipForward, Volume2, VolumeX, Disc3, AlertCircle } from "lucide-react";
import { FIFA_EDITIONS, FifaEdition } from "@/lib/fifa-editions";

type Props = {
  edition: FifaEdition;
};

export default function EaTraxPlayer({ edition }: Props) {
  const currentConfig = FIFA_EDITIONS[edition] || FIFA_EDITIONS.ALL;
  const playlist = currentConfig.playlist;

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);

  const currentTrack = playlist[currentTrackIndex % playlist.length];

  // AUTOMATIC TURN-ON (AUTOPLAY) LOGIC
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 1. Try immediate autoplay
    const tryAutoplay = () => {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setShowBanner(true);
          hasInteractedRef.current = true;
        })
        .catch(() => {
          // Browser prevented autoplay without prior interaction.
          // Wait for first user click anywhere on document to immediately start music.
          const handleFirstClick = () => {
            if (hasInteractedRef.current) return;
            hasInteractedRef.current = true;
            audio
              .play()
              .then(() => {
                setIsPlaying(true);
                setShowBanner(true);
              })
              .catch(() => {});
            window.removeEventListener("pointerdown", handleFirstClick);
            window.removeEventListener("keydown", handleFirstClick);
          };

          window.addEventListener("pointerdown", handleFirstClick, { once: true });
          window.addEventListener("keydown", handleFirstClick, { once: true });
        });
    };

    tryAutoplay();
  }, []);

  // Whenever edition changes, show HUD banner
  useEffect(() => {
    setCurrentTrackIndex(0);
    setShowBanner(true);
    const timer = setTimeout(() => setShowBanner(false), 5000);
    return () => clearTimeout(timer);
  }, [edition]);

  // When track changes, animate the HUD banner
  useEffect(() => {
    setShowBanner(true);
    const timer = setTimeout(() => setShowBanner(false), 4500);
    return () => clearTimeout(timer);
  }, [currentTrackIndex]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    audioRef.current.muted = isMuted;
  }, [volume, isMuted]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    setAudioError(null);
    hasInteractedRef.current = true;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err: any) {
        console.error("Audio playback error:", err);
        setAudioError("Cliquez à nouveau pour lancer.");
        setIsPlaying(false);
      }
    }
  };

  const nextTrack = () => {
    hasInteractedRef.current = true;
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 150);
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        onEnded={nextTrack}
        onError={() => {
          setAudioError("Fichier audio introuvable ou illisible.");
          setIsPlaying(false);
        }}
        preload="auto"
      />

      {/* EA TRAX HUD SLIDE-IN BANNER */}
      <div
        className={`fixed top-6 right-6 z-50 flex items-center gap-3.5 px-4 py-3 rounded-xl border backdrop-blur-md transition-all duration-500 shadow-2xl ${
          showBanner
            ? "translate-y-0 opacity-100"
            : "-translate-y-12 opacity-0 pointer-events-none"
        }`}
        style={{
          background: "rgba(10, 15, 20, 0.92)",
          borderColor: currentConfig.heroColor,
          boxShadow: `0 10px 30px -10px ${currentConfig.heroColor}40`,
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs uppercase"
          style={{
            background: currentConfig.heroColor,
            color: "#0a0f14",
          }}
        >
          <Disc3 className={`w-5 h-5 ${isPlaying ? "animate-spin" : ""}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded"
              style={{
                background: `${currentConfig.heroColor}20`,
                color: currentConfig.heroColor,
              }}
            >
              EA SPORTS TRAX • {currentConfig.shortLabel}
            </span>
          </div>
          <p className="text-sm font-black text-white leading-tight mt-0.5 truncate max-w-[240px]">
            {currentTrack.title}
          </p>
          <p className="text-[11px] text-gray-400 truncate max-w-[240px]">
            {currentTrack.artist}
          </p>
        </div>
      </div>

      {/* FLOATING CORNER CONTROLLER */}
      <div
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-3.5 py-2.5 rounded-full border backdrop-blur-xl shadow-2xl transition-all"
        style={{
          background: "rgba(12, 18, 26, 0.94)",
          borderColor: isPlaying ? currentConfig.heroColor : "rgba(255, 255, 255, 0.15)",
        }}
      >
        <button
          onClick={() => setShowBanner((prev) => !prev)}
          className="flex items-center gap-2 group text-left cursor-pointer mr-1"
          title="EA Trax info"
        >
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-105"
            style={{
              background: currentConfig.heroColor,
              color: "#05090e",
            }}
          >
            <Music className="w-4 h-4" />
          </span>
          <div className="hidden sm:block">
            <span className="block text-[9px] font-mono uppercase text-gray-400 group-hover:text-white leading-none">
              EA TRAX
            </span>
            <span className="block text-[11px] font-bold text-white max-w-[130px] truncate leading-tight mt-0.5">
              {currentTrack.title}
            </span>
          </div>
        </button>

        <div className="h-4 w-px bg-white/10 mx-0.5" />

        {/* PLAY / PAUSE BUTTON */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 shadow-md cursor-pointer"
          style={{
            background: currentConfig.heroColor,
            color: "#05090e",
          }}
          title={isPlaying ? "Mettre en pause" : "Lancer la musique"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <button
          onClick={nextTrack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
          title="Piste suivante"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button
          onClick={toggleMute}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
          title={isMuted ? "Activer le son" : "Couper le son"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {audioError && (
        <div className="fixed bottom-20 right-6 z-40 bg-red-950/90 border border-red-500/60 text-red-200 text-xs px-3 py-2 rounded-xl backdrop-blur-md flex items-center gap-2 shadow-xl">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{audioError}</span>
        </div>
      )}
    </>
  );
}
