# Week One Underworld And Boss Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: follow test-driven development and the project `xiyou-karpathy` gate. This task explicitly forbids commits, pushes, deploys, and stash changes; therefore commit steps from the generic planning template are intentionally omitted.

**Goal:** Upgrade w1-m4 and w1-m5 from legacy sequences into two formal, independent Blockly learning loops with complete Progress V3 and five-project browser evidence.

**Architecture:** Add a zero-UI-dependency advanced-week-one contract and two mission-specific deterministic reducers. Share graph serialization, compilation, strict session parsing, and the accessible React shell only between w1-m4 and w1-m5; keep their blocks, state machines, scene assets, and outcomes distinct. Reuse the existing Progress V3 transaction/CAS/recovery layer rather than reimplementing storage.

**Tech Stack:** React 19, TypeScript, Blockly 13, Vite, Vitest, Playwright, Sharp-based asset verifier, built-in image generation.

---

## File map

- `src/blockly/advancedWeekOneContract.ts`: canonical mission IDs, blocks, opcodes, scopes, states, limits and labels split into neutral/runtime-safe metadata.
- `src/blockly/advancedWeekOneDraft.ts`: bounded workspace draft types and serialization helpers.
- `src/blockly/advancedWeekOneCompiler.ts`: compile the visible connected graph depth-first into canonical provenance trace.
- `src/battle/advancedWeekOne.ts`: independent w1-m4 and w1-m5 state reducers and zero-penalty results.
- `src/progress/advancedSessionSchema.ts`: strict fail-closed parsing that recompiles workspace and replays run data.
- `src/components/AdvancedWeekOneBlocklyWorkspace.tsx`: actual Blockly mount, palette, restore, draft save, geometry and keyboard affordances.
- `src/components/AdvancedWeekOneScene.tsx`: approved raster scene renderer driven only by accepted/rejected engine events.
- `src/components/AdvancedWeekOneExperience.tsx`: mission shell, async save ownership, hints, run/replay, recovery and completion publication.
- `e2e/underworld-boss-code-battle.spec.ts`: visible w1-m4/w1-m5 paths, Progress V3, failures, accessibility, asset/load health and cold budgets.
- `scripts/check-advanced-week-one-e2e-contract.mjs`: AST/source gate against hidden completion and storage injection.
- `public/assets/week-one-advanced/*`, `docs/assets/asset-manifest.md`: generated images and exact provenance.
- `docs/verification/week-one-underworld-boss.md`: final evidence and strict exclusions.

### Task 1: Lock the course and performance contract with RED tests

- [ ] Extend `src/course/course.test.ts` to require all five week-one missions to be formal and free of `expectedSequence`.
- [ ] Extend `src/App.test.tsx` and `src/components/MissionPageContent` tests to require w1-m4/w1-m5 lazy formal experiences and reject `.legacy-mission-tools`.
- [ ] Add budget RED assertions in `scripts/check-bundle-budget.test.mjs` for unchanged existing budgets plus 3.0 MiB w1-m4/w1-m5 cold ceilings and unchanged media ceilings.
- [ ] Run the focused tests and record expected failures caused by the current legacy routes and absent constants.

### Task 2: Define canonical contracts and deterministic engines with RED tests

- [ ] Add `src/blockly/advancedWeekOneContract.test.ts` covering exact mission-specific opcode/block/state domains, legal scopes, unique mappings and no runtime UI imports.
- [ ] Add `src/blockly/advancedWeekOneCompiler.test.ts` covering correct traces, stable provenance, wrong scope, multiple heads, disconnected chains, cycles, duplicate IDs and oversized graphs.
- [ ] Add `src/battle/advancedWeekOne.test.ts` covering every legal transition plus wrong order, incomplete program, duplicate operation and cross-mission opcode; assert `livesLost/resourcesLost/starsLost` are always zero.
- [ ] Run these tests and confirm missing-module RED failures.
- [ ] Implement the contract, draft, compiler and engines minimally until focused tests pass.

### Task 3: Extend Progress V3 with replay-validated sessions

- [ ] Add failing cases to `src/progress/schema.test.ts`, `src/progress/session.test.ts`, `src/progress/progress.test.ts` and `src/context/ProgressContext.test.tsx` for w1-m4/w1-m5 draft/trace/run/hints/runs/failures, import/export, malformed data, cross-mission forgery, completion publication, unlock chain, CAS conflict and weekly report aggregation.
- [ ] Run focused tests and confirm current schema rejects the new sessions.
- [ ] Implement `advancedSessionSchema.ts`; extend `types.ts`, `schema.ts`, `session.ts`, `progress.ts` and `ProgressContext.tsx` so both missions use the existing coordinated transaction path.
- [ ] Re-run focused Progress tests and all existing progress tests.

### Task 4: Build the accessible formal Blockly experience

- [ ] Add component RED tests for real Blockly mounting, restore, delete/reorder correction, text-only hints, no help-side mutation, run locking, focus return, save failure, retry, conflict, refresh, replay and completion exactly once.
- [ ] Add `AdvancedWeekOneBlocklyWorkspace`, `AdvancedWeekOneScene` and `AdvancedWeekOneExperience` with route-lazy scene/workspace boundaries and unchanged global UI patterns.
- [ ] Update `formalCourse.ts`, `courseOutline.ts`, `course.ts` and `MissionPageContent.tsx` to route w1-m4/w1-m5 formally and remove their legacy execution truth.
- [ ] Update responsive styles without changing the existing design tokens; retain 44px targets, zero page overflow and full graph containment at 320px.
- [ ] Re-run component, route, course and responsive tests.

### Task 5: Generate, process and gate four shipping assets

- [ ] Generate the underworld records-room background, register-state sprite, Boss journey-board background and Boss checkpoint sprite with the built-in image generation tool and the exact shared art direction.
- [ ] Inspect each output at original resolution; reject and regenerate any illegible, frightening, clipped, text-corrupted or stylistically mismatched image.
- [ ] Convert selected outputs to bounded WebP files without stretching; compute dimensions, bytes and SHA-256.
- [ ] Add exact manifest rows, prompt records, provenance, code slots and `visual-qa-passed` status.
- [ ] Add RED asset verifier cases for the new directory and actual React image slots, then update the verifier and run `npm run test:assets` plus `npm run verify:assets`.

### Task 6: Add anti-shortcut source contracts and browser RED paths

- [ ] Add a source-contract test that requires both advanced routes to stay lazy and the neutral contract to stay outside UI/Blockly closures.
- [ ] Add AST checks that reject hidden progress/session writes, `expectedSequence`, page-evaluate completion, dynamic code, missing health capture, filtered health arrays and fault sentinels in production.
- [ ] Add `underworld-boss-code-battle.spec.ts` with child-visible builders for wrong and correct connected graphs; no direct w1-m4/w1-m5 state injection is permitted.
- [ ] Register honest tags in all five Playwright projects and list tests to prove the intended partition.
- [ ] Run the focused E2E in RED and confirm it fails on missing formal UI rather than test setup.

### Task 7: Close real-browser loops and recovery boundaries

- [ ] Pass w1-m4 wrong → visible correction → success → refresh → replay → w1-m5 unlock in all five projects.
- [ ] Pass w1-m5 wrong → visible correction → success → refresh → replay → week 5/5 report in all five projects.
- [ ] Cover Chromium/Firefox keyboard graph construction, 390/320 touch geometry, muted/reduced-motion parity, storage failure/retry, stale CAS conflict/reload, corrupt current snapshot, Parent export/import and exact session restore.
- [ ] Cover outer experience, scene and workspace load failures with visible retry and no premature completion.
- [ ] Cover local production 404, exact request/response/page/console health and fail-closed cold response accounting under the fixed route budgets.
- [ ] Regress w1-m1, w1-m2 and w1-m3 without changing their expected evidence semantics.

### Task 8: Final verification and honest handoff

- [ ] Run `npm test`, `npm run typecheck`, `npm run verify:assets`, `npm run verify:bundle`, `npm run build`, and `npm audit --registry=https://registry.npmjs.org --audit-level=high`.
- [ ] Run `npx playwright test --list --reporter=list` and full `npm run test:e2e` with zero skips.
- [ ] Rebuild production `dist`, scan for every storage-fault sentinel, remove `dist-e2e`, and run `git diff --check`.
- [ ] Record exact counts, route cold bytes, asset hashes, browser project counts, screenshots, residual risks and completion-matrix audit in `docs/verification/week-one-underworld-boss.md`.
- [ ] Confirm no commit, push, deploy, branch mutation or stash mutation occurred.
