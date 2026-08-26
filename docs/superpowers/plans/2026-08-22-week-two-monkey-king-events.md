# w2-m2 齐天大圣事件触发 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user forbids commits, pushes and deployment for this task.

**Goal:** Deliver w2-m2 as one real Blockly event-handler level with deterministic execution, Progress V3 recovery and five-project browser evidence.

**Architecture:** Add a zero-UI `weekTwoMonkeyKingContract` as the canonical draft/compiler/runner contract, a thin Blockly adapter that snapshots the visible graph, and mission-specific Experience/Scene/Workspace components. Extend existing generic Progress V3 coordination with an isolated w2-m2 parser that recompiles and replays imported evidence.

**Tech Stack:** React 19, TypeScript 5.9, Blockly 13, Vitest, Playwright, Vite, Sharp-backed asset validation.

---

### Task 1: Lock course and performance contracts

**Files:** `src/course/course.test.ts`, `scripts/budget-limits.mjs`, `scripts/budget-limits.d.mts`, `scripts/check-bundle-budget.test.mjs`

- [ ] Add tests that require w2-m2 to be formal, lack `expectedSequence`, have a dedicated route, and export `WEEK_TWO_MONKEY_KING_COLD_LOAD_MAX_BYTES = 3 * 1024 * 1024` while every old ceiling remains unchanged.
- [ ] Run the focused tests and confirm RED because w2-m2 remains legacy and the new constant/route are absent.
- [ ] Add only the budget constant and later make course/route changes when their focused tests are present.

### Task 2: Define event draft, trace and deterministic runner

**Files:** `src/blockly/weekTwoMonkeyKingContract.test.ts`, `src/blockly/weekTwoMonkeyKingContract.ts`

- [ ] Write tests for valid two-handler compilation; event/source/parent provenance; fixed dispatch order; wrong-event and wrong-order diagnostics; missing/duplicate/empty handlers; orphan/cycle rejection; zero penalty; deterministic replay.
- [ ] Run the contract test and confirm RED because the module does not exist.
- [ ] Implement typed draft validation, compilation and runner without UI/runtime imports, `expectedSequence`, dynamic code or hidden success state.
- [ ] Run the contract tests GREEN and refactor only with the suite remaining green.

### Task 3: Compile the real Blockly graph

**Files:** `src/blockly/weekTwoMonkeyKingBlocks.ts`, `src/blockly/weekTwoMonkeyKingCompiler.ts`, `src/blockly/weekTwoMonkeyKingCompiler.test.ts`

- [ ] Write adapter tests using real Blockly workspaces for two event hats, nested actions, wrong-handler actions, missing handler and unknown blocks.
- [ ] Confirm RED on missing modules.
- [ ] Register two statement-input event hats and three connectable action blocks; snapshot IDs, parent IDs, links and positions from Blockly.
- [ ] Return structured diagnostics that preserve the real problem block ID, then run focused tests GREEN.

### Task 4: Extend Progress V3 with canonical import evidence

**Files:** `src/progress/types.ts`, `src/progress/session.ts`, `src/progress/monkeyKingSessionSchema.ts`, `src/progress/weekTwoMonkeyKingSession.test.ts`, `src/progress/schema.ts`, `src/context/ProgressContext.tsx`, `src/progress/progress.ts`

- [ ] Write tests for initial session, draft invalidation, compile/runtime counters, hint support, canonical recompile/replay and rejection of forged trace/run/event provenance.
- [ ] Confirm RED on unsupported `w2-m2` session.
- [ ] Add `MonkeyKingMissionSession`, generic session overloads/context dispatch, strict parser and week-two parent-support aggregation.
- [ ] Run focused schema/session/context tests GREEN.

### Task 5: Build the formal player experience

**Files:** `src/components/WeekTwoMonkeyKingBlocklyWorkspace.tsx`, `src/components/WeekTwoMonkeyKingExperience.tsx`, `src/components/WeekTwoMonkeyKingScene.tsx`, `src/components/WeekTwoMonkeyKingExperience.css` and colocated tests

- [ ] Write component RED tests for visible true Blockly, two handler builders, wrong-handler feedback/focus, save-before-run, run save failure retry, replay, scene asset failure and independent lazy failure boundaries.
- [ ] Implement a workspace whose palette operations mutate the real Blockly graph and whose tree exposes delete/reorder controls without becoming a second execution source.
- [ ] Implement Experience persistence locks and Scene deterministic stage playback with normal/reduced motion and muted parity.
- [ ] Run all new component tests GREEN.

### Task 6: Register course, route, hints and unlock

**Files:** `src/course/formalCourse.ts`, `src/course/course.ts`, `src/components/MissionPageContent.tsx`, related route tests

- [ ] Promote w2-m2 to `formalWeekTwoMissions`, remove its legacy extension, add its demand-loaded boundary, include w2-m2 in persisted hint calls, and retain w2-m3 as the next locked mission.
- [ ] Verify focused course/route tests and source contracts GREEN.

### Task 7: Create and verify shipping assets

**Files:** `public/assets/week-two-great-sage/*`, `docs/assets/asset-manifest.md`, asset checker tests if required

- [ ] Generate one 1600x900 Flower Fruit Mountain background and one four-stage state sheet with the built-in image generator, using w2-m1 only as style reference.
- [ ] Process without stretching or redrawing; record final prompt, built-in tool, dimensions, SHA-256, build slots and provenance.
- [ ] Inspect both final WebP files manually and mark `visual-qa-passed` only after provenance and slot verification.

### Task 8: Add browser acceptance and fault paths

**Files:** `e2e/week-two-monkey-king-events.spec.ts`, `playwright.config.ts`, `e2e/support/storageFaultAdapter.ts`, `scripts/check-bundle-budget.test.mjs`

- [ ] Add child-visible helpers for wrong event, wrong order and correct program; never inject w2-m2 completion/session evidence.
- [ ] Cover draft/run/completion failures, refresh, replay, corrupt recovery, cross-tab CAS, export/import, parent report, w2-m3 unlock, keyboard, mute/motion parity, four widths, asset/lazy failures, 404 and fail-closed health.
- [ ] Register honest tags across exactly five existing projects and confirm Playwright list distribution.

### Task 9: Final verification and evidence report

**Files:** `docs/verification/week-two-monkey-king-events.md`

- [ ] Run new focused Vitest RED/GREEN evidence, then all unit, bundle/source contract, assets, typecheck and production build gates.
- [ ] Run the w2-m2 five-project Playwright matrix and manually inspect captured 320/390/768/1440 screenshots for visible connected Blockly and clipping.
- [ ] Run `git diff --check` and audit every applicable completion-matrix row.
- [ ] Report only `w2-m2: One-level playable` if every mandatory one-level item passed; otherwise report `not complete` with the exact gap. Explicitly retain W1 full Playwright as the pre-merge blocker and state no commit/push/deploy occurred.
