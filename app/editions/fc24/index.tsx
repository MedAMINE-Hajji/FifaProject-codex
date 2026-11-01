import { ArrowRight, Camera, Plus } from 'lucide-react';
import type { ThemeDefinition, ThemeHeroProps } from '../theme-contract';
import styles from './fc24.module.css';

function FC24Backdrop() {
  return <div className={styles.stadium} aria-hidden="true"><div className={styles.roof} /><div className={styles.pitch} /></div>;
}

export function FC24Hero({ label, totalMatches, disabled, onUpload, onManual }: ThemeHeroProps) {
  return (
    <section className={`md-hero ${styles.hero}`} data-theme="fc24" aria-labelledby="fc24-heading">
      <div className={styles.menu}>
        <p className={styles.edition}>{label} <span aria-hidden="true">/</span> matchday</p>
        <h1 id="fc24-heading">Welcome to<br />your club.</h1>
        <p className={styles.description}>Your friends. Your football. Every result has a place here.</p>
        <div className={`md-actions ${styles.actions}`}>
          <button type="button" className="md-button md-button-primary" disabled={disabled} onClick={onUpload}><Camera size={20} aria-hidden="true" /> Upload screenshot <ArrowRight size={20} aria-hidden="true" /></button>
          <button type="button" className="md-button md-button-secondary" disabled={disabled} onClick={onManual}><Plus size={20} aria-hidden="true" /> Add match manually <ArrowRight size={20} aria-hidden="true" /></button>
        </div>
        <p className={styles.record}>{totalMatches} {totalMatches === 1 ? 'match' : 'matches'} recorded <span aria-hidden="true">·</span> {label} only</p>
      </div>
      <div className={styles.scene} aria-hidden="true">
        <span className={styles.sceneCaption}>THE START OF SOMETHING NEW</span>
        <div className={styles.triangle} />
        <span className={styles.number}>24</span>
        <span className={styles.sceneFooter}>YOUR CLUB. YOUR RECORD.</span>
      </div>
    </section>
  );
}

// FC24 menu reference inspected: charcoal rectangular panels, condensed headings,
// cool stadium roof and pitch backdrop. Original CSS scenery, no EA assets bundled.
// https://www.ea.com/games/ea-sports-fc/news/fc24crossplayupdate
// https://media.contentapi.ea.com/content/dam/ea/fc/fc-24/common/news-crossplay/fc24-news-crossplay-club-squad-16x9.jpg.adapt.1920w.jpg
// FC's triangular design language (EA, 6 April 2023):
// https://www.ea.com/news/introducing-ea-sports-fc-the-next-chapter-of-the-worlds-game
// The menu rail, oversized 24 and green interaction states adapt the era to matchday;
// they are not a claim to reproduce a particular game screen pixel for pixel.
const fc24 = Object.freeze({
  id: 'FC_24',
  className: styles.theme,
  tokens: Object.freeze({
    '--md-background': '#101418',
    '--md-foreground': '#f5f6f2',
    '--md-muted': '#b8c1c6',
    '--md-accent': '#a3ff35',
    '--md-accent-text': '#102000',
    '--md-surface': '#191d20',
    '--md-border': '#485158',
    '--md-body-font': 'Arial, Helvetica, sans-serif',
    '--md-display-font': '"Arial Narrow", Impact, Arial, sans-serif',
    '--md-card-radius': '0px',
    '--md-card-shadow': 'none',
    '--md-transition': '140ms ease-out',
  }),
  Backdrop: FC24Backdrop,
  Hero: FC24Hero,
} satisfies ThemeDefinition);

export default fc24;
