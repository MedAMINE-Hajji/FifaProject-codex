# FIFA 22 presentation / T6

Default export `index.tsx` implements the frozen `ThemeDefinition` with identity
`FIFA_22`. Supply it to `DashboardThemeProvider` inside the coordinator's client
boundary and render `DashboardShell` with its unchanged props. Registry and page
wiring are deliberately coordinator-owned.

The theme root is the exported CSS Module `className` on `.md-shell`; the shell
must have `data-edition="FIFA_22"`. The Hero marker is `[data-theme="fifa22"]`.
All global shell overrides live beneath the local `.theme` class. The Backdrop
and Hero artwork are decorative. All scenery is original CSS; there are no
downloaded assets, remote fonts, audio, data requests or persistence operations.

## Reference and interpretation

EA's [August 2021 Career Mode deep dive](https://www.ea.com/ea-originals/news/pitch-notes-fifa-22-career-mode-deep-dive)
includes the [Manager Rating menu screenshot](https://media.contentapi.ea.com/content/dam/ea/fifa/fifa-21/news/common/pitch-notes/fifa-22-career-deep-dive/common/manager-rating-tutorial.jpg.adapt.crop16x9.320w.jpg),
which was inspected in the browser. Its slate geometric backdrop, narrow uppercase
headings and yellow-green highlights inform this presentation. This targets the
Career menu vocabulary, rather than claiming every FIFA 22 mode used one design.
The archive tile, stacked action tiles, separated statistics tiles, oversized 22
and short focus/hover transitions are matchday adaptations. They are not a literal
copy of an EA screen or a claim about the precise original animation timing.

## Acceptance

`npx vitest run tests/t6-fifa22.test.ts` checks provider/shell rendering, one h1,
raw score/date display, aggregate exclusion, stale scope handling, shared controls,
callback identity, disabled actions, CSS parsing/scoping and text contrast.

After registry mounting and browser-slot allocation, run
`npx playwright test tests/browser/t6-fifa22.spec.ts` with an allocated `TEST_PORT`
and `DATABASE_URL=postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t6`.
The browser spec intercepts match reads and rejects writes. It selects native
`Current edition` values, checks the root contract, filters, edition isolation,
upload/manual dialog callbacks, focus visibility, reduced motion, 44px controls,
390px/1280px overflow and full-page screenshots. No browser run was performed
before coordinator mounting; viewport layout and visual fidelity remain for that
integration gate. Production build belongs to the coordinator.
