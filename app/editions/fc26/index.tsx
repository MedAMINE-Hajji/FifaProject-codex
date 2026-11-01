import { ArrowUpRight, Camera, Plus } from 'lucide-react';
import type { ThemeDefinition, ThemeHeroProps } from '../theme-contract';
import styles from './fc26.module.css';

function ConcourseBackdrop() {
  return (
    <div className={styles.concourse} aria-hidden="true">
      <div className={styles.roof} />
      <div className={styles.seating} />
      <div className={styles.touchline} />
    </div>
  );
}

export function FC26Hero({ label, totalMatches, disabled, onUpload, onManual }: ThemeHeroProps) {
  return (
    <section className={`md-hero ${styles.hero}`} aria-labelledby="fc26-heading">
      <div className={styles.scene} aria-hidden="true">
        <div className={styles.portal} /><div className={styles.rails} />
        <span className={styles.sceneCaption}>MATCHDAY / FC 26</span>
      </div>
      <div className={styles.copy}>
        <p className={styles.kicker}>{label} <span aria-hidden="true">/</span> Your match hub</p>
        <h1 id="fc26-heading">Every result.<br />A story of your own.</h1>
        <p className={styles.description}>Back to the pitch. Keep the score, remember the rivalry, and pick up where you left off.</p>
        <div className="md-actions">
          <button type="button" className="md-button md-button-primary" disabled={disabled} onClick={onUpload}>
            <Camera size={18} aria-hidden="true" /> Upload screenshot <ArrowUpRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className="md-button md-button-secondary" disabled={disabled} onClick={onManual}>
            <Plus size={18} aria-hidden="true" /> Add match manually
          </button>
        </div>
        <p className={styles.scope}>{totalMatches} {totalMatches === 1 ? 'match' : 'matches'} recorded <span aria-hidden="true">·</span> {label} only</p>
      </div>
    </section>
  );
}

// Primary references visually inspected: EA's FC 26 Manager Career menu and
// Manager Live "Road to Glory" hub, both embedded in:
// https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-career-mode-deep-dive
// Main menu: dark pitch, left navigation, bold sans-serif type, pill actions.
// Manager Live: concourse scenery, cyan selection outlines, purple action pills,
// compact rounded tiles. This adapts those cues, not the game's exact screens.
// All scenery is original CSS; no EA artwork, player likenesses, fonts or audio.
// Import this object inside the coordinator's client boundary (frozen v1 seam).
const fc26 = Object.freeze({
  id: 'FC_26',
  className: `${styles.theme} md-theme-fc26`,
  tokens: Object.freeze({
    '--md-background': '#090d16',
    '--md-foreground': '#f4f6fb',
    '--md-muted': '#b2bdce',
    '--md-accent': '#6fe8e1',
    '--md-accent-text': '#09191c',
    '--md-surface': '#141c2a',
    '--md-border': '#47546b',
    '--md-body-font': 'Arial, Helvetica, sans-serif',
    '--md-display-font': 'Arial, Helvetica, sans-serif',
    '--md-card-radius': '12px',
    '--md-card-shadow': '0 12px 30px #00000030',
    '--md-transition': '160ms ease-out',
  }),
  Backdrop: ConcourseBackdrop,
  Hero: FC26Hero,
} satisfies ThemeDefinition);

export default fc26;
