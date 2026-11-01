# Dashboard presentation integration (frozen v1)

Mount the default export from `DashboardShell.tsx` in the coordinator's client
orchestrator with **exactly** `DashboardShellProps` from
`lib/presentation-contracts.ts`. Records and mutation callbacks stay raw; the
shell translates their presentation into English. Dates use UTC calendar days.
The shell never fetches or writes data. `career` renders only on ALL; `children`
is the shared music/dialog slot. ALL exposes no match creation actions.

## Theme registration

Each edition directory exports a default `ThemeDefinition` from
`app/editions/theme-contract.ts`. FC27 is the standalone default. Registry
composition belongs to the coordinator. Inside a client boundary:

```tsx
<DashboardThemeProvider theme={selectedTheme}>
  <DashboardShell {...shellProps} />
</DashboardThemeProvider>
```

`DashboardThemeProvider` is a named export of `DashboardShell.tsx` (also available
from `ThemeProvider.tsx`). Pass theme objects inside a client boundary because
their renderer functions cannot cross server serialization.

The frozen definition contains:

- `id`: concrete edition identity; ALL reuses a registered concrete theme.
- `className`: root CSS Module class, with scoped layout overrides.
- `tokens`: background, foreground, muted, accent, accent-text, surface, border,
  body-font, display-font, card-radius, card-shadow, transition. Token names are
  prefixed `--md-`; see the exact required types in the contract.
- `Backdrop?`: receives `{ edition, label }`; decorative, noninteractive,
  automatically hidden from assistive technology by the shell.
- `Hero?`: receives `{ edition, label, totalMatches, disabled, onUpload,
  onManual }`; supply one h1 and accessible action buttons respecting disabled.
  The shell supplies a functional fallback when omitted and handles ALL itself.

Scope theme layout rules under the root class using `:global(.md-*)` selectors.
Stable hooks: `md-shell`, `md-container`, `md-topbar`, `md-brand`,
`md-edition-control`, `md-nav`, `md-hero`, `md-actions`, `md-button`,
`md-button-primary`, `md-button-secondary`, `md-stats`, `md-stat`, `md-workspace`,
`md-panel`, `md-panel-heading`, `md-history`, `md-match`, `md-scoreline`,
`md-rivalries`, `md-footer`, `md-shared-controls`. This permits different
backgrounds, typography, card structures, composition and transitions, beyond
palette changes. Preserve DOM focus order and visible focus. Shared legacy
`--fifa-*` dialog tokens inherit the selected presentation tokens.

## Coordinator acceptance gate

After mounting, allocate a browser run before executing:

```powershell
$env:TEST_PORT='3105'
$env:DATABASE_URL='postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t05'
npx playwright test tests/browser/t05-shell.spec.ts
```

The spec uses deterministic API presentation fixtures and both existing desktop
and phone projects. It checks scope selection/reload, raw score/date display,
search/result filters, empty states, aggregate creation exclusion, shared-friend
deletion disclosure, skip-link focus, reduced-motion layout and touch targets.
It saves a full-page screenshot in each test's output directory for visual QA.
It does not certify the parent dialogs or write APIs; the coordinator's complete
workflow gate must exercise those callback integrations.

No T05 browser run has been performed before coordinator mounting. No production
build is required in this worker. The coordinator owns root metadata/lang,
registry, mount, shared destructive confirmations, and final build/browser QA.
