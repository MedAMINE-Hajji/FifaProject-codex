import type { ReactNode } from 'react';
import type { FifaEdition } from './fifa-editions';
import type { FriendIdentity, MatchDashboard, MatchRecord } from './matches/contracts';

export type DashboardShellProps = {
  edition: FifaEdition;
  dashboard: MatchDashboard | null;
  loading: boolean;
  error: string;
  onSelectEdition: (edition: FifaEdition) => void;
  onUpload: () => void;
  onManual: () => void;
  onAddFriend: () => void;
  onEditMatch: (match: MatchRecord) => void;
  onDeleteMatch: (match: MatchRecord) => void;
  onEditFriend: (friend: FriendIdentity) => void;
  onDeleteFriend: (friend: FriendIdentity) => void;
  career?: ReactNode;
  children?: ReactNode;
};
