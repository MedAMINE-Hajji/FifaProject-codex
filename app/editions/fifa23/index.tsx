'use client';

import { ArrowUpRight, Camera, Plus } from 'lucide-react';
import type { ThemeDefinition, ThemeHeroProps } from '../theme-contract';
import styles from './fifa23.module.css';

function FIFA23Backdrop() {
  return <div className={styles.backdrop} aria-hidden="true">
    <div className={styles.contours} /><div className={styles.ribbon} />
    <div className={styles.horizon} />
  </div>;
}

export function FIFA23Hero({ label, totalMatches, disabled, onUpload, onManual }: ThemeHeroProps) {
  return <section className={`md-hero ${styles.hero}`} aria-labelledby="fifa23-heading">
    <div className={styles.intro}>
      <p className={styles.eyebrow}>MATCHDAY / YOUR PERSONAL FOOTBALL ARCHIVE</p>
      <h1 id="fifa23-heading">{label}<span>Your game.<br />Your moments.</span></h1>
      <p className={styles.description}>Back to the matches that made it. Keep the score, remember the comeback, and pick up your rivalry.</p>
      <p className={styles.scope}>{label} only <span aria-hidden="true">/</span> {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} recorded</p>
    </div>
    <div className={styles.art} aria-hidden="true">
      <span className={styles.artCaption}>THE MATCHDAY ARCHIVE</span>
      <div className={styles.swoop} /><div className={styles.crosses} />
      <span className={styles.year}>23</span>
      <span className={styles.artFoot}>FOOTBALL. FRIENDS. MOMENTS.</span>
    </div>
    <div className={`md-actions ${styles.tiles}`}>
      <button type="button" className={`md-button md-button-primary ${styles.tile}`} disabled={disabled} onClick={onUpload}>
        <Camera size={28} aria-hidden="true" />
        <span><strong>Upload screenshot</strong><span>Bring the final whistle home</span></span>
        <ArrowUpRight size={24} aria-hidden="true" />
      </button>
      <button type="button" className={`md-button md-button-secondary ${styles.tile}`} disabled={disabled} onClick={onManual}>
        <Plus size={28} aria-hidden="true" />
        <span><strong>Add match manually</strong><span>Every result deserves a place</span></span>
        <ArrowUpRight size={24} aria-hidden="true" />
      </button>
    </div>
  </section>;
}

/** FIFA 23 interpretation, checked against EA's August 2022 menu imagery:
 * https://www.ea.com/ea-play/news/pitch-notes-fifa-23-fut-deep-dive
 * https://media.contentapi.ea.com/content/dam/ea/fifa/fifa-23/news/pitch-notes/commom/fut-deep-dive/01-moments-story.jpg.adapt.1456w.jpg
 * Charcoal rectangular tiles, orange selection edges/ribbons, ivory condensed
 * italic headings and blue status strips inform this original CSS composition.
 * EA describes the unified, information-forward menu here:
 * https://www.ea.com/ea-play/news/pitch-notes-fifa-23-career-deep-dive
 * System font approximations; no EA fonts, player art, logos or audio bundled.
 * Integration: DashboardThemeProvider theme={fifa23}, unchanged DashboardShell.
 * Root acceptance hook: .md-shell.fifa23-theme[data-edition="FIFA_23"]
 * with className=fifa23.className; hero hook: #fifa23-heading.
 */
const fifa23 = Object.freeze({
  id: 'FIFA_23',
  className: `fifa23-theme ${styles.theme}`,
  tokens: Object.freeze({
    '--md-background': '#161923',
    '--md-foreground': '#f5f2df',
    '--md-muted': '#c0c3cf',
    '--md-accent': '#ff9b36',
    '--md-accent-text': '#181b24',
    '--md-surface': '#242731',
    '--md-border': '#5b606e',
    '--md-body-font': 'Arial, Helvetica, sans-serif',
    '--md-display-font': 'Impact, "Arial Narrow", Arial, sans-serif',
    '--md-card-radius': '0px',
    '--md-card-shadow': '0 6px 0 #0c101833',
    '--md-transition': '160ms cubic-bezier(.16,1,.3,1)',
  }),
  Backdrop: FIFA23Backdrop,
  Hero: FIFA23Hero,
} satisfies ThemeDefinition);

export default fifa23;
