## Problem Statement

matchday tracks FIFA/EA Sports FC matches against friends, but the original application presents one shared history in a generic dashboard. The player has played since FIFA 22 and wants each game edition to feel like a distinct era, with its own authentic menu atmosphere, matches, statistics, and music. Mixing editions makes historical results and rivalries misleading.

The Codex redesign must preserve the existing match-tracking capabilities while introducing edition-specific experiences and an explicit combined career overview. This specification belongs to the Codex comparison repository. Publishing it does not authorize implementation, deployment, or database changes.

## Solution

Keep one application named **matchday**, with an English interface and six selectable game editions: FIFA 22, FIFA 23, EA Sports FC 24, EA Sports FC 25, EA Sports FC 26, and EA Sports FC 27. Each fresh application visit opens the latest supported edition, currently FC 27. An accessible edition selector allows the player to revisit older editions directly from the dashboard; a game-library landing screen is not required.

Selecting an edition changes both the visual experience and the scope of its match history, dashboard statistics, and rivalry records. Each edition should recognizably evoke that game's actual menus through backgrounds, typography, colors, cards, and transitions, rather than changing only an accent color. Preserve familiar match-tracking actions and adapt the layout for phones and desktop screens.

Friends have shared identities across editions. An optional All editions career overview combines lifetime results and compares editions explicitly. Existing legacy matches belong to FC 27. Screenshot uploads belong to the edition selected when the upload begins and use the upload date. Manual match entry belongs to the selected edition and uses the date chosen by the user.

Each edition has exactly one user-supplied looping MP3 track. Attempt playback at 15% volume, provide a Play music fallback when autoplay is blocked, and expose persistent volume and play/pause controls. Fade between edition tracks, preserve a deliberate pause, and pause when the application enters the background. Missing audio must not interfere with match tracking.

## User Stories

1. As a player, I want the application to open directly on the latest supported edition, so that my current game is immediately available.
2. As a returning player, I want a fresh visit to open FC 27 even if I previously browsed FIFA 22, so that the initial screen consistently represents the latest game.
3. As a player, I want to select any edition from FIFA 22 through FC 27, so that I can revisit my complete playing history.
4. As a player, I want the selected edition to remain clearly visible, so that I know which game's records I am viewing.
5. As a player, I want each edition to evoke its original game menus, so that revisiting an older edition feels connected to that era.
6. As a player, I want distinctive backgrounds, typography, cards, colors, and transitions for each edition, so that the designs differ beyond a color swap.
7. As a player, I want core actions to remain recognizable between editions, so that visual changes do not make match tracking difficult.
8. As a player, I want the application name to remain matchday, so that all editions feel connected to the same personal archive.
9. As an English-speaking player, I want navigation, forms, dates, statistics, errors, and music controls in English, so that the interface is consistent.
10. As a phone user, I want readable statistics and usable touch controls, so that I can check results between games.
11. As a phone user, I want to upload a screenshot from my photo library or camera, so that recording a result remains convenient.
12. As a desktop user, I want an expansive game-menu presentation, so that the dashboard feels immersive on a larger screen.
13. As a keyboard user, I want accessible navigation and visible focus, so that edition selection, forms, and music controls are usable without a mouse.
14. As a player sensitive to motion, I want decorative transitions to respect reduced-motion preferences, so that the interface remains comfortable.
15. As a player, I want each edition's history to contain only its own matches, so that records from different games do not mix.
16. As a player, I want every statistic on an edition dashboard to use that same edition's matches, so that the dashboard is internally consistent.
17. As a player, I want recent form and opponent records scoped to the selected edition, so that my current game's performance is accurate.
18. As a player, I want an empty edition to show an honest empty state and zero totals, so that other editions' results are not presented as its history.
19. As a player with existing records, I want my legacy matches assigned to FC 27 without losing information, so that the redesign starts with the correct history.
20. As a player, I want to upload a result inside the selected edition, so that I do not have to reclassify every screenshot.
21. As a player, I want a FIFA 22 upload to remain in FIFA 22 even when uploaded in 2026, so that calendar dates never determine game identity.
22. As a player, I want an upload's edition to remain stable while I review the extracted result, so that changing the visible dashboard does not silently move the pending match.
23. As a player, I want uploaded matches dated when the photo is uploaded, so that the application follows my chosen recording convention.
24. As a player, I want to review AI-extracted clubs, scores, and opponent details before saving, so that I can correct extraction mistakes.
25. As a player, I want failed analysis or saving to leave my existing records intact, so that an unsuccessful upload does not damage my history.
26. As a player, I want to enter a match manually without a screenshot, so that I can record old results I remember.
27. As a player, I want to choose the date of a manually entered match, so that historical results appear on the correct day.
28. As a player, I want that chosen date preserved after saving and reloading, so that timezone conversion does not move my match to another day.
29. As a player, I want manual entries saved into the selected edition independently of their date, so that I can enter an old game's result accurately.
30. As a player, I want manual and uploaded matches to use consistent validation and contribute equally to statistics, so that totals do not depend on entry method.
31. As a player, I want existing match editing and deletion to continue working, so that I can maintain accurate records.
32. As a player, I want statistics refreshed after creating, editing, or deleting a match, so that the visible results stay accurate.
33. As a player, I want the same friend to appear across editions under one identity, so that I do not create duplicate people for each game.
34. As a player, I want separate rivalry records against that friend for each edition, so that I can compare how our competition evolved.
35. As a player, I want to select an existing friend when adding a result in another edition, so that shared identities remain convenient.
36. As a player, I want destructive friend actions to explain their cross-edition effects before confirmation, so that shared history is not removed unexpectedly.
37. As a player, I want an optional All editions overview, so that I can see my lifetime match record explicitly.
38. As a player, I want edition comparisons alongside combined totals, so that I can compare performance between games.
39. As a player, I want career totals to count every match exactly once, so that the combined overview is trustworthy.
40. As a player, I want the career overview clearly distinguished from a game edition, so that I cannot accidentally save a match into an aggregate view.
41. As a player, I want one song associated with each edition, so that its music reinforces its identity.
42. As a player, I want that song to loop, so that browsing does not end in silence after one playthrough.
43. As a player, I want music to attempt autoplay at low volume, so that the menu atmosphere starts automatically where supported.
44. As a player whose browser blocks autoplay, I want a visible Play music control, so that I can start playback with one action.
45. As a player, I want volume and play/pause controls available throughout the experience, so that I can manage the sound at any time.
46. As a player, I want my sound preferences remembered, so that switching editions does not reset my volume or override a deliberate pause.
47. As a player, I want switching editions to fade into the next edition's single song, so that transitions feel smooth without overlapping tracks.
48. As a player, I want music paused while the app is in the background, so that it does not continue unexpectedly while I use another app.
49. As a player, I want the dashboard to remain fully usable when an MP3 is missing or unreadable, so that music availability does not block tracking matches.
50. As a repository owner, I want to supply the audio using agreed filenames, so that I can add the songs without editing application code.

## Implementation Decisions

- Treat an **edition** as a game release, not a calendar year or a competitive season. Use stable edition identities for FIFA 22, FIFA 23, and FC 24 through FC 27. All editions is an aggregate view and is never a valid stored match edition.
- Centralize edition identity, display name, visual theme, audio association, and latest-edition designation in one edition catalog. Default a fresh application visit to FC 27; retain the current selection during that visit. Updating which edition is latest is an explicit catalog change, not automatic external release discovery.
- Keep one application and shared match-tracking workflows. Add edition-specific visual treatments through the catalog and presentation layer rather than duplicating the whole application per game.
- Extend match persistence with a validated edition association. Preserve globally shared friend identities and existing match relationships. Do not create separate databases or friend copies for each edition.
- Migrate the confirmed legacy match cohort to FC 27 while preserving identifiers, friend links, clubs, scores, optional statistics, and existing timestamps. Make the migration repeatable without duplicating records. If partial edition work has already given legacy records an incorrect default, repair only the identified legacy cohort; do not blindly overwrite genuine subsequently classified matches.
- Modify match listing and statistics together: explicit edition scope returns only matching records and derives all dashboard aggregates and rivalry records from that set. All editions scope returns the union once and provides per-edition comparison data. Preserve existing statistic definitions unless the edition scope or English presentation requires a change.
- Require a valid concrete edition for creating a match. Reject invalid editions and aggregate-view identities rather than silently falling back to FIFA 22 or mixing scopes. Starting an entry from the career overview must require choosing a concrete edition.
- Capture a screenshot upload's selected edition and server-recorded upload time when upload begins. Carry them through analysis, review, and saving. Neither image metadata, extracted dates, nor the edition selected later during review may silently override that captured context.
- Preserve screenshot analysis and human confirmation before saving. The image analyzer identifies valid FIFA/EA FC results and extracts match information; it does not decide edition ownership from a calendar date.
- Add manual match entry using the selected edition, a user-managed match date, friend selection or creation, clubs, scores, and the existing optional match statistics. The chosen date is required, validated, and preserved as the same calendar day across save/reload. Entry mode explicitly distinguishes this user-selected date from the server-assigned upload date.
- Keep match creation time separate from the recorded match date. Preserve existing match dates when unrelated fields are edited. Use recorded match dates consistently for history order and date-dependent statistics.
- Reuse the existing match validation behavior for both entry methods. Keep optional possession and shots optional, reject implausible required scores, and report actionable validation errors in English.
- Preserve match and friend management. Friend identities remain global; any friend deletion that removes associated matches must explicitly disclose that those effects span editions. This spec does not introduce a new account or friend-archiving model.
- Refresh affected edition and career data after mutations. Prevent stale responses from a previous edition from replacing the currently selected dashboard during rapid switching.
- Translate user-facing navigation, messages, labels, date presentation, result abbreviations, and form feedback into English while retaining matchday as the product name.
- Use responsive layouts with accessible labels, keyboard-operable controls, visible focus, readable contrast, touch-friendly controls, and reduced-motion support. Visual authenticity must preserve usability of the core actions.
- Use a shared music player driven by the concrete edition's single audio association. Loop the track, attempt initial playback at 15% volume, and expose play/pause, volume, and track information. Saved volume and deliberate pause preferences take precedence over initial defaults.
- Handle rejected autoplay by displaying Play music without blocking the dashboard. Fade out the outgoing track before starting the incoming edition track; do not overlap songs or restart playback after a deliberate user pause. Pause on backgrounding, retaining the distinction between an automatic pause and a user pause.
- The career overview is not a seventh soundtrack edition. Retain the previous concrete edition's audio association when entering it; a fresh visit still starts in FC 27.
- Missing, unreadable, or unsupported audio must produce a quiet, nonblocking unavailable state. Do not continuously retry failed playback, fake playing status, or use another edition's song as a hidden fallback.
- The user supplies audio files. Application work wires the agreed public URLs and controls; downloading, generating, selecting replacement recordings, or committing the user's audio files is not part of this specification's implementation authorization. Track title and artist metadata must reflect the supplied recording, and duration must come from actual media metadata rather than guessed values.
- Respect existing unrelated or overlapping work in the checkout. Review partial edition implementation against this specification; its current defaults, labels, and audio associations are not accepted requirements merely because they already exist.

## Testing Decisions

- Proposed primary test boundary: the existing public match HTTP API. Exercise externally observable request/response and persisted outcomes for edition isolation, statistics, write validation, date handling, and legacy migration. Prefer this boundary to testing internal filtering helpers, ORM call sequences, or component state.
- Complement API coverage with browser-level acceptance checks of the rendered application for edition selection, themes, mobile and desktop layout, English copy, manual entry, screenshot review, and audio controls. Real browser behavior is necessary to verify autoplay restrictions, media errors, focus, and visibility changes; API tests alone cannot establish these behaviors.
- Reuse existing Vitest route-test and match-validation patterns as prior art. The current analyzer tests already submit multipart requests to a route and replace the external AI provider with deterministic responses. Preserve and extend the existing plausibility-validation coverage rather than duplicating it.
- Use an isolated test database or equivalent test fixture at the persistence boundary to seed multiple editions sharing one friend. Avoid a fake that merely repeats the expected filtering algorithm. No test may mutate the user's production data or call a live paid AI provider.
- Verify the legacy backfill preserves every legacy record and its fields, assigns FC 27 correctly, does not overwrite genuine classified records outside the legacy cohort, and remains correct when repeated. An empty database must also remain valid.
- Create records in multiple editions, including dates that do not correspond to release years. Verify histories, every aggregate, recent form, and friend records are isolated; verify the career union and comparison data count each match once.
- Verify missing, invalid, and aggregate-view editions cannot be stored through either creation mode. Verify an empty edition displays zero totals rather than another edition's data.
- Fix time in tests and cross a day boundary between upload, review, and saving. Verify screenshot records retain upload time; manual records retain the user's chosen date; edition ownership is independent of both. Verify unrelated edits preserve existing dates and edition assignment.
- Verify create, edit, and delete operations update relevant edition and career statistics. Include rapid edition switching with delayed responses to catch stale data replacing the active dashboard.
- In browser acceptance checks, verify a fresh visit opens FC 27 after a previous visit to another edition; verify all six themes remain recognizably distinct and core workflows work at phone and desktop widths.
- Exercise audio using short local test fixtures rather than relying on the owner's real songs. Verify exact edition URL selection, looping, 15% initial volume, remembered preferences, manual pause across switching, fade transitions, background pause, autoplay rejection, and missing or invalid media. Verify visible playback state reflects actual media outcomes.
- Verify accessibility behavior through rendered controls, focus order, keyboard interaction, labels, and reduced-motion behavior. Assess visual fidelity with screenshots or visual review at representative viewport sizes; avoid brittle tests of CSS class names or implementation details.
- The user confirmed these API and browser test boundaries before publication. This decision does not imply that test code has already been implemented or executed.

## Out of Scope

- Implementing the redesign, running schema migrations, changing live data, or deploying the application as part of publishing this spec.
- Changes to the Gemini comparison repository or publishing this spec to the original baseline repository.
- New authentication, multiple accounts, game-server integration, automatic PlayStation result synchronization, online gameplay, or tournament systems.
- Calendar-year-based edition assignment, nested competitive seasons, and inferring edition identity from screenshot or upload dates.
- A mandatory game-library landing screen or reopening the last selected edition instead of the latest supported one.
- Dynamic discovery of future releases, editions earlier than FIFA 22, and an additional career-overview soundtrack.
- Playlists, shuffle, multiple songs per edition, streaming-service integrations, downloading audio, generating music, and guaranteed audible autoplay where a browser blocks it.
- Building a pixel-for-pixel replica of every screen from the original games. The target is recognizable edition-specific menu identity adapted to matchday's workflows.
- Refactoring unrelated application behavior or discarding existing work in progress.

## Further Notes

- Publication target: **MedAMINE-Hajji/FifaProject-codex**, with the **ready-for-agent** triage label. This is the separate Codex comparison repository; the baseline repository remains a reference.
- The user will supply one MP3 per edition in the application's public audio directory. The stable browser URL contract and proposed recordings from the design conversation are:

| Edition | Audio URL | Proposed song | Artist |
| --- | --- | --- | --- |
| FIFA 22 | `/audio/fifa22.mp3` | I Don't Wanna Talk (I Just Wanna Dance) | Glass Animals |
| FIFA 23 | `/audio/fifa23.mp3` | Baby Queen | Gorillaz |
| EA Sports FC 24 | `/audio/fifa24.mp3` | adore u | Fred again.., Obongjayar |
| EA Sports FC 25 | `/audio/fifa25.mp3` | She's Gone, Dance On | Disclosure |
| EA Sports FC 26 | `/audio/fifa26.mp3` | Girl Like Me | PinkPantheress |
| EA Sports FC 27 | `/audio/fifa27.mp3` | Dance Dance Dance | Barry Can't Swim |

- The conversation suggested one soundtrack choice per edition, but the supplied files determine the actual recording and displayed metadata. No audio download is required to publish or implement the URL wiring, and absent files must degrade gracefully.
- Current checkout inspection found partial edition-related work alongside existing modifications: edition filtering and presentation components exist, but defaults still favor FIFA 22, interface text remains French, and multiple edition configurations point at the same FIFA 22 track. These are observations of unfinished local work, not proof that this specification is already implemented or verified.
- Browsers may require user interaction before audible playback. The agreed behavior is an autoplay attempt with a visible fallback, not bypassing browser policy.
- The owner's earlier instruction to defer implementation remains in effect. The ready-for-agent label communicates specification readiness, not authorization to begin code or database changes in this chat.
