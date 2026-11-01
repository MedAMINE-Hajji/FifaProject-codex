import { ArrowUpRight, Camera, Plus } from 'lucide-react';
import type { ThemeDefinition, ThemeHeroProps } from '../theme-contract';
import styles from './fc25.module.css';

function FacetedBackdrop() {
  return <div className={styles.facets} aria-hidden="true"><div /><div /><div /></div>;
}

export function FC25Hero({ label, totalMatches, disabled, onUpload, onManual }: ThemeHeroProps) {
  return (
    <section className={`md-hero ${styles.hero}`} data-theme="fc25" aria-labelledby="fc25-headline">
      <div className={styles.central}>
        <p className={styles.kicker}>{label} / YOUR MATCHDAY HUB</p>
        <h1 id="fc25-headline">Welcome to<br />your club.</h1>
        <p className={styles.summary}>Your friends. Your results. Every match counts.</p>
        <p className={styles.taskLabel}>Record a result</p>
        <div className={`md-actions ${styles.tasks}`}>
          <button type="button" aria-label="Upload screenshot" className={`md-button md-button-primary ${styles.task}`} disabled={disabled} onClick={onUpload}>
            <Camera size={30} aria-hidden="true" />
            <span><strong>Upload screenshot</strong><small>Capture the final whistle</small></span>
            <ArrowUpRight size={22} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Add match manually" className={`md-button md-button-secondary ${styles.task}`} disabled={disabled} onClick={onManual}>
            <Plus size={30} aria-hidden="true" />
            <span><strong>Add match manually</strong><small>Put your result on the record</small></span>
            <ArrowUpRight size={22} aria-hidden="true" />
          </button>
        </div>
        <p className={styles.scope}>{totalMatches} {totalMatches === 1 ? 'match' : 'matches'} recorded <span aria-hidden="true">·</span> {label} only</p>
      </div>
      <div className={styles.feature} aria-hidden="true">
        <span className={styles.tag}>FC 25</span>
        <div className={styles.ground}><div className={styles.roof} /><div className={styles.stands} /><div className={styles.pitch}><i /><b /></div></div>
        <div className={styles.featureCopy}><span>MATCHDAY / CLUB JOURNAL</span><p>The game ends.<br />The story stays.</p><span>YOUR PERSONAL FOOTBALL ARCHIVE <ArrowUpRight size={16} /></span></div>
      </div>
    </section>
  );
}

// Visual reference inspected: EA's 7 August 2024 Career Mode deep dive,
// "New Menu Visuals and Social Media": charcoal facets, white selected task,
// rounded task rows and a portrait media tile with a lime corner label.
// https://www.ea.com/games/ea-sports-fc/fc-25/news/pitch-notes-fc-25-career-mode-deep-dive
// https://drop-assets.ea.com/images/2x1PYfKD2jvUlGF9j629H1/b745fb2118d193490a17cece583358bf/FC_25_-_Career_Deep_Dive_-_New_Menu_Visuals.jpg
// Adapted for matchday, not a replica: original CSS ground, system fonts,
// no EA/player artwork, remote assets, fetching, persistence or audio.
const fc25 = Object.freeze({
  id: 'FC_25',
  className: `${styles.theme} fc25-theme`,
  tokens: Object.freeze({
    '--md-background': '#17181c',
    '--md-foreground': '#f7f7f5',
    '--md-muted': '#b9bbc0',
    '--md-accent': '#d7ff62',
    '--md-accent-text': '#171b0e',
    '--md-surface': '#25262b',
    '--md-border': '#51535b',
    '--md-body-font': 'Arial, Helvetica, sans-serif',
    '--md-display-font': 'Arial, Helvetica, sans-serif',
    '--md-card-radius': '14px',
    '--md-card-shadow': '0 12px 32px #0002',
    '--md-transition': '150ms ease-out',
  }),
  Backdrop: FacetedBackdrop,
  Hero: FC25Hero,
} satisfies ThemeDefinition);

export default fc25;
