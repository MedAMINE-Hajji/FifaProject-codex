'use client';

import { useState, useSyncExternalStore } from 'react';
import { ArrowDown, ArrowUpRight, Camera, ChevronDown, Flag, Plus, Trophy, Users } from 'lucide-react';
import { EDITION_LIST, FIFA_EDITIONS } from '@/lib/fifa-editions';
import type { DashboardShellProps } from '@/lib/presentation-contracts';
import type { MatchRecord } from '@/lib/matches/contracts';
import { useDashboardTheme } from './ThemeProvider';
import './dashboard-shell.css';

export { DashboardThemeProvider } from './ThemeProvider';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

function result(match: MatchRecord) {
  return match.playerScore > match.opponentScore ? 'Win' : match.playerScore < match.opponentScore ? 'Loss' : 'Draw';
}

function matchDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Date unavailable' : dateFormat.format(date);
}

/** Presentational shell only: parent owns selection, mutations, dialogs and music. */
export default function DashboardShell(props: DashboardShellProps) {
  const hydrated = useSyncExternalStore(subscribeHydration, clientReady, serverReady);
  const { edition, loading, error, onSelectEdition, onUpload, onManual, onAddFriend, onEditMatch, onDeleteMatch, onEditFriend, onDeleteFriend, career, children } = props;
  const theme = useDashboardTheme();
  const { Backdrop, Hero } = theme;
  const label = FIFA_EDITIONS[edition].name;
  // Never display a previous edition's records during a scope transition.
  const data = !loading && props.dashboard?.edition === edition ? props.dashboard : null;
  const matches = data?.matches.filter(match => match.edition === edition) ?? [];
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState('All results');
  const [expanded, setExpanded] = useState(false);
  const filtered = matches.filter(match =>
    `${match.friend.name} ${match.playerClub} ${match.opponentClub}`.toLowerCase().includes(query.toLowerCase()) &&
    (outcome === 'All results' || result(match) === outcome),
  );
  const shown = expanded ? filtered : filtered.slice(0, 8);
  const stats = data?.stats;
  const recent = matches.slice(0, 4).reverse();

  return (
    <div className={`md-shell ${theme.className}`} style={theme.tokens} data-edition={edition} lang="en">
      <a className="md-skip" href="#matchday-content">Skip to content</a>
      <div className="md-backdrop" aria-hidden="true">{Backdrop && <Backdrop edition={edition} label={label} />}</div>
      <div className="md-container">
        <header className="md-topbar">
          <a className="md-brand" href="#matchday-content" aria-label="matchday home"><span className="md-brand-mark" aria-hidden="true">m<span>.</span></span>matchday<span className="md-brand-caption">YOUR PERSONAL FOOTBALL ARCHIVE</span></a>
          <div className="md-edition-control">
            <label htmlFor="matchday-edition">Current edition</label>
            <div className="md-select-wrap"><select id="matchday-edition" disabled={!hydrated} value={edition} onChange={event => {
              const selected = EDITION_LIST.find(item => item === event.target.value);
              if (selected) { setQuery(''); setOutcome('All results'); setExpanded(false); onSelectEdition(selected); }
            }}>{EDITION_LIST.filter(item => item !== 'ALL').map(item => <option key={item} value={item}>{FIFA_EDITIONS[item].name}</option>)}<option value="ALL">All editions · Career</option></select><ChevronDown size={16} aria-hidden="true" /></div>
          </div>
        </header>

        <nav className="md-nav" aria-label="Dashboard navigation">
          <a href="#matchday-content" aria-current={edition !== 'ALL' ? 'page' : undefined}>Overview</a>
          {edition !== 'ALL' && <><a href="#match-history">Match history</a><a href="#rivalries">Rivalries</a></>}
          <button onClick={() => onSelectEdition('ALL')} aria-current={edition === 'ALL' ? 'page' : undefined}><Trophy size={15} aria-hidden="true" /> Career overview <ArrowUpRight size={13} aria-hidden="true" /></button>
          <span className="md-nav-scope">{label}</span>
        </nav>

        <main id="matchday-content" tabIndex={-1}>
          {edition === 'ALL' ? <section className="md-career" aria-labelledby="career-heading"><p className="md-eyebrow">THE COMPLETE PICTURE</p><h1 id="career-heading">Your career. Every edition.</h1><p className="md-muted">Lifetime records across all six editions. Choose a concrete edition from the selector to record a match.</p>{!loading && !error && career}</section> : <>
            {Hero ? <Hero edition={edition} label={label} totalMatches={stats?.totalMatches ?? 0} disabled={false} onUpload={onUpload} onManual={onManual} /> : <section className="md-hero md-fallback-hero"><p className="md-eyebrow">YOUR PERSONAL FOOTBALL ARCHIVE</p><h1>{label}</h1><p>Every match has a story. Keep yours here.</p><div className="md-actions"><button className="md-button md-button-primary" onClick={onUpload}><Camera size={18} aria-hidden="true" /> Upload screenshot</button><button className="md-button md-button-secondary" onClick={onManual}><Plus size={18} aria-hidden="true" /> Add match manually</button></div></section>}
          </>}

          {error && <div className="md-notice md-error" role="alert"><strong>Unable to load your records.</strong> {error}</div>}
          {loading && <div className="md-notice" role="status">Loading {label} records…</div>}
          {!loading && !error && !data && <div className="md-notice" role="status">Waiting for {label} records…</div>}

          {edition !== 'ALL' && data && !error && <>
            <section className="md-stats" aria-label={`${label} statistics`}>
              <article className="md-stat"><span className="md-eyebrow">MATCHES PLAYED</span><strong>{stats?.totalMatches ?? 0}<Flag size={22} aria-hidden="true" /></strong><span className="md-stat-foot">{stats?.weeklyMatches ?? 0} this week</span></article>
              <article className="md-stat"><span className="md-eyebrow">WIN RATE</span><strong>{stats?.winRate ?? 0}<small>%</small></strong><span className="md-stat-foot">Your record in {FIFA_EDITIONS[edition].shortLabel}</span></article>
              <article className="md-stat"><span className="md-eyebrow">GOALS SCORED</span><strong>{stats?.goals ?? 0}<span className="md-goal-icon" aria-hidden="true">↗</span></strong><span className="md-stat-foot">Most played: {stats?.preferredOpponent ?? 'No opponent yet'}</span></article>
              <article className="md-stat md-form-stat"><span className="md-eyebrow">RECENT FORM · {stats?.formRate ?? 0}%</span><div className="md-form" aria-label="Recent form, oldest to newest">{recent.length ? recent.map(match => <span key={match.id} className={`md-result md-result-${result(match).toLowerCase()}`} aria-label={`${result(match)} against ${match.friend.name}`}>{result(match)[0]}</span>) : <span className="md-muted">No results yet</span>}</div><span className="md-stat-foot">{stats?.recentWins ?? 0} {stats?.recentWins === 1 ? 'win' : 'wins'} in your last {stats?.recentTotal ?? 0} {stats?.recentTotal === 1 ? 'match' : 'matches'}</span></article>
            </section>

            <div className="md-workspace">
              <section className="md-panel md-history" id="match-history" aria-labelledby="history-heading">
                <header className="md-panel-heading"><div><p className="md-eyebrow">THE FINAL WHISTLE</p><h2 id="history-heading">Match history <span className="md-count">{matches.length}</span></h2></div><ArrowDown size={18} aria-hidden="true" /></header>
                <div className="md-filters"><label className="md-search"><span className="md-sr-only">Search matches by friend or club</span><input type="search" placeholder="Search friend or club…" value={query} onChange={event => { setQuery(event.target.value); setExpanded(false); }} /></label><label><span className="md-sr-only">Filter by result</span><select aria-label="Filter by result" value={outcome} onChange={event => { setOutcome(event.target.value); setExpanded(false); }}><option>All results</option><option>Win</option><option>Draw</option><option>Loss</option></select></label></div>
                {matches.length === 0 ? <div className="md-empty"><Flag size={28} aria-hidden="true" /><h3>A new edition. A clean sheet.</h3><p>No matches recorded in {label} yet.<br />Upload your first screenshot or add a result manually.</p><button className="md-button md-button-secondary" onClick={onManual}><Plus size={16} aria-hidden="true" /> Record your first match</button></div> : filtered.length === 0 ? <p className="md-empty" role="status">No matches match these filters.</p> : <>
                  <ol className="md-match-list">{shown.map(match => <li key={match.id} className="md-match">
                    <div className="md-match-meta"><span className={`md-result md-result-${result(match).toLowerCase()}`} aria-label={result(match)}>{result(match)[0]}</span><div><strong>{match.friend.name}</strong><time dateTime={match.playedAt}>{matchDate(match.playedAt)}</time></div></div>
                    <div className="md-scoreline"><span>{match.playerClub}</span><strong aria-label={`${match.playerClub} ${match.playerScore}, ${match.opponentClub} ${match.opponentScore}`}>{match.playerScore}<span aria-hidden="true"> : </span>{match.opponentScore}</strong><span>{match.opponentClub}</span></div>
                    <div className="md-row-actions"><button onClick={() => onEditMatch(match)} aria-label={`Edit match against ${match.friend.name} on ${matchDate(match.playedAt)}`}>Edit</button><button className="md-destructive" onClick={() => onDeleteMatch(match)} aria-label={`Delete match against ${match.friend.name} on ${matchDate(match.playedAt)}`}>Delete</button></div>
                  </li>)}</ol>
                  {filtered.length > 8 && <button className="md-show-more" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show recent matches' : `View all ${filtered.length} matches`} <ArrowUpRight size={15} aria-hidden="true" /></button>}
                </>}
                <footer className="md-panel-foot">{label} history <span>YOUR RESULTS. YOUR LEGACY.</span></footer>
              </section>

              <section className="md-panel md-rivalries" id="rivalries" aria-labelledby="rivalries-heading">
                <header className="md-panel-heading"><div><p className="md-eyebrow">BETTER WITH FRIENDS</p><h2 id="rivalries-heading">The rivalries</h2></div><Users size={20} aria-hidden="true" /></header>
                <p className="md-rivalry-intro">Shared friends. A fresh record in {FIFA_EDITIONS[edition].shortLabel}.</p>
                <button className="md-button md-button-secondary md-add-friend" onClick={onAddFriend}><Plus size={17} aria-hidden="true" /> Add friend</button>
                {data.friends.length ? <ul className="md-friend-list">{data.friends.map(friend => {
                  const record = stats?.friendStats.find(item => item.id === friend.id);
                  return <li key={friend.id}><div className="md-friend-summary"><span className="md-avatar" aria-hidden="true">{friend.name.slice(0, 2).toUpperCase()}</span><div><h3>{friend.name}</h3><p>{record?.matches ?? 0} {record?.matches === 1 ? 'match' : 'matches'} <span aria-hidden="true">·</span> {record?.winRate ?? 0}% win rate</p></div></div><p className="md-friend-record">{record ? record.record : 'No rivalry results in this edition'}</p><div className="md-friend-actions"><button onClick={() => onEditFriend(friend)} aria-label={`Edit ${friend.name} across all editions`}>Edit friend</button><button className="md-destructive" onClick={() => onDeleteFriend(friend)} aria-label={`Delete ${friend.name} and their matches across all editions`}>Delete across editions</button></div></li>;
                })}</ul> : <p className="md-empty">Your next great rivalry starts here. Add a friend to get started.</p>}
                <p className="md-shared-note">Friends are shared across all editions. Deleting a friend removes their associated matches across all editions.</p>
              </section>
            </div>
          </>}
        </main>
        <footer className="md-footer"><span>matchday <span aria-hidden="true">/</span> {label}</span><span>FOR THE GAMES YOU REMEMBER.</span></footer>
        <div className="md-shared-controls">{children}</div>
      </div>
    </div>
  );
}
