import type { ConcreteEdition, FifaEdition } from './fifa-editions';
import type { ThemeDefinition } from '@/app/editions/theme-contract';
import fifa22 from '@/app/editions/fifa22';
import fifa23 from '@/app/editions/fifa23';
import fc24 from '@/app/editions/fc24';
import fc25 from '@/app/editions/fc25';
import fc26 from '@/app/editions/fc26';
import fc27 from '@/app/editions/fc27';

export const EDITION_THEMES: Readonly<Record<ConcreteEdition, ThemeDefinition>> = {
  FIFA_22: fifa22, FIFA_23: fifa23, FC_24: fc24, FC_25: fc25, FC_26: fc26, FC_27: fc27,
};
export function getEditionTheme(edition: FifaEdition, lastConcrete: ConcreteEdition): ThemeDefinition {
  return EDITION_THEMES[edition === 'ALL' ? lastConcrete : edition];
}
