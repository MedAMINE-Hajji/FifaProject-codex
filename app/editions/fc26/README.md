# FC 26 presentation / T10

Default export: `ThemeDefinition`, id `FC_26`. Supply it to the frozen
`DashboardThemeProvider` around `DashboardShell` inside the coordinator's client
boundary. No registry, shell, data, dialog, or audio changes are needed here.
The stable acceptance root is `.md-shell.md-theme-fc26[data-edition="FC_26"]`.

## Reference and interpretation

Visually inspected EA's **FC 26 Manager Career menu** and **Manager Live Road to
Glory** screenshots embedded in the official [Career Mode Deep Dive](https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-career-mode-deep-dive).

- [Main menu screenshot](https://drop-assets.ea.com/images/4IOr6Y72Cbn61IwIt0nD3p/2429a36c14aaf4cd378007f5b94c0210/fc26-career-dd-Manager_Career_-_FC_26_Menu.png): left navigation, dark scenic pitch, bold sans-serif lettering and pill action.
- [Manager Live screenshot](https://drop-assets.ea.com/images/17nDTwVSIeayEIh6mF45W9/df5e63dd54b1332ccfd093963b219d41/fc26-career-dd-Objectives_UCL_Road_to_Glory.png): concourse backdrop, compact rounded tiles, cyan selection outline and purple action pill.

Adaptation: desktop left navigation rail, original CSS concourse with tunnel
frames, compact bold typography, separate rounded statistic tiles, violet action
pill, cyan selection cues. Hover changes light/background rather than lifting
cards; reduced motion removes transitions. Phone navigation flows horizontally
in DOM order, cards become a two-column grid, and actions fill the hero width.
No copyrighted images, player likenesses, proprietary fonts or audio are bundled.
This is an interpretation of those particular menus, not a replica of every mode.

## Validation handoff

Targeted rendering gate: `npx vitest run tests/t10-theme.test.ts`.
Scoped lint: `npx eslint app/editions/fc26 tests/t10-theme.test.ts tests/browser/t10-theme.spec.ts`.
Type generation and check: `npx next typegen`, then `npx tsc --noEmit`.

Worker results: five rendering tests passed; scoped ESLint passed; Next typegen
and TypeScript passed. PostCSS parsed 71 rules and Vite's CSS Module compiler
successfully compiled all 14 local classes. Playwright discovery listed both
viewport cases without starting any server. These checks do not certify browser
layout or visual fidelity.

After registry mounting and browser slot allocation, run
`npx playwright test tests/browser/t10-theme.spec.ts --project=desktop` with an
allocated `TEST_PORT` and
`DATABASE_URL=postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t10`.
The spec sets explicit 390px and 1280px viewports, stubs all API traffic, checks
theme mounting, raw history, filters and scope switching, focus, touch heights,
reduced motion, overflow and dialog callbacks, and saves full-page screenshots.
It intentionally fails if the coordinator has not mounted this theme.

No heavy browser run or screenshot fidelity certification was performed in this
worker: central registry mounting and browser capacity belong to the coordinator.
No DB queries, paid analyzer calls, production build, or audio work is required.
