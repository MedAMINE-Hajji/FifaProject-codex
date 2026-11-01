# T7 / FIFA 23 presentation

Default export: `ThemeDefinition`, `id: 'FIFA_23'`. Supply it to
`DashboardThemeProvider` around the unchanged `DashboardShell` inside the
coordinator's client boundary. The coordinator owns registration.

Stable acceptance root: `.md-shell.fifa23-theme[data-edition="FIFA_23"]`.
The scoped CSS Module class is also supplied through `className`. The hero uses
`#fifa23-heading`; select the edition with the native `Current edition` control
and value `FIFA_23`.

## Reference and interpretation

Primary sources inspected on 1 November 2026:

- [EA FIFA 23 FUT Deep Dive (August 2022)](https://www.ea.com/ea-play/news/pitch-notes-fifa-23-fut-deep-dive)
- [EA's FUT Moments menu screenshot, viewed in the browser](https://media.contentapi.ea.com/content/dam/ea/fifa/fifa-23/news/pitch-notes/commom/fut-deep-dive/01-moments-story.jpg.adapt.1456w.jpg)
- [EA FIFA 23 Career Deep Dive, Main Menu Experience](https://www.ea.com/ea-play/news/pitch-notes-fifa-23-career-deep-dive)

The screenshot shows rectangular charcoal tiles, ivory condensed italic
headings, orange selection edges and sweeping ribbons, blue status strips and
small scattered marks. This adaptation uses that vocabulary for matchday's
action tiles, separated statistics tiles, panel headers and original CSS scenery.
The Career notes support bringing useful information forward in a unified menu.
System fonts approximate the typography. This is an interpretation of that era,
not an exact replica; no player art, EA fonts, logos or audio are included.

## Behavior and accessibility

Upload and manual entry forward their supplied callbacks unchanged. Both are
native buttons, respect `disabled`, and remain in visual/DOM order. The shell
retains edition selection, raw records, filters, match/friend actions and shared
dialog/music slots. There is no theme-owned fetching, persistence or playback.

One h1, hidden decorative scenery, visible focus, contrasting solid surfaces,
44px minimum shared action targets and stacked phone tiles are provided. The
only entrance animation runs on desktop with no reduced-motion preference;
reduced motion disables transitions and animations throughout this theme root.
No shared CSS or integration contract changes are required.

## Validation and coordinator acceptance

Worker checks: six T7 rendering/CSS tests, scoped ESLint, CSS Modules compilation
with Lightning CSS, and `next typegen` followed by `tsc --noEmit`. Dependencies
and Prisma client are local to this worktree; client generation does not query
the database. Only T7 tests are run.

`tests/browser/t7-fifa23.spec.ts` is the coordinator's integration acceptance
gate after registration. It uses deterministic intercepted GET responses,
blocks fixture writes/analysis, selects native edition values, and checks this
theme root, records, a single h1, keyboard workflows, focus, reduced motion,
44px targets, edition switching and full-page screenshots at 390px and 1280px.
Allocate a browser slot first and supply an allocated `TEST_PORT`; if a database
URL is required by server startup, use only
`postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t7`.
Run `npx playwright test tests/browser/t7-fifa23.spec.ts`.

Browser tests and visual fidelity at those widths remain unverified by this
worker. No production build, whole-suite DB run, registry mounting or GitHub
write is part of this handoff.
