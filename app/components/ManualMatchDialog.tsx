"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { FIFA_EDITIONS, isConcreteEdition, VALID_RECORD_EDITIONS, type ConcreteEdition } from "@/lib/fifa-editions";
import type { MatchEntryDialogProps, MatchEntryInput, MatchRecord } from "@/lib/matches/contracts";
import { resolveManualDate } from "@/lib/matches/manual-date";
import { validateStats } from "@/lib/match-stats";
import styles from "./ManualMatchDialog.module.css";

export default function ManualMatchDialog(props: MatchEntryDialogProps) {
  // A fresh session per opening; subsequent dashboard changes cannot move this entry.
  return props.open ? <ManualEntrySession {...props} /> : null;
}

function ManualEntrySession({ edition, friends, onClose, onSaved }: MatchEntryDialogProps) {
  const [capturedEdition, setCapturedEdition] = useState<ConcreteEdition | null>(() => isConcreteEdition(edition) ? edition : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedMatch, setSavedMatch] = useState<MatchRecord | null>(null);
  const submitting = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [today] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    element.querySelector<HTMLElement>("select, input")?.focus();
    return () => element.close();
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (capturedEdition) dialog.current?.querySelector<HTMLElement>("form select")?.focus();
  }, [capturedEdition]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !capturedEdition) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const text = (name: string) => String(values.get(name) ?? "").trim();
    const optionalNumber = (name: string) => text(name) === "" ? null : Number(text(name));
    let match = savedMatch;
    if (!match) {
      const friendName = text("friendName");
      const playerClub = text("playerClub");
      const opponentClub = text("opponentClub");
      const playedAt = text("playedAt");
      if (!friendName || friendName.length > 80 || !playerClub || !opponentClub) {
        setError("Enter a friend name (up to 80 characters) and both clubs.");
        return;
      }
      const date = resolveManualDate(playedAt);
      if (!date.ok) { setError(date.error); return; }
      const stats = validateStats({
        playerScore: text("playerScore") === "" ? NaN : Number(text("playerScore")),
        opponentScore: text("opponentScore") === "" ? NaN : Number(text("opponentScore")),
        possession: optionalNumber("possession"), shots: optionalNumber("shots"),
      });
      if (!stats.ok) { setError("Enter whole-number scores between 0 and 200."); return; }
      const payload: MatchEntryInput = {
        entryMode: "manual", edition: capturedEdition, friendName, playerClub, opponentClub,
        ...stats.stats, playedAt,
      };
      submitting.current = true;
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/matches", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) {
          setError(typeof body.error === "string" ? body.error : "Could not save the match. Please try again.");
          return;
        }
        match = body as MatchRecord;
        setSavedMatch(match);
      } catch {
        setError("Could not save the match. Check your connection and try again.");
        return;
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await onSaved(match);
      onClose();
    } catch {
      // The POST succeeded: retry the refresh callback, never create a second match.
      setError("Your match was saved, but the dashboard could not refresh. Retry refresh or close this dialog.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose(); }}>
      <div className={styles.header}>
        <h2 id={`${id}-title`}>Add match manually</h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close manual match dialog">Close</button>
      </div>
      <p id={`${id}-description`} className={styles.description}>
        {capturedEdition ? `Saving to ${FIFA_EDITIONS[capturedEdition].name}. Choose the date you played.` : "Choose an edition before entering a match. All editions is a career overview."}
      </p>
      {!capturedEdition ? (
        <label className={styles.label}>Match edition
          <select defaultValue="" onChange={(event) => { if (isConcreteEdition(event.target.value)) setCapturedEdition(event.target.value); }}>
            <option value="" disabled>Choose an edition</option>
            {VALID_RECORD_EDITIONS.map((value) => <option key={value} value={value}>{FIFA_EDITIONS[value].name}</option>)}
          </select>
        </label>
      ) : (
        <form onSubmit={submit} aria-busy={busy}>
          <fieldset disabled={busy || !!savedMatch} className={styles.fields}>
            <legend className={styles.srOnly}>Match details</legend>
            <label className={styles.label}>Existing friend
              <select defaultValue="" onChange={(event) => {
                const input = event.currentTarget.form?.elements.namedItem("friendName") as HTMLInputElement | null;
                if (input) input.value = event.target.value;
              }}>
                <option value="">Enter a new name below</option>
                {friends.map((friend) => <option key={friend.id} value={friend.name}>{friend.name}</option>)}
              </select>
            </label>
            <label className={styles.label}>Friend name
              <input name="friendName" required maxLength={80} autoComplete="off" aria-describedby={`${id}-friend-help`} />
            </label>
            <p id={`${id}-friend-help`} className={styles.help}>Select a shared friend above or type a name. A new friend is created when you save.</p>
            <label className={styles.label}>Match date
              <input name="playedAt" type="date" required defaultValue={today} />
            </label>
            <div className={styles.grid}>
              <label className={styles.label}>Your club<input name="playerClub" required /></label>
              <label className={styles.label}>Opponent club<input name="opponentClub" required /></label>
              <label className={styles.label}>Your score<input name="playerScore" type="number" required min={0} max={200} step={1} inputMode="numeric" /></label>
              <label className={styles.label}>Opponent score<input name="opponentScore" type="number" required min={0} max={200} step={1} inputMode="numeric" /></label>
              <label className={styles.label}>Possession % (optional)<input name="possession" type="number" min={0} max={100} step={1} inputMode="numeric" /></label>
              <label className={styles.label}>Shots (optional)<input name="shots" type="number" min={0} max={200} step={1} inputMode="numeric" /></label>
            </div>
          </fieldset>
          {error && <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p>}
          {savedMatch && <p role="status">Match saved.</p>}
          <div className={styles.actions}>
            <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" disabled={busy} className={styles.save}>
              {busy ? "Saving…" : savedMatch ? "Retry refresh" : "Save match"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
