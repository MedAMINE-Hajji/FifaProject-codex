import type { ComponentType, CSSProperties } from 'react';
import type { ConcreteEdition, FifaEdition } from '@/lib/fifa-editions';

/** Frozen v1 presentation seam. Themes contain no fetching, music, or persistence.
 * Export a default ThemeDefinition from each edition directory. className may be
 * a CSS Module root; scope layout overrides beneath it using the md-* hooks.
 * Never hide/reorder interactive controls in a way that changes keyboard order.
 */
export type ThemeRenderContext = Readonly<{
  edition: FifaEdition;
  label: string;
}>;

export type ThemeHeroProps = ThemeRenderContext & Readonly<{
  totalMatches: number;
  disabled: boolean;
  onUpload: () => void;
  onManual: () => void;
}>;

export type ThemeTokens = CSSProperties & Readonly<{
  '--md-background': string;
  '--md-foreground': string;
  '--md-muted': string;
  '--md-accent': string;
  '--md-accent-text': string;
  '--md-surface': string;
  '--md-border': string;
  '--md-body-font': string;
  '--md-display-font': string;
  '--md-card-radius': string;
  '--md-card-shadow': string;
  '--md-transition': string;
}>;

export type ThemeDefinition = Readonly<{
  id: ConcreteEdition;
  className: string;
  tokens: ThemeTokens;
  /** Decorative only: shell wraps in aria-hidden, noninteractive container. */
  Backdrop?: ComponentType<ThemeRenderContext>;
  /** Use h1 and accessible upload/manual buttons; respect disabled on ALL. */
  Hero?: ComponentType<ThemeHeroProps>;
}>;
