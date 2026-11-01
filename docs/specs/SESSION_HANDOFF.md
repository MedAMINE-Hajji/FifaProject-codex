# Edition redesign execution

User approved the execution plan on 2026-11-01. Implementation is authorized; deployment and live-data migration are not.

## Checkouts

- Original preserved checkout: `C:/Users/LENOVO/Documents/GitHub/fifaProject` (dirty main, do not clean or overwrite).
- Starting checkpoint: `48f51ab50dc871e71f6a1ab3cb522e19aa367250`.
- Integration: `C:/Users/LENOVO/.codex/worktrees/edition-integration/fifaProject`, branch `codex/edition-redesign`, current preparation commit `792f75c`.
- T1: `C:/Users/LENOVO/.codex/worktrees/edition-t01/fifaProject`, branch `codex/edition-t01`, worker `01a197f6-51f5-74d2-a739-56340a7cfa9d` (Ramanujan), running. Review/test/integrate before dispatching dependents.

## Tracker

Spec: https://github.com/MedAMINE-Hajji/FifaProject-codex/issues/1

T1..T11 map to issue numbers 2..12 respectively. All are ready-for-agent sub-issues with native dependency links. T2/T3/T4/T5/T11 depend on T1. T6/T7/T8/T9/T10 depend on T5. The parent body/state were preserved.

## Validation infrastructure

- Integration has independent npm dependencies, Playwright configuration and a presentation-only fixture. Chromium 156 installed and successfully launched.
- A disposable PostgreSQL 18 cluster is running on `127.0.0.1:55432`. Test-only URL: `postgresql://matchday_test:matchday_test@127.0.0.1:55432/matchday_test`. Append a unique schema per worker (`?schema=t01` for T1, `?schema=integration` for coordinator). Test user has no production access.
- Cluster data: integration `.scratch/postgres/data`; binaries: `C:/Program Files/PostgreSQL/18/bin`. It was initialized specifically for this task. Never use original environment credentials. Stop this task's test cluster after final validation; preserve its exact path if recovering from compaction.
- Docker was unavailable; a hanging Docker startup command was cancelled. Native installed PostgreSQL provided the safe alternative.

## Baseline results

- Existing 14 Vitest tests pass.
- Initial lint: seven errors and nine warnings in partial edition work (any casts, effect state updates, unused imports). Core errors assigned T1; audio errors belong to T11; presentation cleanup belongs T5/coordinator.
- Prisma generate and validate pass with test URL; schema pushed only to disposable integration schema.
- Type checking passes after client generation and Next type generation.
- Production build passes after Prisma generation. Earlier build failures were caused by an ungenerated isolated client.
- npm reported existing dependency audit findings; no blanket or breaking audit fix performed.

## Next steps

1. T1 is accepted at integration commit 983f0d9: 40 tests pass on schema t01_review; production build passes; two Chromium workspace tests pass (desktop/phone). Issue 2 closed. Coordinator corrected schema fixture isolation and added browser gate.
2. Finalize exact disjoint allowlists and module wiring. T1 is extracting match read/write handlers and defining entry/dialog contracts. T2 owns analyzer/upload adapter/import dialog; T3 owns manual date adapter/dialog; T4 owns career panel/read extension; T5 owns new shell/theme presentation; T11 owns music player/audio metadata.
3. Coordinator alone edits top-level page composition, shared registries/adapters, package lock and global setup once parallel work begins. Add each accepted feature through serial wiring.
4. Five workers started from 983f0d9, all separate worktrees under C:/Users/LENOVO/.codex/worktrees/edition-tNN/fifaProject: T5 Archimedes 01a19822-f84f-7583-8929-52a8991045c5; T2 Aristotle 01a19822-f94e-7de3-8151-5b1fb18f2ad5; T3 Lagrange 01a19822-fa74-7681-afd4-47c20058f085; T4 Aquinas 01a19822-fb81-70d2-a2d1-d6cc1a11332a; T11 Newton 01a19822-fd01-7983-acbe-4372ece705bb. Each has exclusive paths; coordinator owns page composition and shared contracts. Review/integrate independently. Theme workers T6-T10 must await accepted T5.
5. Complete individual theme tickets only after T5 is accepted. Every worker runs relevant tests; coordinator performs full final validation and updates this handoff with actual results and remaining work.

## Operational notes

Worktree commands often require escalation: sandboxed `git status` can misleadingly report that the directory is not a work tree, while elevated Git works correctly. New nested directories outside original roots may need an elevated native `New-Item` before `apply_patch` can write files. Use `apply_patch` for source edits. All commands should explicitly select their absolute intended checkout.

The current coordinator's parent work is preparation, test infrastructure and GitHub ticket publication. Do not infer that the completed preparation means any product ticket is finished.
