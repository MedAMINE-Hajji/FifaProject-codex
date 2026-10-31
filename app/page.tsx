"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, BarChart3, Bell, ChevronDown, CirclePlus,
  Camera, Clock3, FileImage, Filter, Flame, Goal, LayoutDashboard, Pencil, Search,
  Settings2, Shield, Sparkles, Swords, Trash2, Trophy, Upload, Users, X,
} from "lucide-react";

type Match = {
  id: string; opponent: string; initials: string; score: string;
  result: "W" | "D" | "L"; date: string; club: string;
  opponentClub: string; possession: string; shots: string; friendId: string;
  playerScore: number; opponentScore: number;
};

type FriendStat = { id: string; name: string; matches: number; record: string; winRate: number };
type DashboardStats = {
  totalMatches: number; winRate: number; goals: number; preferredOpponent: string | null;
  weeklyMatches: number; recentWins: number; recentTotal: number; formRate: number; friendStats: FriendStat[];
};

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalMatches: 0, winRate: 0, goals: 0, preferredOpponent: null, weeklyMatches: 0, recentWins: 0, recentTotal: 0, formRate: 0, friendStats: [] });
  const [selectedFriend, setSelectedFriend] = useState("Tous les amis");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFriendOpen, setIsFriendOpen] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState("");
  const [fileName, setFileName] = useState("");
  const [analysisState, setAnalysisState] = useState<"idle" | "analyzing" | "done">("idle");
  const [analysis, setAnalysis] = useState<Record<string, string | number | null> | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingFriend, setIsCreatingFriend] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editMatchForm, setEditMatchForm] = useState({ friendId: "", playerClub: "", opponentClub: "", playerScore: 0, opponentScore: 0, possession: "", shots: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingFriend, setEditingFriend] = useState<FriendStat | null>(null);
  const filteredMatches = useMemo(() => selectedFriend === "Tous les amis" ? matches : matches.filter((match) => match.opponent === selectedFriend), [matches, selectedFriend]);

  useEffect(() => {
    fetch("/api/matches").then(async (response) => {
      if (!response.ok) throw new Error("Impossible de charger les matchs.");
      const data = await response.json();
      setFriends(["Tous les amis", ...data.friends.map((friend: { name: string }) => friend.name)]);
      setMatches(data.matches.map(toMatch));
      setStats(data.stats);
    }).catch((error: Error) => setErrorMessage(error.message));
  }, []);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setAnalysisState("analyzing"); setErrorMessage("");
    const formData = new FormData(); formData.append("image", file);
    fetch("/api/matches/analyze", { method: "POST", body: formData }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Analyse impossible.");
      setAnalysis(data); setAnalysisState("done");
    }).catch((error: Error) => { setAnalysisState("idle"); setErrorMessage(error.message); });
  }

  async function saveMatch() {
    if (!analysis || !selectedOpponent) {
      setErrorMessage("Sélectionne un adversaire avant d'enregistrer le match.");
      return;
    }
    setIsSaving(true); setErrorMessage("");
    const response = await fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...analysis, friendName: selectedOpponent }) });
    const data = await response.json();
    if (!response.ok) { setErrorMessage(data.error ?? "Impossible d'enregistrer le match."); setIsSaving(false); return; }
    const dashboardResponse = await fetch("/api/matches");
    if (dashboardResponse.ok) {
      const dashboard = await dashboardResponse.json();
      setMatches(dashboard.matches.map(toMatch));
      setFriends(["Tous les amis", ...dashboard.friends.map((friend: { name: string }) => friend.name)]);
      setStats(dashboard.stats);
    } else {
      setMatches((current) => [toMatch(data), ...current]);
    }
    setIsSaving(false); setIsImportOpen(false); setAnalysisState("idle"); setAnalysis(null); setFileName(""); setSelectedOpponent("");
  }

  async function createFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = friendName.trim();
    if (!name) return;
    setIsCreatingFriend(true); setErrorMessage("");
    const response = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json();
    if (!response.ok) {
      setErrorMessage(data.error ?? "Impossible de créer cet ami.");
      setIsCreatingFriend(false);
      return;
    }
    setFriends((current) => current.includes(data.name) ? current : [...current, data.name]);
    setSelectedOpponent(data.name);
    setFriendName(""); setIsCreatingFriend(false); setIsFriendOpen(false);
    await refreshDashboard();
  }

    function openEditMatch(match: Match) {
      setEditingMatch(match);
      setEditMatchForm({ friendId: match.friendId, playerClub: match.club, opponentClub: match.opponentClub, playerScore: match.playerScore, opponentScore: match.opponentScore, possession: match.possession === "-" ? "" : match.possession.replace("%", ""), shots: match.shots === "-" ? "" : match.shots });
    }

    async function deleteMatch(id: string) {
      if (!window.confirm("Supprimer ce match ?")) return;
      const response = await fetch(`/api/matches/${id}`, { method: "DELETE" });
      if (!response.ok) { setErrorMessage("Impossible de supprimer le match."); return; }
      await refreshDashboard();
    }

    async function deleteFriend(id: string) {
      if (!window.confirm("Supprimer cet ami et ses matchs associés ?")) return;
      const response = await fetch(`/api/friends/${id}`, { method: "DELETE" });
      if (!response.ok) { setErrorMessage("Impossible de supprimer cet ami."); return; }
      if (selectedFriend === stats.friendStats.find((friend) => friend.id === id)?.name) setSelectedFriend("Tous les amis");
      await refreshDashboard();
    }

    async function updateMatch(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (!editingMatch) return;
      setIsUpdating(true); setErrorMessage("");
      const response = await fetch(`/api/matches/${editingMatch.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editMatchForm) });
      const data = await response.json();
      if (!response.ok) { setErrorMessage(data.error ?? "Impossible de modifier le match."); setIsUpdating(false); return; }
      setEditingMatch(null); setIsUpdating(false);
      await refreshDashboard();
    }

    async function updateFriend(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (!editingFriend) return;
      const response = await fetch(`/api/friends/${editingFriend.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editingFriend.name }) });
      const data = await response.json();
      if (!response.ok) { setErrorMessage(data.error ?? "Impossible de modifier l'ami."); return; }
      setEditingFriend(null);
      await refreshDashboard();
    }

    async function refreshDashboard() {
      const response = await fetch("/api/matches");
      if (!response.ok) throw new Error("Impossible de rafraîchir le tableau de bord.");
      const data = await response.json();
      setMatches(data.matches.map(toMatch));
      setFriends(["Tous les amis", ...data.friends.map((friend: { name: string }) => friend.name)]);
      setStats(data.stats);
    }
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Swords size={19} /></div><span>match<span className="brand-accent">day</span></span></div>
        <div className="profile-card"><div className="avatar avatar-large">MO</div><div><strong>Mon profil</strong><span>Mes matchs FIFA</span></div><ChevronDown size={15} /></div>
        <nav className="nav-list" aria-label="Navigation principale"><span className="nav-label">Espace de jeu</span><a className="nav-item active" href="#dashboard"><LayoutDashboard size={17} /> Tableau de bord</a><a className="nav-item" href="#matches"><Swords size={17} /> Mes matchs <b>{stats.totalMatches}</b></a><a className="nav-item" href="#friends"><Users size={17} /> Mes amis</a><a className="nav-item" href="#stats"><BarChart3 size={17} /> Statistiques</a><span className="nav-label nav-label-spaced">Compte</span><a className="nav-item" href="#settings"><Settings2 size={17} /> Paramètres</a></nav>
        <div className="sidebar-bottom"><div className="streak"><Flame size={18} fill="currentColor" /><div><strong>{stats.weeklyMatches} matchs</strong><span>cette semaine</span></div></div><p>Ton historique reste<br />à jour, match après match.</p></div>
      </aside>

      <section className="content" id="dashboard">
        <header className="topbar"><div className="breadcrumb"><span>ESPACE DE JEU</span><b>/</b> Tableau de bord</div><div className="top-actions"><button className="icon-button" aria-label="Rechercher"><Search size={18} /></button><button className="icon-button notification" aria-label="Notifications"><Bell size={18} /><i /></button><div className="avatar">AM</div></div></header>
        <div className="page-heading"><div><p className="eyebrow">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p><h1>Ton espace de jeu <span>👋</span></h1><p className="subtitle">Voici comment se passe ta saison entre amis.</p></div><button className="primary-button" onClick={() => setIsImportOpen(true)}><CirclePlus size={18} /> Ajouter un match</button></div>
        <div className="stat-grid"><StatCard label="Matchs joués" value={String(stats.totalMatches)} trend="Base en ligne" detail="depuis PostgreSQL" icon={<Swords size={19} />} tone="green" /><StatCard label="Taux de victoire" value={`${stats.winRate}%`} trend="Calculé" detail="sur tes matchs" icon={<Trophy size={19} />} tone="gold" /><StatCard label="Buts marqués" value={String(stats.goals)} trend="Actualisé" detail="cette saison" icon={<Goal size={19} />} tone="orange" /><StatCard label="Adversaire préféré" value={stats.preferredOpponent ?? "-"} trend="Données réelles" detail="le plus affronté" icon={<Shield size={19} />} tone="blue" /></div>
        <div className="section-grid"><section className="panel recent-panel" id="matches"><div className="panel-heading"><div><p className="eyebrow">Historique récent</p><h2>Derniers matchs</h2></div><button className="text-button">Voir tout <ArrowUpRight size={15} /></button></div><div className="filter-row"><button className="filter-select"><Filter size={15} /> Filtrer par ami</button><select value={selectedFriend} onChange={(event) => setSelectedFriend(event.target.value)} aria-label="Filtrer par ami">{friends.map((friend) => <option key={friend}>{friend}</option>)}</select><span className="match-count">{filteredMatches.length} matchs</span></div><div className="match-list">{filteredMatches.map((match) => <MatchRow key={match.id} match={match} onEdit={() => openEditMatch(match)} onDelete={() => deleteMatch(match.id)} />)}</div></section><aside className="panel insight-panel" id="stats"><div className="insight-top"><div className="spark-icon"><Sparkles size={17} /></div><span>Analyse de ta saison</span></div><h2>{stats.recentTotal ? "Ta forme récente" : "Commence ta saison"}<br /><em>{stats.recentTotal ? `${stats.formRate}% de victoires.` : "ajoute ton premier match."}</em></h2><p>{stats.recentTotal ? `${stats.recentWins} victoire${stats.recentWins > 1 ? "s" : ""} sur tes ${stats.recentTotal} derniers matchs.` : "Tes statistiques apparaîtront après ton premier match."}</p><div className="mini-chart"><div className="chart-labels"><span>Forme récente</span><strong>{stats.formRate}%</strong></div><div className="bars"><i style={{ height: `${stats.formRate}%` }} className="highlight" /></div><div className="chart-days"><span>{stats.recentTotal} derniers matchs</span></div></div><button className="dark-button">Voir l’analyse complète <ArrowUpRight size={15} /></button></aside></div>
        <section className="bottom-grid" id="friends"><div className="panel friends-panel"><div className="panel-heading"><div><p className="eyebrow">Face à face</p><h2>Tes amis</h2></div><button className="outline-button small-button" onClick={() => setIsFriendOpen(true)}><CirclePlus size={15} /> Ajouter</button></div><div className="friend-list">{stats.friendStats.map((friend, index) => <FriendRow key={friend.name} friend={friend} tone={["green", "purple", "orange"][index % 3]} onEdit={() => setEditingFriend(friend)} onDelete={() => deleteFriend(friend.id)} />)}</div></div><div className="panel upload-panel"><div className="upload-art"><FileImage size={27} /><span /></div><div><p className="eyebrow">Capture tes résultats</p><h2>Un match terminé ?</h2><p>Ajoute une capture d’écran et laisse l’IA faire le travail.</p></div><button className="outline-button" onClick={() => setIsImportOpen(true)}><Upload size={16} /> Importer une capture</button></div></section>
      </section>
      {errorMessage && <div className="error-banner" role="alert">{errorMessage}</div>}
      {isImportOpen && <div className="modal-backdrop" onClick={() => setIsImportOpen(false)}><section className="modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setIsImportOpen(false)} aria-label="Fermer"><X size={18} /></button><div className="modal-icon"><Sparkles size={22} /></div><p className="eyebrow">Nouveau résultat</p><h2>Importe ta capture</h2><p className="modal-copy">Prends une photo directement avec ton téléphone ou choisis une image existante. L&apos;IA analyse ensuite le résultat.</p>{analysisState === "done" && analysis ? <><div className="analysis-done"><Trophy size={20} /><div><strong>Capture analysée</strong><span>{analysis.playerScore} - {analysis.opponentScore} · {analysis.playerClub} vs {analysis.opponentClub}</span></div></div><label className="field-label">Adversaire<select value={selectedOpponent} onChange={(event) => setSelectedOpponent(event.target.value)}><option value="">Choisir un ami</option>{friends.filter((friend) => friend !== "Tous les amis").map((friend) => <option key={friend} value={friend}>{friend}</option>)}</select></label><button className="text-button add-friend-link" onClick={() => setIsFriendOpen(true)}><CirclePlus size={14} /> Créer un nouvel ami</button></> : <><label className="dropzone"><Upload size={24} /><strong>{analysisState === "analyzing" ? "Analyse en cours..." : fileName || "Ajoute ta capture"}</strong><span>{analysisState === "analyzing" ? "L’IA lit les statistiques du match" : "Photo ou fichier image"}</span></label><div className="capture-actions"><label className="outline-button capture-button"><Camera size={16} /> Prendre une photo<input type="file" accept="image/*" capture="environment" onChange={handleFile} /></label><label className="outline-button capture-button"><FileImage size={16} /> Choisir une image<input type="file" accept="image/*" onChange={handleFile} /></label></div></>}{errorMessage && <p className="modal-error">{errorMessage}</p>}<div className="modal-actions"><button className="outline-button" onClick={() => setIsImportOpen(false)}>Annuler</button><button className="primary-button" disabled={analysisState !== "done" || isSaving || !selectedOpponent} onClick={saveMatch}>{isSaving ? "Enregistrement..." : "Enregistrer le match"}</button></div></section></div>}
      {editingMatch && <div className="modal-backdrop" onClick={() => setEditingMatch(null)}><section className="modal small-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditingMatch(null)} aria-label="Fermer"><X size={18} /></button><div className="modal-icon"><Pencil size={22} /></div><p className="eyebrow">Modifier le match</p><h2>Corriger le résultat</h2><form onSubmit={updateMatch}><label className="field-label">Adversaire<select value={editMatchForm.friendId} onChange={(event) => setEditMatchForm({ ...editMatchForm, friendId: event.target.value })}>{stats.friendStats.map((friend) => <option key={friend.id} value={friend.id}>{friend.name}</option>)}</select></label><label className="field-label">Mon club<input required value={editMatchForm.playerClub} onChange={(event) => setEditMatchForm({ ...editMatchForm, playerClub: event.target.value })} /></label><label className="field-label">Club adverse<input required value={editMatchForm.opponentClub} onChange={(event) => setEditMatchForm({ ...editMatchForm, opponentClub: event.target.value })} /></label><div className="edit-grid"><label className="field-label">Mon score<input required type="number" min="0" value={editMatchForm.playerScore} onChange={(event) => setEditMatchForm({ ...editMatchForm, playerScore: Number(event.target.value) })} /></label><label className="field-label">Score adverse<input required type="number" min="0" value={editMatchForm.opponentScore} onChange={(event) => setEditMatchForm({ ...editMatchForm, opponentScore: Number(event.target.value) })} /></label></div><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setEditingMatch(null)}>Annuler</button><button type="submit" className="primary-button" disabled={isUpdating}>{isUpdating ? "Modification..." : "Enregistrer"}</button></div></form></section></div>}
      {isFriendOpen && <div className="modal-backdrop" onClick={() => setIsFriendOpen(false)}><section className="modal small-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setIsFriendOpen(false)} aria-label="Fermer"><X size={18} /></button><div className="modal-icon"><Users size={22} /></div><p className="eyebrow">Mes amis</p><h2>Ajouter un adversaire</h2><p className="modal-copy">Crée un ami pour pouvoir l’associer à tes prochains matchs.</p><form onSubmit={createFriend}><label className="field-label">Nom de l&apos;ami<input value={friendName} onChange={(event) => setFriendName(event.target.value)} placeholder="Ex. Yanis" maxLength={80} autoFocus /></label><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setIsFriendOpen(false)}>Annuler</button><button type="submit" className="primary-button" disabled={!friendName.trim() || isCreatingFriend}>{isCreatingFriend ? "Création..." : "Créer l'ami"}</button></div></form></section></div>}
      {editingFriend && <div className="modal-backdrop" onClick={() => setEditingFriend(null)}><section className="modal small-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditingFriend(null)} aria-label="Fermer"><X size={18} /></button><div className="modal-icon"><Pencil size={22} /></div><p className="eyebrow">Modifier un ami</p><h2>Nom de l&apos;ami</h2><form onSubmit={updateFriend}><label className="field-label">Nom<input required maxLength={80} value={editingFriend.name} onChange={(event) => setEditingFriend({ ...editingFriend, name: event.target.value })} /></label><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setEditingFriend(null)}>Annuler</button><button type="submit" className="primary-button">Enregistrer</button></div></form></section></div>}
    </main>
  );
}

function StatCard({ label, value, trend, detail, icon, tone }: { label: string; value: string; trend: string; detail: string; icon: React.ReactNode; tone: string }) { return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><div className="stat-foot"><span className="trend"><ArrowUpRight size={13} /> {trend}</span><span>{detail}</span></div></article>; }
function MatchRow({ match, onEdit, onDelete }: { match: Match; onEdit: () => void; onDelete: () => void }) { return <div className="match-row"><div className="avatar">{match.initials}</div><div className="match-opponent"><strong>vs. {match.opponent}</strong><span><Clock3 size={12} /> {match.date}</span></div><div className="clubs"><span>{match.club}</span><b>vs</b><span>{match.opponentClub}</span></div><strong className="match-score">{match.score}</strong><span className={`result result-${match.result.toLowerCase()}`}>{match.result === "W" ? "Victoire" : match.result === "D" ? "Nul" : "Défaite"}</span><button className="row-action" onClick={onEdit} aria-label={`Modifier le match contre ${match.opponent}`}><Pencil size={14} /></button><button className="row-action" onClick={onDelete} aria-label={`Supprimer le match contre ${match.opponent}`}><Trash2 size={14} /></button></div>; }
function FriendRow({ friend, tone, onEdit, onDelete }: { friend: FriendStat; tone: string; onEdit: () => void; onDelete: () => void }) { return <div className="friend-row"><div className={`avatar ${tone}`}>{friend.name.slice(0, 2).toUpperCase()}</div><div className="friend-name"><strong>{friend.name}</strong><span>{friend.record}</span></div><div className="progress"><i style={{ width: `${friend.winRate}%` }} /></div><strong className="friend-percent">{friend.winRate}%</strong><button className="row-action" onClick={onEdit} aria-label={`Modifier ${friend.name}`}><Pencil size={14} /></button><button className="row-action" onClick={onDelete} aria-label={`Supprimer ${friend.name}`}><Trash2 size={14} /></button></div>; }

function toMatch(match: { id: string; friend: { id: string; name: string }; playerClub: string; opponentClub: string; playerScore: number; opponentScore: number; possession?: number | null; shots?: number | null; playedAt: string }) : Match {
  return { id: match.id, opponent: match.friend.name, initials: match.friend.name.slice(0, 2).toUpperCase(), score: `${match.playerScore} - ${match.opponentScore}`, result: match.playerScore > match.opponentScore ? "W" : match.playerScore === match.opponentScore ? "D" : "L", date: new Date(match.playedAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }), club: match.playerClub, opponentClub: match.opponentClub, possession: match.possession == null ? "-" : `${match.possession}%`, shots: match.shots == null ? "-" : String(match.shots), friendId: match.friend.id, playerScore: match.playerScore, opponentScore: match.opponentScore };
}
