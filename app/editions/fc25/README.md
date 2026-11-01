# FC25 presentation / T9

Default export: `ThemeDefinition` with `id: 'FC_25'`. Supply it to the frozen
`DashboardThemeProvider` around `DashboardShell`, keeping the shell's exact props.
The coordinator owns registry/page wiring. The stable root marker is
`.md-shell.fc25-theme[data-edition="FC_25"]`; the custom hero has
`.md-hero[data-theme="fc25"]`. All CSS overrides are scoped by the module root.

Reference: EA's [FC25 Career Mode deep dive, 7 August 2024](https://www.ea.com/games/ea-sports-fc/fc-25/news/pitch-notes-fc-25-career-mode-deep-dive),
specifically the [New Menu Visuals screenshot](https://drop-assets.ea.com/images/2x1PYfKD2jvUlGF9j629H1/b745fb2118d193490a17cece583358bf/FC_25_-_Career_Deep_Dive_-_New_Menu_Visuals.jpg).
The screenshot was visually inspected before implementation. Its charcoal facets,
white selected task, rounded cards, portrait media panel and lime corner label
inform this adaptation. Upload/manual actions form the task list; the media panel
contains an original CSS football ground. System sans typography approximates the
reference's broad headings without bundling a proprietary font. No player art,
remote assets, fetches, persistence or audio are included.

The hero keeps one h1, English action names, the original callbacks and disabled
semantics. Scenery is aria-hidden. The theme supplies focus outlines, 44px control
minimums, a stacked phone layout and reduced-motion overrides. DOM/focus order is
unchanged. Shared dialogs and controls remain the shell's children.

Validation: `npx vitest run tests/t9-fc25.test.ts` covers rendering through the
actual provider/shell, scope isolation, ALL behavior, callbacks, disabled actions
and Lightning CSS Module compilation. Lint only this module and the T9 tests;
run `npx next typegen`, generate this worktree's own Prisma client if needed, then
`npx tsc --noEmit --incremental false`. Client generation needs no DB connection.

After registry mounting and browser-slot allocation, the coordinator can run
`npx playwright test tests/browser/t9-fc25.spec.ts` using its allocated TEST_PORT
and the localhost test database URL with schema `t9`. That gate mocks API reads,
blocks writes, uses the native Current edition selector, exercises both hero
callbacks through the parent dialogs, checks 390/1280px overflow, control sizes,
focus and reduced motion, and saves full-page screenshots. It deliberately fails
if the theme is not mounted. No browser run or pixel-fidelity certification was
performed in this worker; visual fidelity and final CSS ordering remain part of
the coordinator's mounted browser/build gate.
