import type { ConcreteEdition, FifaEdition } from "@/lib/fifa-editions";

export type FriendIdentity = { id: string; name: string };
export type FriendStat = FriendIdentity & {
  matches: number;
  record: string;
  winRate: number;
};
export type DashboardStats = {
  totalMatches: number;
  winRate: number;
  goals: number;
  preferredOpponent: string | null;
  weeklyMatches: number;
  recentWins: number;
  recentTotal: number;
  formRate: number;
  friendStats: FriendStat[];
};
export type MatchRecord = {
  id: string;
  friendId: string;
  friend: FriendIdentity;
  playerClub: string;
  opponentClub: string;
  playerScore: number;
  opponentScore: number;
  possession: number | null;
  shots: number | null;
  imageUrl: string | null;
  edition: ConcreteEdition;
  playedAt: string;
  createdAt: string;
};
export type MatchDashboard = {
  edition: FifaEdition;
  matches: MatchRecord[];
  friends: FriendIdentity[];
  stats: DashboardStats;
};

// Serialized claims inside T2's authenticated, opaque uploadContext token.
// uploadDate is captured by the server at upload start, never at review/save time.
export type UploadContextClaims = { edition: ConcreteEdition; uploadDate: string };

export type EntryMode = "upload" | "manual";
export type MatchEntryInput = {
  edition: ConcreteEdition;
  entryMode?: EntryMode; // Omission is compatibility upload only.
  friendName: string;
  playerClub: string;
  opponentClub: string;
  playerScore: number;
  opponentScore: number;
  possession?: number | null;
  shots?: number | null;
  imageUrl?: string | null;
  playedAt?: string; // Manual only: YYYY-MM-DD, stored at UTC midnight.
  uploadContext?: string; // Opaque, server-issued context; owned by T2.
};
export type EntryDateResult =
  | { ok: true; playedAt: Date }
  | { ok: false; error: string };

// Integration slots. Dialogs own pending entry state; the page owns visibility/refresh.
export type MatchEntryDialogProps = {
  open: boolean;
  edition: FifaEdition; // ALL requires an explicit concrete choice before entry begins.
  friends: FriendIdentity[];
  onClose: () => void;
  onSaved: (match: MatchRecord) => void | Promise<void>;
};
export type CareerPanelProps = {
  dashboard: MatchDashboard; // T4 extends this response with comparison data.
  onSelectEdition: (edition: ConcreteEdition) => void;
};
