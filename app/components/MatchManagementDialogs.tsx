"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { FIFA_EDITIONS, VALID_RECORD_EDITIONS } from '@/lib/fifa-editions';
import type { FriendIdentity, MatchRecord } from '@/lib/matches/contracts';
import styles from './MatchManagementDialogs.module.css';

export type ManagementState =
  | { kind: 'friend-add' }
  | { kind: 'friend-edit'; friend: FriendIdentity }
  | { kind: 'match-edit'; match: MatchRecord };

type Props = {
  state: ManagementState;
  friends: FriendIdentity[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={styles.modal} aria-labelledby="management-title" onCancel={onClose}>
    <header><h2 id="management-title">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog">×</button></header>
    {children}
  </dialog>;
}

async function write(url: string, method: string, body: object) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(typeof data?.error === 'string' ? data.error : 'Unable to save. Please try again.');
  }
}

function FriendForm({ friend, onClose, onSaved }: { friend?: FriendIdentity; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(friend?.name ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await write(friend ? `/api/friends/${friend.id}` : '/api/friends', friend ? 'PATCH' : 'POST', { name: name.trim() });
      await onSaved(); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save friend.'); }
    finally { setBusy(false); }
  }
  return <Modal title={friend ? 'Edit friend' : 'Add friend'} onClose={onClose}>
    <form onSubmit={submit}>
      <p>Friends are shared across every edition. A rename updates their name throughout your history.</p>
      <label>Friend name<input autoFocus required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>Cancel</button><button disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save friend'}</button></footer>
    </form>
  </Modal>;
}

function MatchForm({ match, friends, onClose, onSaved }: { match: MatchRecord; friends: FriendIdentity[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    friendId: match.friendId, edition: match.edition,
    playerClub: match.playerClub, opponentClub: match.opponentClub,
    playerScore: String(match.playerScore), opponentScore: String(match.opponentScore),
    possession: match.possession == null ? '' : String(match.possession),
    shots: match.shots == null ? '' : String(match.shots),
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await write(`/api/matches/${match.id}`, 'PATCH', {
        ...form, playerScore: Number(form.playerScore), opponentScore: Number(form.opponentScore),
        possession: form.possession === '' ? null : Number(form.possession),
        shots: form.shots === '' ? null : Number(form.shots),
      });
      await onSaved(); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save match.'); }
    finally { setBusy(false); }
  }
  return <Modal title="Edit match" onClose={onClose}>
    <form onSubmit={submit}>
      <p>Editing match details keeps the recorded match date. Moving editions updates both records.</p>
      <label>Edition<select value={form.edition} onChange={event => field('edition', event.target.value)}>{VALID_RECORD_EDITIONS.map(edition => <option key={edition} value={edition}>{FIFA_EDITIONS[edition].name}</option>)}</select></label>
      <label>Opponent<select required value={form.friendId} onChange={event => field('friendId', event.target.value)}>{friends.map(friend => <option key={friend.id} value={friend.id}>{friend.name}</option>)}</select></label>
      <div className={styles.grid}>
        <label>Your club<input required value={form.playerClub} onChange={event => field('playerClub', event.target.value)} /></label>
        <label>Opponent club<input required value={form.opponentClub} onChange={event => field('opponentClub', event.target.value)} /></label>
        <label>Your score<input required type="number" min="0" max="99" step="1" value={form.playerScore} onChange={event => field('playerScore', event.target.value)} /></label>
        <label>Opponent score<input required type="number" min="0" max="99" step="1" value={form.opponentScore} onChange={event => field('opponentScore', event.target.value)} /></label>
        <label>Possession (%)<input type="number" min="0" max="100" value={form.possession} onChange={event => field('possession', event.target.value)} /></label>
        <label>Shots<input type="number" min="0" value={form.shots} onChange={event => field('shots', event.target.value)} /></label>
      </div>
      {error && <p role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>Cancel</button><button disabled={busy}>{busy ? 'Saving…' : 'Save match'}</button></footer>
    </form>
  </Modal>;
}

export default function MatchManagementDialogs({ state, friends, onClose, onSaved }: Props) {
  if (state.kind === 'match-edit') return <MatchForm key={state.match.id} match={state.match} friends={friends} onClose={onClose} onSaved={onSaved} />;
  return <FriendForm key={state.kind === 'friend-edit' ? state.friend.id : 'new'} friend={state.kind === 'friend-edit' ? state.friend : undefined} onClose={onClose} onSaved={onSaved} />;
}
