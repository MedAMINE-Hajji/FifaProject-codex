"use client";

import type { CareerPanelProps } from "@/lib/matches/contracts";
import styles from "./CareerPanel.module.css";

export default function CareerPanel({ dashboard, onSelectEdition }: CareerPanelProps) {
  if (dashboard.edition !== "ALL") return null;
  const { stats, comparisons } = dashboard;
  const wins = dashboard.matches.filter((match) => match.playerScore > match.opponentScore).length;
  const draws = dashboard.matches.filter((match) => match.playerScore === match.opponentScore).length;
  return (
    <section className={styles.panel} aria-label="Career overview">
      <header>
        <p className={styles.eyebrow}>All editions</p>
        <h2>Career overview</h2>
        <p>Lifetime results across all six editions. To record a match, choose a game edition in the entry dialog.</p>
      </header>
      {stats.totalMatches === 0 && <p>No matches recorded yet. Choose an edition to start your history.</p>}
      <dl className={styles.totals} aria-label="Lifetime totals">
        {[
          ["Matches", stats.totalMatches], ["Wins", wins], ["Draws", draws],
          ["Losses", stats.totalMatches - wins - draws], ["Goals scored", stats.goals],
          ["Win rate", `${stats.winRate}%`],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <h3>Edition comparisons</h3>
      {comparisons ? (
        <ul className={styles.editions}>
          {comparisons.map((row) => (
            <li key={row.edition}>
              <h4><button type="button" onClick={() => onSelectEdition(row.edition)} aria-label={`View ${row.name} history`}>{row.name}<span aria-hidden="true"> →</span></button></h4>
              {row.matches === 0 && <p>No matches recorded</p>}
              <dl className={styles.record}>
                {[["Matches", row.matches], ["Wins", row.wins], ["Draws", row.draws], ["Losses", row.losses], ["Goals scored", row.goals], ["Win rate", `${row.winRate}%`]].map(([label, value]) => (
                  <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      ) : <p>Edition comparisons are unavailable. Refresh to try again.</p>}
      <h3>Lifetime rivalries</h3>
      <p>Friends are shared across editions. These records include all their matches.</p>
      {stats.friendStats.length ? (
        <ul className={styles.rivals}>{stats.friendStats.map((friend) => (
          <li key={friend.id}><strong>{friend.name}</strong><span>{friend.matches} {friend.matches === 1 ? "match" : "matches"} · {friend.record} · {friend.winRate}% win rate</span></li>
        ))}</ul>
      ) : <p>No friend rivalries yet.</p>}
    </section>
  );
}
