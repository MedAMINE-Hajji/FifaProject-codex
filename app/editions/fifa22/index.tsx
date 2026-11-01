import { ArrowUpRight, Camera, Plus } from 'lucide-react';
import type { ThemeDefinition, ThemeHeroProps } from '../theme-contract';
import styles from './fifa22.module.css';

function FIFA22Backdrop() {
  return <div className={styles.scenery} aria-hidden="true"><div className={styles.ribbons} /><div className={styles.halftone} /></div>;
}

export function FIFA22Hero({ label, totalMatches, disabled, onUpload, onManual }: ThemeHeroProps) {
  return (
    <section className={`md-hero ${styles.hero}`} data-theme="fifa22" aria-labelledby="fifa22-heading">
      <div className={styles.archive}>
        <p className={styles.eyebrow}>MATCHDAY / PERSONAL FOOTBALL ARCHIVE</p>
        <h1 id="fifa22-heading">{label}<span>Your season.<br />Your story.</span></h1>
        <p className={styles.description}>Back to the matches that mattered. Keep every score and every rivalry from this edition together.</p>
        <p className={styles.record}>{totalMatches} {totalMatches === 1 ? 'match' : 'matches'} recorded <span aria-hidden="true">/</span> {label} only</p>
        <div className={styles.graphic} aria-hidden="true"><span>22</span><i /><b>FOOTBALL<br />NEVER STOPS.</b></div>
      </div>
      <div className={`md-actions ${styles.actions}`}>
        <button type="button" aria-label="Upload screenshot" className={`md-button md-button-primary ${styles.action}`} disabled={disabled} onClick={onUpload}>
          <Camera size={26} aria-hidden="true" /><span><strong>Upload screenshot</strong><span>Bring your result into matchday</span></span><ArrowUpRight size={22} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Add match manually" className={`md-button md-button-secondary ${styles.action}`} disabled={disabled} onClick={onManual}>
          <Plus size={26} aria-hidden="true" /><span><strong>Add match manually</strong><span>A score worth remembering</span></span><ArrowUpRight size={22} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

// Visual reference inspected: EA's August 2021 Career deep dive and its Manager
// Rating menu screenshot (slate geometric field, condensed type, acid highlights):
// https://www.ea.com/ea-originals/news/pitch-notes-fifa-22-career-mode-deep-dive
// https://media.contentapi.ea.com/content/dam/ea/fifa/fifa-21/news/common/pitch-notes/fifa-22-career-deep-dive/common/manager-rating-tutorial.jpg.adapt.crop16x9.320w.jpg
// This is a matchday adaptation, not a pixel reproduction. Tile composition and
// short focus transitions adapt the menu vocabulary; scenery is original CSS.
// No EA assets, remote fonts, audio, fetching or persistence are included.
const fifa22 = Object.freeze({
  id: 'FIFA_22',
  className: styles.theme,
  tokens: Object.freeze({
    '--md-background': '#202431',
    '--md-foreground': '#f7f8fc',
    '--md-muted': '#bec4d4',
    '--md-accent': '#d5f448',
    '--md-accent-text': '#202431',
    '--md-surface': '#292e40',
    '--md-border': '#5c647b',
    '--md-body-font': 'Arial, Helvetica, sans-serif',
    '--md-display-font': 'Impact, "Arial Narrow", Arial, sans-serif',
    '--md-card-radius': '0px',
    '--md-card-shadow': '0 8px 0 #15192640',
    '--md-transition': '140ms ease-out',
  }),
  Backdrop: FIFA22Backdrop,
  Hero: FIFA22Hero,
} satisfies ThemeDefinition);

export default fifa22;
