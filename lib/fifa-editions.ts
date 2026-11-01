export type FifaEdition =
  | "ALL"
  | "FIFA_22"
  | "FIFA_23"
  | "FC_24"
  | "FC_25"
  | "FC_26"
  | "FC_27";

export type Track = {
  title: string;
  artist: string;
  audioUrl: string;
  duration: string;
};

export type EditionConfig = {
  id: FifaEdition;
  name: string;
  year: string;
  tagline: string;
  shortLabel: string;
  badge: string;
  heroColor: string;
  accentColor: string;
  themeClass: string;
  logoText: {
    prefix: string;
    suffix: string;
  };
  playlist: Track[];
};

export const FIFA_EDITIONS: Record<FifaEdition, EditionConfig> = {
  ALL: {
    id: "ALL",
    name: "Toutes les éditions",
    year: "2021-2027",
    tagline: "Carrière globale et statistiques all-time",
    shortLabel: "ALL",
    badge: "GLOBAL",
    heroColor: "#6366f1",
    accentColor: "#38bdf8",
    themeClass: "theme-all",
    logoText: { prefix: "EA", suffix: "ALL-TIME" },
    playlist: [
      {
        title: "Feet Don't Fail Me Now",
        artist: "Joy Crookes",
        duration: "3:18",
        audioUrl: "/audio/fifa22.mp3",
      },
    ],
  },
  FIFA_22: {
    id: "FIFA_22",
    name: "FIFA 22",
    year: "2021-2022",
    tagline: "HyperMotion Technology & Neon Energy",
    shortLabel: "F22",
    badge: "HYPERMOTION",
    heroColor: "#00f0ff",
    accentColor: "#bd00ff",
    themeClass: "theme-f22",
    logoText: { prefix: "FIFA", suffix: "22" },
    playlist: [
      {
        title: "Feet Don't Fail Me Now",
        artist: "Joy Crookes",
        duration: "3:18",
        audioUrl: "/audio/fifa22.mp3",
      },
    ],
  },
  FIFA_23: {
    id: "FIFA_23",
    name: "FIFA 23",
    year: "2022-2023",
    tagline: "The World's Game & HyperMotion2",
    shortLabel: "F23",
    badge: "WORLD'S GAME",
    heroColor: "#00d2be",
    accentColor: "#ffd700",
    themeClass: "theme-f23",
    logoText: { prefix: "FIFA", suffix: "23" },
    playlist: [
      {
        title: "Feet Don't Fail Me Now",
        artist: "Joy Crookes",
        duration: "3:18",
        audioUrl: "/audio/fifa22.mp3",
      },
    ],
  },
  FC_24: {
    id: "FC_24",
    name: "EA SPORTS FC 24",
    year: "2023-2024",
    tagline: "Welcome to the Club - PlayStyles & HypermotionV",
    shortLabel: "FC24",
    badge: "FC FOUNDER",
    heroColor: "#e2f824",
    accentColor: "#22c55e",
    themeClass: "theme-fc24",
    logoText: { prefix: "FC", suffix: "24" },
    playlist: [
      {
        title: "Feet Don't Fail Me Now",
        artist: "Joy Crookes",
        duration: "3:18",
        audioUrl: "/audio/fifa22.mp3",
      },
    ],
  },
  FC_25: {
    id: "FC_25",
    name: "EA SPORTS FC 25",
    year: "2024-2025",
    tagline: "FC IQ & Tactical Mastery",
    shortLabel: "FC25",
    badge: "TACTICS IQ",
    heroColor: "#10b981",
    accentColor: "#06b6d4",
    themeClass: "theme-fc25",
    logoText: { prefix: "FC", suffix: "25" },
    playlist: [
      {
        title: "Feet Don't Fail Me Now",
        artist: "Joy Crookes",
        duration: "3:18",
        audioUrl: "/audio/fifa22.mp3",
      },
    ],
  },
  FC_26: {
    id: "FC_26",
    name: "EA SPORTS FC 26",
    year: "2025-2026",
    tagline: "Next-Gen Fluidity & Next Horizon",
    shortLabel: "FC26",
    badge: "HORIZON",
    heroColor: "#f97316",
    accentColor: "#fbbf24",
    themeClass: "theme-fc26",
    logoText: { prefix: "FC", suffix: "26" },
    playlist: [
      {
        title: "Feet Don't Fail Me Now",
        artist: "Joy Crookes",
        duration: "3:18",
        audioUrl: "/audio/fifa22.mp3",
      },
    ],
  },
  FC_27: {
    id: "FC_27",
    name: "EA SPORTS FC 27",
    year: "2026-2027",
    tagline: "Ultimate Football Evolution",
    shortLabel: "FC27",
    badge: "FUTURE EVO",
    heroColor: "#a855f7",
    accentColor: "#ec4899",
    themeClass: "theme-fc27",
    logoText: { prefix: "FC", suffix: "27" },
    playlist: [
      {
        title: "Feet Don't Fail Me Now",
        artist: "Joy Crookes",
        duration: "3:18",
        audioUrl: "/audio/fifa22.mp3",
      },
    ],
  },
};

export const EDITION_LIST: FifaEdition[] = [
  "ALL",
  "FIFA_22",
  "FIFA_23",
  "FC_24",
  "FC_25",
  "FC_26",
  "FC_27",
];

export const VALID_RECORD_EDITIONS: FifaEdition[] = [
  "FIFA_22",
  "FIFA_23",
  "FC_24",
  "FC_25",
  "FC_26",
  "FC_27",
];
