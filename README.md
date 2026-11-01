# matchday — Codex edition

Your personal FIFA / EA Sports FC history, from FIFA 22 through FC 27. Each game has its own presentation, matches, statistics and rivalries; Career overview combines all editions. The interface is in English and adapts to phones and desktop screens.

This repository is the Codex redesign comparison version. The original comparison repository and its working checkout are maintained separately.

## Run locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and configure your own PostgreSQL connection. Environment files stay local.
3. Generate the client with `npm run db:generate`.
4. For a **new, empty development database**, create its tables with `npm run db:push`. Review schema changes and back up existing databases before applying anything to them.
5. Start with `npm run dev` and open [localhost:3000](http://localhost:3000).

Manual entry works without an AI provider. Screenshot analysis requires a configured vision-capable provider with a compatible chat-completions endpoint. No credentials or existing environment files are bundled.

## Match recording

- Every fresh visit opens FC 27. The selector changes both presentation and record scope.
- Uploads belong to the edition selected when uploading starts. Their date is the server-recorded upload time, retained through review.
- Manual entries belong to the selected edition and use the date you choose. Recorded calendar dates display consistently in UTC.
- Review photo extraction before saving. You can edit clubs, scores, optional statistics and the friend name.
- Friends are shared globally. Their edition records remain separate. Deleting a friend removes their associated matches across all editions, after explicit confirmation.
- Career overview combines lifetime records and provides per-edition comparisons. Recording a match there requires choosing a concrete edition.
- Match edits keep the recorded date unless an explicit date-changing feature is added.

## Soundtracks

Supply your own recordings in `public/audio/`. These files are served directly and remain outside Git.

| Edition | Filename | Browser URL |
| --- | --- | --- |
| FIFA 22 | fifa22.mp3 | /audio/fifa22.mp3 |
| FIFA 23 | fifa23.mp3 | /audio/fifa23.mp3 |
| FC 24 | fifa24.mp3 | /audio/fifa24.mp3 |
| FC 25 | fifa25.mp3 | /audio/fifa25.mp3 |
| FC 26 | fifa26.mp3 | /audio/fifa26.mp3 |
| FC 27 | fifa27.mp3 | /audio/fifa27.mp3 |

Each song loops. Initial volume is 15%, with remembered volume and deliberate pause preferences. The app attempts autoplay and offers Play music when the browser requires interaction. Switching editions fades between songs; the career view keeps the last concrete edition's song. Missing media leaves the rest of the app fully usable. Duration comes from the recording, and neutral edition labels avoid misidentifying an owner-supplied track.

## Configuration

- `DATABASE_URL`: PostgreSQL connection, server only.
- `AI_API_KEY`: vision-provider key, server only.
- `AI_API_URL`: complete compatible chat-completions endpoint URL.
- `AI_MODEL`: provider's vision-capable model identifier.
- `UPLOAD_CONTEXT_SECRET`: stable server-only key used to sign pending uploads. If omitted, the existing AI key is used. Use the same stable key across instances; key rotation invalidates pending reviews.

Neither screenshot dates nor client-provided timestamps determine an upload's edition or authoritative upload time.

## Existing database and legacy records

The schema constraint migration assumes the existing match table and edition column from the partial implementation. Inspect the deployed schema and migration history before applying it. New development databases can use the complete Prisma schema directly.

Legacy assignment is a separate explicit-ID backfill, never a blanket change inferred from years or existing edition values. Prepare a JSON array of confirmed legacy match IDs, set `LEGACY_BACKFILL_DATABASE_URL` explicitly, then preview:

```powershell
npx tsx scripts/backfill-legacy.ts confirmed-ids.json --dry-run
```

The preview changes nothing. Apply only after reviewing the proposed cohort and obtaining the deployment owner's authorization. The operation is repeatable, assigns only those IDs to FC 27, and preserves other fields and genuine classified records. No live-data backfill was performed during implementation.

## Validation

`npm test` runs Vitest. Database-backed suites require a disposable PostgreSQL instance on `127.0.0.1:55432`, database `matchday_test`, role `matchday_test`. Each suite uses a separate test schema. Never substitute a live database.

For the complete API suite, set:

```powershell
$env:DATABASE_URL='postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=integration'
$env:TEST_DATABASE_URL='postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t01_review'
$env:T02_DATABASE_URL='postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t02'
$env:T03_DATABASE_URL='postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test?schema=t03'
npm run db:generate
npm test
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
```

Browser checks use Playwright with desktop and phone projects. Install Chromium with `npx playwright install chromium`; then run `npx playwright test --workers=2` using the disposable integration database URL above. The configuration starts fresh servers and a local AI fixture, so browser tests do not call a paid provider or reuse an unknown existing app server. Test media fixtures do not overwrite owner recordings.

The real-persistence browser scenario checks manual recording, editing, photo analysis/review/save, shared friend identity, career totals, and cross-edition deletion against the disposable database. Presentation and media fixtures separately cover failure states, accessibility, date display, missing files, looping, and autoplay restrictions.

## Specification and execution

- [Approved specification](https://github.com/MedAMINE-Hajji/FifaProject-codex/issues/1)
- Local specification: `docs/specs/edition-redesign.md`
- Execution plan: `docs/specs/parallel-execution-plan.md`
- Session handoff: `docs/specs/SESSION_HANDOFF.md`

Publishing code does not deploy the app or authorize changes to live data.
