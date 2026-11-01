import { ArrowUpRight, Camera, Plus } from 'lucide-react';
import type { ThemeDefinition, ThemeHeroProps } from '../theme-contract';
import styles from './fc27.module.css';

function StadiumBackdrop() {
  return <div className={styles.stadium}><div className={styles.floodlights} /><div className={styles.terraces} /><div className={styles.pitch} /></div>;
}

export function FC27Hero({ edition, label, totalMatches, disabled, onUpload, onManual }: ThemeHeroProps) {
  return (
    <section className={`md-hero ${styles.hero}`} aria-labelledby="edition-headline">
      <div className={styles.copy}>
        <p className="md-eyebrow"><span className={styles.dot} /> YOUR GAME. YOUR RECORD.</p>
        <h1 id="edition-headline">For the love<br />of the <em>game.</em></h1>
        <p className={styles.description}>The final whistle is just the beginning. Keep every result, build your rivalries, and make this edition yours.</p>
        <div className="md-actions">
          <button className="md-button md-button-primary" disabled={disabled} onClick={onUpload}><Camera size={18} aria-hidden="true" /> Upload screenshot <ArrowUpRight size={18} aria-hidden="true" /></button>
          <button className="md-button md-button-secondary" disabled={disabled} onClick={onManual}><Plus size={18} aria-hidden="true" /> Add match manually</button>
        </div>
        <p className={styles.scope}>{label} only <span aria-hidden="true">/</span> {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} recorded</p>
      </div>
      <div className={styles.art} aria-hidden="true">
        <div className={styles.orbit} /><span className={styles.artLabel}>FOOTBALL / FRIENDS / FOREVER</span>
        <span className={styles.monogram}>{edition.startsWith('FIFA') ? 'FIFA' : 'FC'}<b>{edition.split('_').at(-1)}</b></span>
        <div className={styles.ball}><svg viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="53" /><path d="m60 36 23 17-9 27H46l-9-27 23-17Zm0 0V7M37 53 10 45m36 35-17 23m45-23 17 23m-8-50 27-8M23 22l14 31m60-31L83 53M29 103l17-23m45 23L74 80" /></svg></div>
        <span className={styles.artFooter}>THE NEXT CHAPTER IS YOURS <ArrowUpRight size={18} /></span>
      </div>
    </section>
  );
}

// Adapted from EA's FC27 football-ground and atmospheric Career presentation.
// References: https://www.ea.com/games/ea-sports-fc/fc-27
// https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-career-mode-deep-dive
// Original CSS/SVG scenery; no third-party imagery or soundtrack is bundled.
const fc27 = Object.freeze({
  id: 'FC_27',
  className: styles.theme,
  tokens: Object.freeze({
    '--md-background': '#080e0d',
    '--md-foreground': '#f3f6ed',
    '--md-muted': '#a8b7ae',
    '--md-accent': '#c2ff52',
    '--md-accent-text': '#101a07',
    '--md-surface': 'rgba(17, 28, 24, .94)',
    '--md-border': '#35443b',
    '--md-body-font': 'Arial, Helvetica, sans-serif',
    '--md-display-font': 'Impact, "Arial Narrow", sans-serif',
    '--md-card-radius': '3px',
    '--md-card-shadow': '0 16px 45px #0003',
    '--md-transition': '180ms cubic-bezier(.2,.8,.2,1)',
  }),
  Backdrop: StadiumBackdrop,
  Hero: FC27Hero,
} satisfies ThemeDefinition);

export default fc27;
