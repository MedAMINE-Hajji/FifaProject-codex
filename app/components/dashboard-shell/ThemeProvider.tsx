'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ThemeDefinition } from '@/app/editions/theme-contract';
import fc27 from '@/app/editions/fc27';

const ThemeContext = createContext<ThemeDefinition>(fc27);

/** Coordinator supplies its registry selection here, inside a client boundary.
 * DashboardShell keeps exactly DashboardShellProps. FC27 is the standalone default.
 */
export function DashboardThemeProvider({ theme, children }: {
  theme: ThemeDefinition;
  children?: ReactNode;
}) {
  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

export function useDashboardTheme() {
  return useContext(ThemeContext);
}
