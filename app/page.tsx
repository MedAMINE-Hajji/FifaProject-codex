"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createDashboardStore } from "@/lib/matches/dashboard-client";
import { LATEST_EDITION, isConcreteEdition, type ConcreteEdition, type FifaEdition } from "@/lib/fifa-editions";
import type { FriendIdentity, MatchRecord } from "@/lib/matches/contracts";
import DashboardShell from "./components/dashboard-shell/DashboardShell";
import ImportMatchDialog from "./components/ImportMatchDialog";
import ManualMatchDialog from "./components/ManualMatchDialog";
import CareerPanel from "./components/CareerPanel";
import EaTraxPlayer from "./components/EaTraxPlayer";
import MatchManagementDialogs, { type ManagementState } from "./components/MatchManagementDialogs";

export default function Home() {
  const [store] = useState(() => createDashboardStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [audioEdition, setAudioEdition] = useState<ConcreteEdition>(LATEST_EDITION);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [management, setManagement] = useState<ManagementState | null>(null);
  const [actionError, setActionError] = useState("");
  const deleting = useRef(false);

  useEffect(() => {
    void store.refresh();
    return () => store.cancel();
  }, [store]);

  function selectEdition(edition: FifaEdition) {
    if (isConcreteEdition(edition)) setAudioEdition(edition);
    setActionError("");
    store.select(edition);
  }
  async function refresh() {
    await store.refresh();
    const error = store.getSnapshot().error;
    if (error) throw new Error(error);
  }
  function openUpload() { setManagement(null); setManualOpen(false); setUploadOpen(true); }
  function openManual() { setManagement(null); setUploadOpen(false); setManualOpen(true); }
  function openManagement(state: ManagementState) {
    setManualOpen(false); setUploadOpen(false); setManagement(state);
  }

  async function remove(url: string, confirmation: string) {
    if (deleting.current || !window.confirm(confirmation)) return;
    deleting.current = true;
    setActionError("");
    try {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "Unable to delete. Please try again.");
      }
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to update your records.");
    } finally { deleting.current = false; }
  }
  function deleteMatch(match: MatchRecord) {
    void remove(`/api/matches/${encodeURIComponent(match.id)}`, `Delete this match against ${match.friend.name}? This cannot be undone.`);
  }
  function deleteFriend(friend: FriendIdentity) {
    void remove(`/api/friends/${encodeURIComponent(friend.id)}`, `Delete ${friend.name} and ALL their matches across EVERY edition? This cannot be undone.`);
  }

  const data = snapshot.data;
  return <DashboardShell
    edition={snapshot.edition}
    dashboard={data}
    loading={snapshot.loading}
    error={actionError || snapshot.error}
    onSelectEdition={selectEdition}
    onUpload={openUpload}
    onManual={openManual}
    onAddFriend={() => openManagement({ kind: "friend-add" })}
    onEditMatch={match => openManagement({ kind: "match-edit", match })}
    onDeleteMatch={deleteMatch}
    onEditFriend={friend => openManagement({ kind: "friend-edit", friend })}
    onDeleteFriend={deleteFriend}
    career={data?.edition === "ALL" ? <>
      <CareerPanel dashboard={data} onSelectEdition={selectEdition} />
      <div className="md-actions" aria-label="Record a match in an edition">
        <button className="md-button md-button-secondary" onClick={openUpload}>Import match</button>
        <button className="md-button md-button-secondary" onClick={openManual}>Manual entry</button>
      </div>
    </> : null}
  >
    <EaTraxPlayer edition={audioEdition} />
    <ImportMatchDialog open={uploadOpen} edition={snapshot.edition} friends={data?.friends ?? []} onClose={() => setUploadOpen(false)} onSaved={refresh} />
    <ManualMatchDialog open={manualOpen} edition={snapshot.edition} friends={data?.friends ?? []} onClose={() => setManualOpen(false)} onSaved={refresh} />
    {management && <MatchManagementDialogs state={management} friends={data?.friends ?? []} onClose={() => setManagement(null)} onSaved={refresh} />}
  </DashboardShell>;
}
