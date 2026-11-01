"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { FIFA_EDITIONS, VALID_RECORD_EDITIONS, isConcreteEdition, type ConcreteEdition } from "@/lib/fifa-editions";
import type { MatchEntryDialogProps, MatchRecord } from "@/lib/matches/contracts";
import styles from "./ImportMatchDialog.module.css";

type Review = {
  friendName: string; playerClub: string; opponentClub: string;
  playerScore: string; opponentScore: string; possession: string; shots: string;
};
const text = (value: unknown) => typeof value === "string" ? value : "";
const numberText = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? String(value) : "";

export default function ImportMatchDialog(props: MatchEntryDialogProps) {
  return props.open ? <ImportSession {...props} /> : null;
}

function ImportSession({ edition, friends, onClose, onSaved }: MatchEntryDialogProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const [choice, setChoice] = useState<ConcreteEdition | "">("");
  const [pending, setPending] = useState<{ edition: ConcreteEdition; uploadContext: string } | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [phase, setPhase] = useState<"choose" | "analyzing" | "review" | "saving" | "saved">("choose");
  const [error, setError] = useState("");
  const target = isConcreteEdition(edition) ? edition : choice;

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      request.current?.abort();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  async function upload(file: File | undefined) {
    if (!file || locked.current) return;
    if (!target) { setError("Choose an edition before uploading."); return; }
    if (!file.type.startsWith("image/") || !file.size) { setError("Choose a nonempty image file."); return; }
    const capturedEdition = target;
    locked.current = true;
    setPhase("analyzing"); setError(""); setReview(null);
    setPending({ edition: capturedEdition, uploadContext: "" });
    const controller = new AbortController(); request.current = controller;
    const form = new FormData(); form.append("image", file); form.append("edition", capturedEdition);
    try {
      const response = await fetch("/api/matches/analyze", { method: "POST", body: form, signal: controller.signal });
      const data = await response.json();
      if (!response.ok || typeof data.uploadContext !== "string") throw new Error("analysis");
      if (controller.signal.aborted) return;
      setPending({ edition: capturedEdition, uploadContext: data.uploadContext });
      setReview({ friendName: text(data.friendName), playerClub: text(data.playerClub), opponentClub: text(data.opponentClub),
        playerScore: numberText(data.playerScore), opponentScore: numberText(data.opponentScore),
        possession: numberText(data.possession), shots: numberText(data.shots) });
      setPhase("review");
    } catch {
      if (!controller.signal.aborted) {
        setError("Could not analyze this image. Choose a clear FIFA/EA FC result screenshot and try again.");
        setPending(null); setPhase("choose");
      }
    } finally { locked.current = false; }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending || !review || locked.current || phase === "saved") return;
    locked.current = true; setPhase("saving"); setError("");
    const controller = new AbortController(); request.current = controller;
    let match: MatchRecord;
    try {
      const response = await fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" },
        signal: controller.signal, body: JSON.stringify({ ...review, ...pending, entryMode: "upload",
          playerScore: Number(review.playerScore), opponentScore: Number(review.opponentScore),
          possession: review.possession === "" ? null : Number(review.possession), shots: review.shots === "" ? null : Number(review.shots) }) });
      if (!response.ok) throw new Error("save");
      match = await response.json();
    } catch {
      if (!controller.signal.aborted) { setError("Could not save this match. Your review is preserved. Try again, or upload again if the review has expired."); setPhase("review"); }
      locked.current = false; return;
    }
    if (controller.signal.aborted) return;
    setPhase("saved");
    try { await onSaved(match); onClose(); }
    catch { setError("Your match was saved. Close this dialog and refresh the workspace to see it."); }
    finally { locked.current = false; }
  }

  const busy = phase === "analyzing" || phase === "saving";
  function field(key: keyof Review, label: string, numeric = false, optional = false, max = 200) {
    return <label key={key}>{label}<input name={key} type={numeric ? "number" : "text"} required={!optional}
      min={numeric ? 0 : undefined} max={numeric ? max : undefined} step={numeric ? 1 : undefined}
      maxLength={key === "friendName" ? 80 : undefined} list={key === "friendName" ? `${id}-friends` : undefined}
      value={review?.[key] ?? ""} onChange={event => setReview(current => current ? { ...current, [key]: event.target.value } : current)} /></label>;
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`}
    onCancel={event => { event.preventDefault(); if (phase !== "saving") onClose(); }}>
    <div className={styles.heading}><h2 id={`${id}-title`}>Import match</h2><button type="button" onClick={onClose} disabled={phase === "saving"} aria-label="Close import dialog">Close</button></div>
    <p id={`${id}-help`}>Upload a result, then review every detail before saving. The upload date is recorded automatically.</p>
    {pending ? <p className={styles.edition}>Saving to {FIFA_EDITIONS[pending.edition].name}</p> :
      edition === "ALL" ? <label>Match edition<select value={choice} disabled={busy} onChange={event => setChoice(event.target.value as ConcreteEdition | "")}>
        <option value="">Choose an edition</option>{VALID_RECORD_EDITIONS.map(value => <option key={value} value={value}>{FIFA_EDITIONS[value].name}</option>)}
      </select></label> : <p className={styles.edition}>Upload to {FIFA_EDITIONS[edition].name}</p>}
    <p role="status" aria-live="polite">{phase === "analyzing" ? "Analyzing screenshot…" : phase === "saving" ? "Saving match…" : phase === "saved" ? "Match saved." : ""}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!review && <fieldset disabled={busy || !target} className={styles.uploads}><legend>Choose a result image</legend>
      <label>Photo library or file<input type="file" accept="image/*" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
      <label>Take a photo<input type="file" accept="image/*" capture="environment" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
    </fieldset>}
    {review && <form onSubmit={save}><fieldset disabled={phase === "saving" || phase === "saved"} className={styles.review}><legend>Review match details</legend>
      {field("friendName", "Friend")}{field("playerClub", "Your club")}{field("opponentClub", "Opponent club")}
      {field("playerScore", "Your score", true)}{field("opponentScore", "Opponent score", true)}
      {field("possession", "Possession % (optional)", true, true, 100)}{field("shots", "Shots (optional)", true, true)}
      <datalist id={`${id}-friends`}>{friends.map(friend => <option key={friend.id} value={friend.name} />)}</datalist>
    </fieldset><div className={styles.actions}>
      <button type="button" disabled={busy || phase === "saved"} onClick={() => { setReview(null); setPending(null); setError(""); setPhase("choose"); }}>Choose another image</button>
      <button type="submit" disabled={busy || phase === "saved"}>Save match</button>
    </div></form>}
  </dialog>;
}
