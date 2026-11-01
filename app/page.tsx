"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Camera,
  CirclePlus,
  FileImage,
  Filter,
  Flame,
  Gamepad2,
  Goal,
  LayoutDashboard,
  Pencil,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
} from "lucide-react";
import { FIFA_EDITIONS, FifaEdition, LATEST_EDITION, VALID_RECORD_EDITIONS, isConcreteEdition } from "@/lib/fifa-editions";
import EditionSelector from "./components/EditionSelector";
import EaTraxPlayer from "./components/EaTraxPlayer";
import { createDashboardStore, EMPTY_STATS } from "@/lib/matches/dashboard-client";
import type { FriendStat } from "@/lib/matches/contracts";

type Match = {
  id: string;
  opponent: string;
  initials: string;
  score: string;
  result: "W" | "D" | "L";
  date: string;
  club: string;
  opponentClub: string;
  possession: string;
  shots: string;
  friendId: string;
  playerScore: number;
  opponentScore: number;
  edition: string;
};

export default function Home() {
  const [dashboard] = useState(() => createDashboardStore());
  const dashboardState = useSyncExternalStore(dashboard.subscribe, dashboard.getSnapshot, dashboard.getSnapshot);
  const selectedEdition = dashboardState.edition;
  const setSelectedEdition = dashboard.select;
  const [isEditionOpen, setIsEditionOpen] = useState(false);
  const matches = useMemo(() => dashboardState.data?.matches.map(toMatch) ?? [], [dashboardState.data]);
  const friends = ["Tous les amis", ...(dashboardState.data?.friends.map((friend) => friend.name) ?? [])];
  const stats = dashboardState.data?.stats ?? EMPTY_STATS;

  const [selectedFriend, setSelectedFriend] = useState("Tous les amis");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFriendOpen, setIsFriendOpen] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState("");
  const [importEdition, setImportEdition] = useState<FifaEdition>(LATEST_EDITION);

  const [fileName, setFileName] = useState("");
  const [analysisState, setAnalysisState] = useState<"idle" | "analyzing" | "done">("idle");
  const [analysis, setAnalysis] = useState<Record<string, string | number | null> | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingFriend, setIsCreatingFriend] = useState(false);

  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editMatchForm, setEditMatchForm] = useState({
    friendId: "",
    playerClub: "",
    opponentClub: "",
    playerScore: 0,
    opponentScore: 0,
    possession: "",
    shots: "",
    edition: LATEST_EDITION as string,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingFriend, setEditingFriend] = useState<FriendStat | null>(null);

  const currentTheme = FIFA_EDITIONS[selectedEdition] || FIFA_EDITIONS.ALL;

  const filteredMatches = useMemo(() => {
    return selectedFriend === "Tous les amis"
      ? matches
      : matches.filter((match) => match.opponent === selectedFriend);
  }, [matches, selectedFriend]);

  useEffect(() => {
    void dashboard.refresh();
    return () => dashboard.cancel();
  }, [dashboard]);

  const refreshDashboard = dashboard.refresh;

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setAnalysisState("analyzing");
    setErrorMessage("");
    const formData = new FormData();
    formData.append("image", file);
    fetch("/api/matches/analyze", { method: "POST", body: formData })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Analyse impossible.");
        setAnalysis(data);
        setAnalysisState("done");
      })
      .catch((error: Error) => {
        setAnalysisState("idle");
        setErrorMessage(error.message);
      });
  }

  async function saveMatch() {
    if (!analysis || !selectedOpponent || !isConcreteEdition(importEdition)) {
      setErrorMessage("Sélectionne un adversaire avant d'enregistrer le match.");
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    const response = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...analysis,
        friendName: selectedOpponent,
        edition: importEdition,
        entryMode: "upload",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(data.error ?? "Impossible d'enregistrer le match.");
      setIsSaving(false);
      return;
    }

    await refreshDashboard();
    setIsSaving(false);
    setIsImportOpen(false);
    setAnalysisState("idle");
    setAnalysis(null);
    setFileName("");
    setSelectedOpponent("");
  }

  async function createFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = friendName.trim();
    if (!name) return;
    setIsCreatingFriend(true);
    setErrorMessage("");
    const response = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(data.error ?? "Impossible de créer cet ami.");
      setIsCreatingFriend(false);
      return;
    }
    setSelectedOpponent(data.name);
    setFriendName("");
    setIsCreatingFriend(false);
    setIsFriendOpen(false);
    await refreshDashboard();
  }

  function openEditMatch(match: Match) {
    setEditingMatch(match);
    setEditMatchForm({
      friendId: match.friendId,
      playerClub: match.club,
      opponentClub: match.opponentClub,
      playerScore: match.playerScore,
      opponentScore: match.opponentScore,
      possession: match.possession === "-" ? "" : match.possession.replace("%", ""),
      shots: match.shots === "-" ? "" : match.shots,
      edition: match.edition,
    });
  }

  async function deleteMatch(id: string) {
    if (!window.confirm("Supprimer ce match ?")) return;
    const response = await fetch(`/api/matches/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setErrorMessage("Impossible de supprimer le match.");
      return;
    }
    await refreshDashboard();
  }

  async function deleteFriend(id: string) {
    if (!window.confirm("Delete this shared friend and all their matches across every edition? This cannot be undone.")) return;
    const response = await fetch(`/api/friends/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setErrorMessage("Impossible de supprimer cet ami.");
      return;
    }
    if (selectedFriend === stats.friendStats.find((friend) => friend.id === id)?.name) {
      setSelectedFriend("Tous les amis");
    }
    await refreshDashboard();
  }

  async function updateMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMatch) return;
    setIsUpdating(true);
    setErrorMessage("");
    const response = await fetch(`/api/matches/${editingMatch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editMatchForm,
        possession: editMatchForm.possession === "" ? null : Number(editMatchForm.possession),
        shots: editMatchForm.shots === "" ? null : Number(editMatchForm.shots),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(data.error ?? "Impossible de modifier le match.");
      setIsUpdating(false);
      return;
    }
    setEditingMatch(null);
    setIsUpdating(false);
    await refreshDashboard();
  }

  async function updateFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingFriend) return;
    const response = await fetch(`/api/friends/${editingFriend.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingFriend.name }),
    });
    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(data.error ?? "Impossible de modifier l'ami.");
      return;
    }
    setEditingFriend(null);
    await refreshDashboard();
  }

  return (
    <div className={`min-h-screen ${currentTheme.themeClass} transition-colors duration-500`}>
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* SIDEBAR EA SPORTS CONSOLE STYLE */}
        <aside
          className="w-full md:w-72 p-5 border-b md:border-b-0 md:border-r flex flex-col justify-between backdrop-blur-xl shrink-0"
          style={{
            background: "rgba(10, 15, 23, 0.95)",
            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <div>
            {/* BRAND HEADER */}
            <div className="flex items-center gap-3 px-2 py-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-black shadow-lg"
                style={{ background: currentTheme.heroColor }}
              >
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <span className="fifa-title text-xl font-black tracking-tight text-white flex items-center gap-1">
                  MATCH<span style={{ color: currentTheme.heroColor }}>DAY</span>
                </span>
                <span className="text-[10px] font-mono text-gray-400 block tracking-widest uppercase">
                  EA SPORTS TRACKER
                </span>
              </div>
            </div>

            {/* FIFA EDITION SELECTOR */}
            <EditionSelector
              selectedEdition={selectedEdition}
              onSelectEdition={(ed) => {
                setSelectedEdition(ed);
                if (analysisState === "idle") setImportEdition(ed);
              }}
              isOpen={isEditionOpen}
              onToggleOpen={() => setIsEditionOpen(!isEditionOpen)}
            />

            {/* NAV LINKS */}
            <nav className="mt-6 flex flex-col gap-1.5" aria-label="Menu principal">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 px-3 py-1">
                Centre de Match
              </span>
              <a
                href="#dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition"
                style={{
                  background: `${currentTheme.heroColor}18`,
                  color: currentTheme.heroColor,
                }}
              >
                <LayoutDashboard className="w-4 h-4" />
                Tableau de bord
              </a>
              <a
                href="#matches"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <Swords className="w-4 h-4" />
                  Matchs {currentTheme.shortLabel}
                </div>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  style={{
                    background: `${currentTheme.heroColor}20`,
                    color: currentTheme.heroColor,
                  }}
                >
                  {stats.totalMatches}
                </span>
              </a>
              <a
                href="#friends"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                <Users className="w-4 h-4" />
                Face-à-Face Amis
              </a>
              <a
                href="#stats"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                <BarChart3 className="w-4 h-4" />
                Analyse & Forme
              </a>
            </nav>
          </div>

          {/* SIDEBAR FOOTER STREAK */}
          <div
            className="mt-8 p-3.5 rounded-2xl border"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              borderColor: "rgba(255, 255, 255, 0.06)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                style={{ background: `${currentTheme.heroColor}25`, color: currentTheme.heroColor }}
              >
                <Flame className="w-4 h-4 fill-current" />
              </div>
              <div>
                <strong className="block text-xs font-black text-white">
                  {stats.weeklyMatches} matchs récents
                </strong>
                <span className="text-[10px] text-gray-400 font-mono">
                  Édition {currentTheme.name}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONSOLE STAGE */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto" id="dashboard">
          {/* TOPBAR */}
          <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase"
                  style={{
                    background: `${currentTheme.heroColor}20`,
                    color: currentTheme.heroColor,
                  }}
                >
                  {currentTheme.badge}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {new Date().toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <h1 className="fifa-title text-2xl sm:text-4xl font-black text-white tracking-tight mt-1 flex items-center gap-3">
                {currentTheme.name}
                <span className="text-xs font-mono font-normal text-gray-400 px-2.5 py-1 rounded-full border border-white/10">
                  {currentTheme.year}
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{currentTheme.tagline}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-black transition hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
                style={{ background: currentTheme.heroColor }}
              >
                <CirclePlus className="w-4 h-4" />
                Nouveau Match
              </button>
            </div>
          </header>

          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 my-6">
            <StatCard
              label="Matchs Joués"
              value={String(stats.totalMatches)}
              trend={`${stats.weeklyMatches} cette semaine`}
              accentColor={currentTheme.heroColor}
              icon={<Swords className="w-4 h-4" />}
            />
            <StatCard
              label="Taux de Victoire"
              value={`${stats.winRate}%`}
              trend={stats.totalMatches > 0 ? "Sur l'édition" : "En attente"}
              accentColor={currentTheme.accentColor}
              icon={<Trophy className="w-4 h-4" />}
            />
            <StatCard
              label="Buts Inscrits"
              value={String(stats.goals)}
              trend="Total officiel"
              accentColor="#f59e0b"
              icon={<Goal className="w-4 h-4" />}
            />
            <StatCard
              label="Rival Majeur"
              value={stats.preferredOpponent ?? "-"}
              trend="Plus affronté"
              accentColor="#38bdf8"
              icon={<Shield className="w-4 h-4" />}
            />
          </div>

          {/* CORE CONTENT DUAL-PANE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* MATCH HISTORY (2 COLS) */}
            <div className="lg:col-span-2 fifa-card p-5" id="matches">
              <div className="fifa-glow" />
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">
                    EA Match Hub
                  </span>
                  <h2 className="text-lg font-black text-white fifa-title">Historique des Matchs</h2>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={selectedFriend}
                      onChange={(e) => setSelectedFriend(e.target.value)}
                      className="bg-transparent text-gray-200 outline-none text-xs cursor-pointer font-bold"
                    >
                      {friends.map((friend) => (
                        <option key={friend} value={friend} className="bg-gray-900 text-white">
                          {friend}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[11px] font-mono text-gray-400">
                    {filteredMatches.length} matchs
                  </span>
                </div>
              </div>

              {filteredMatches.length === 0 ? (
                <div className="py-16 text-center">
                  <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-300">
                    Aucun match enregistré pour {currentTheme.name}.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Importe ta première capture d&apos;écran pour démarrer ta carrière sur cette saison !
                  </p>
                  <button
                    onClick={() => setIsImportOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-black uppercase tracking-wider inline-flex items-center gap-2"
                    style={{ background: currentTheme.heroColor }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Importer un résultat
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/5 mt-2">
                  {filteredMatches.map((match) => (
                    <MatchCardRow
                      key={match.id}
                      match={match}
                      accentColor={currentTheme.heroColor}
                      onEdit={() => openEditMatch(match)}
                      onDelete={() => deleteMatch(match.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* PERFORMANCE & ANALYSIS PANEL (1 COL) */}
            <div className="flex flex-col gap-6" id="stats">
              {/* FORM CARD */}
              <div
                className="fifa-card p-5 relative overflow-hidden"
                style={{
                  background: `linear-gradient(145deg, rgba(16, 23, 33, 0.9), ${currentTheme.heroColor}12)`,
                  borderColor: `${currentTheme.heroColor}30`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold"
                    style={{
                      background: `${currentTheme.heroColor}25`,
                      color: currentTheme.heroColor,
                    }}
                  >
                    FORME DU JOUEUR
                  </span>
                  <Sparkles
                    className="w-4 h-4"
                    style={{ color: currentTheme.heroColor }}
                  />
                </div>

                <div className="mt-4">
                  <h3 className="fifa-title text-2xl font-black text-white leading-tight">
                    {stats.recentTotal ? `${stats.formRate}% Victoires` : "Saison Vierge"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {stats.recentTotal
                      ? `${stats.recentWins} victoire(s) sur les ${stats.recentTotal} derniers matchs.`
                      : "Commence à jouer pour calculer ta dynamique."}
                  </p>
                </div>

                {/* VISUAL FORM BAR */}
                <div className="mt-5">
                  <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1.5">
                    <span>Performance récente</span>
                    <span style={{ color: currentTheme.heroColor }} className="font-bold">
                      {stats.formRate}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-700 rounded-full"
                      style={{
                        width: `${stats.formRate}%`,
                        background: currentTheme.heroColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* FRIENDS HEAD-TO-HEAD CARD */}
              <div className="fifa-card p-5" id="friends">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">
                      FACE-À-FACE
                    </span>
                    <h3 className="text-base font-black text-white fifa-title">Adversaires</h3>
                  </div>
                  <button
                    onClick={() => setIsFriendOpen(true)}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition"
                    title="Ajouter un ami"
                  >
                    <CirclePlus className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-white/5 mt-2">
                  {stats.friendStats.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">
                      Aucun ami affronté pour cette édition.
                    </p>
                  ) : (
                    stats.friendStats.map((friend) => (
                      <div
                        key={friend.name}
                        className="py-3 flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0"
                            style={{
                              background: "rgba(255, 255, 255, 0.08)",
                              color: currentTheme.heroColor,
                            }}
                          >
                            {friend.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <span className="block text-xs font-bold text-white truncate">
                              {friend.name}
                            </span>
                            <span className="block text-[10px] font-mono text-gray-400">
                              {friend.record}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span
                              className="text-xs font-black"
                              style={{ color: currentTheme.heroColor }}
                            >
                              {friend.winRate}%
                            </span>
                            <span className="block text-[9px] font-mono text-gray-500">
                              {friend.matches} m
                            </span>
                          </div>
                          <button
                            onClick={() => setEditingFriend(friend)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition"
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteFriend(friend.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* FLOATING SOUNDTRACK EA TRAX PLAYER */}
      <EaTraxPlayer edition={selectedEdition} />

      {/* ERROR BANNER */}
      {(errorMessage || dashboardState.error) && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-950/90 border border-red-500 text-red-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <span className="text-xs font-mono font-bold">{errorMessage || dashboardState.error}</span>
          <button
            onClick={() => setErrorMessage("")}
            className="text-red-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MATCH IMPORT MODAL */}
      {isImportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsImportOpen(false)}
        >
          <div
            className="fifa-card max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0d131c",
              borderColor: `${currentTheme.heroColor}50`,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: currentTheme.heroColor }} />
                <h2 className="fifa-title text-xl font-black text-white">
                  Importer un Match FIFA / FC
                </h2>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* EDITION CONTEXT SELECTOR FOR THE MATCH */}
            <div className="my-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-gray-400 block uppercase">
                  Saison affectée
                </span>
                <span className="text-xs font-black text-white">
                  {FIFA_EDITIONS[importEdition]?.name || importEdition}
                </span>
              </div>
              <select
                value={importEdition}
                onChange={(e) => setImportEdition(e.target.value as FifaEdition)}
                className="bg-black/60 border border-white/20 text-white rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer"
              >
                {importEdition === "ALL" && <option value="ALL" disabled>Choose an edition</option>}
                {VALID_RECORD_EDITIONS.map((ed) => (
                  <option key={ed} value={ed} className="bg-gray-900 text-white">
                    {FIFA_EDITIONS[ed].name}
                  </option>
                ))}
              </select>
            </div>

            {analysisState === "done" && analysis ? (
              <div className="space-y-4 my-4">
                <div
                  className="p-4 rounded-xl border flex items-center gap-4"
                  style={{
                    background: `${currentTheme.heroColor}12`,
                    borderColor: `${currentTheme.heroColor}40`,
                  }}
                >
                  <Trophy className="w-8 h-8" style={{ color: currentTheme.heroColor }} />
                  <div>
                    <span className="text-[10px] font-mono uppercase text-gray-400">
                      Score extrait par l&apos;IA
                    </span>
                    <p className="fifa-title text-2xl font-black text-white">
                      {analysis.playerScore} - {analysis.opponentScore}
                    </p>
                    <p className="text-xs text-gray-300">
                      {String(analysis.playerClub)} vs {String(analysis.opponentClub)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Sélectionne l&apos;ami adverse :
                  </label>
                  <select
                    value={selectedOpponent}
                    onChange={(e) => setSelectedOpponent(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-white"
                  >
                    <option value="" className="bg-gray-900">
                      -- Choisir un adversaire --
                    </option>
                    {friends
                      .filter((f) => f !== "Tous les amis")
                      .map((friend) => (
                        <option key={friend} value={friend} className="bg-gray-900">
                          {friend}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="my-5">
                <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center bg-white/5">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">
                    {analysisState === "analyzing"
                      ? "Vision IA en cours d'analyse..."
                      : fileName || "Importe ta capture d'écran"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    PNG, JPG, photo d&apos;écran TV ou PlayStation
                  </p>
                </div>

                <div className="flex gap-3 mt-4">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white cursor-pointer transition">
                    <Camera className="w-4 h-4" />
                    Prendre photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFile}
                      className="hidden"
                    />
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white cursor-pointer transition">
                    <FileImage className="w-4 h-4" />
                    Parcourir image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={analysisState !== "done" || isSaving || !selectedOpponent || !isConcreteEdition(importEdition)}
                onClick={saveMatch}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-black transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                style={{ background: currentTheme.heroColor }}
              >
                {isSaving ? "Enregistrement..." : "Confirmer le Match"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MATCH MODAL */}
      {editingMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setEditingMatch(null)}
        >
          <div
            className="fifa-card max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#0d131c" }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="fifa-title text-lg font-black text-white">Modifier le Match</h2>
              <button
                onClick={() => setEditingMatch(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={updateMatch} className="space-y-3.5 my-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Édition FIFA / FC
                </label>
                <select
                  value={editMatchForm.edition}
                  onChange={(e) =>
                    setEditMatchForm({ ...editMatchForm, edition: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  {VALID_RECORD_EDITIONS.map((ed) => (
                    <option key={ed} value={ed} className="bg-gray-900">
                      {FIFA_EDITIONS[ed].name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Mon Club</label>
                <input
                  required
                  value={editMatchForm.playerClub}
                  onChange={(e) =>
                    setEditMatchForm({ ...editMatchForm, playerClub: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Club Adverse</label>
                <input
                  required
                  value={editMatchForm.opponentClub}
                  onChange={(e) =>
                    setEditMatchForm({ ...editMatchForm, opponentClub: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Mon Score</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMatchForm.playerScore}
                    onChange={(e) =>
                      setEditMatchForm({
                        ...editMatchForm,
                        playerScore: Number(e.target.value),
                      })
                    }
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Score Adverse</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMatchForm.opponentScore}
                    onChange={(e) =>
                      setEditMatchForm({
                        ...editMatchForm,
                        opponentScore: Number(e.target.value),
                      })
                    }
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase text-black"
                  style={{ background: currentTheme.heroColor }}
                >
                  {isUpdating ? "Mise à jour..." : "Sauvegarder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE FRIEND MODAL */}
      {isFriendOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsFriendOpen(false)}
        >
          <div
            className="fifa-card max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#0d131c" }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="fifa-title text-lg font-black text-white">Ajouter un Ami</h2>
              <button
                onClick={() => setIsFriendOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={createFriend} className="my-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Nom / Pseudo</label>
                <input
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="Ex: Kylian, Yanis..."
                  maxLength={80}
                  autoFocus
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFriendOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!friendName.trim() || isCreatingFriend}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-black disabled:opacity-40"
                  style={{ background: currentTheme.heroColor }}
                >
                  {isCreatingFriend ? "Création..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FRIEND MODAL */}
      {editingFriend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setEditingFriend(null)}
        >
          <div
            className="fifa-card max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#0d131c" }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="fifa-title text-lg font-black text-white">Modifier l&apos;Ami</h2>
              <button
                onClick={() => setEditingFriend(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={updateFriend} className="my-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Nom / Pseudo</label>
                <input
                  required
                  maxLength={80}
                  value={editingFriend.name}
                  onChange={(e) =>
                    setEditingFriend({ ...editingFriend, name: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFriend(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-black"
                  style={{ background: currentTheme.heroColor }}
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  accentColor,
  icon,
}: {
  label: string;
  value: string;
  trend: string;
  accentColor: string;
  icon: React.ReactNode;
}) {
  return (
    <article
      className="fifa-card fifa-card-interactive p-4 relative"
      style={{
        background: "rgba(16, 23, 33, 0.8)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono tracking-wider uppercase text-gray-400">
          {label}
        </span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}20`, color: accentColor }}
        >
          {icon}
        </div>
      </div>
      <strong className="fifa-title text-2xl sm:text-3xl font-black text-white block">
        {value}
      </strong>
      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-gray-400">
        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
        <span>{trend}</span>
      </div>
    </article>
  );
}

function MatchCardRow({
  match,
  onEdit,
  onDelete,
}: {
  match: Match;
  accentColor: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const resultColor =
    match.result === "W"
      ? "#22c55e"
      : match.result === "D"
      ? "#eab308"
      : "#ef4444";

  const resultLabel =
    match.result === "W" ? "VICTOIRE" : match.result === "D" ? "NUL" : "DÉFAITE";

  const editionBadge = FIFA_EDITIONS[match.edition as FifaEdition]?.shortLabel || match.edition;

  return (
    <div className="py-3.5 px-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 group hover:bg-white/[0.02] rounded-xl transition">
      <div className="flex items-center gap-3 min-w-0">
        {/* RESULT BADGE */}
        <div
          className="w-9 h-9 rounded-lg flex flex-col items-center justify-center font-black text-xs shrink-0 shadow-md"
          style={{
            background: `${resultColor}20`,
            border: `1px solid ${resultColor}50`,
            color: resultColor,
          }}
        >
          <span>{match.result}</span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">vs {match.opponent}</span>
            <span
              className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold"
              style={{ background: "rgba(255,255,255,0.08)", color: "#aaa" }}
            >
              {editionBadge}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
            <span>{match.club}</span>
            <span className="text-gray-600">vs</span>
            <span>{match.opponentClub}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* SCORE */}
        <div className="text-right">
          <span className="fifa-title text-xl font-black text-white tracking-wider block">
            {match.score}
          </span>
          <span
            className="text-[9px] font-mono font-bold tracking-widest block"
            style={{ color: resultColor }}
          >
            {resultLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            title="Modifier"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function toMatch(match: {
  id: string;
  friend: { id: string; name: string };
  playerClub: string;
  opponentClub: string;
  playerScore: number;
  opponentScore: number;
  possession?: number | null;
  shots?: number | null;
  playedAt: string;
  edition: string;
}): Match {
  return {
    id: match.id,
    opponent: match.friend.name,
    initials: match.friend.name.slice(0, 2).toUpperCase(),
    score: `${match.playerScore} - ${match.opponentScore}`,
    result:
      match.playerScore > match.opponentScore
        ? "W"
        : match.playerScore === match.opponentScore
        ? "D"
        : "L",
    date: new Date(match.playedAt).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    club: match.playerClub,
    opponentClub: match.opponentClub,
    possession: match.possession == null ? "-" : `${match.possession}%`,
    shots: match.shots == null ? "-" : String(match.shots),
    friendId: match.friend.id,
    playerScore: match.playerScore,
    opponentScore: match.opponentScore,
    edition: match.edition,
  };
}
