# w2-m3 Peach and Elixir Debugging Implementation Plan

> **For agentic workers:** Execute inline in the existing `/Users/macmini-zz/.codex/worktrees/3abe/少儿编程学习网页` working tree. Do not create another worktree, commit, push, deploy, reset, clean, or revert w2-m1/w2-m2/W1 changes. Every production behavior follows RED → observed failure → minimal GREEN.

**Goal:** Deliver w2-m3 “蟠桃与金丹” as one complete real-browser Blockly sequence-debugging level with deterministic provenance, Progress V3 recovery, approved assets, and zero punishment.

**Architecture:** Add a mission-specific zero-UI contract, Blockly compiler, runner, strict session parser, lazy UI boundary and generated scene assets while reusing the existing Progress V3 coordinator and formal mission routing. The visible Blockly main chain is the only execution truth; persisted evidence is recompiled and replayed during import.

**Tech Stack:** React 19, TypeScript, Blockly, Vitest, Playwright, Vite, Progress V3, OpenAI built-in image generation.

---

### Task 1: Lock course and performance contracts with RED

**Files:**
- Modify: `src/course/course.test.ts`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `scripts/budget-limits.mjs`
- Modify: `scripts/budget-limits.d.mts`

- [x] Add a course test requiring w2-m3 in `formalWeekTwoMissions`, with no `expectedSequence`, and requiring w2-m4 to remain legacy.
- [x] Add a bundle test requiring `w2-m3` cold limit `3 * 1024 * 1024` while snapshotting all existing limits unchanged.
- [x] Run the targeted tests and observe failures caused by absent formal registration and absent budget key.
- [x] Add only the new budget constant; keep every prior number byte-for-byte unchanged.
- [x] Re-run the budget RED to GREEN; leave the course RED until formal integration.

### Task 2: Build the zero-UI contract and deterministic runner via TDD

**Files:**
- Create: `src/blockly/weekTwoPeachElixirContract.test.ts`
- Create: `src/blockly/weekTwoPeachElixirContract.ts`

- [x] Write tests for the default real wrong-order draft and exact five-opcode whitelist.
- [x] Write tests proving the draft graph rejects duplicate IDs, invalid references, multiple predecessors, cycles, non-finite coordinates, unknown blocks and boundary overflow.
- [x] Write tests proving compile order follows `nextId`, never coordinates or array order, and emits `sourceBlockId/previousBlockId/nextBlockId`.
- [x] Write runner tests for the first wrong “eat elixir” block, all prerequisite failures, incomplete chains, correct completion, deterministic replay and `{ livesLost: 0, resourcesLost: 0, starsLost: 0 }`.
- [x] Run the new test file and observe module-not-found RED.
- [x] Implement the minimal typed contract, compiler-from-draft and runner.
- [x] Re-run the file to GREEN.

### Task 3: Compile the real Blockly graph via TDD

**Files:**
- Create: `src/blockly/weekTwoPeachElixirCompiler.test.ts`
- Create: `src/blockly/weekTwoPeachElixirCompiler.ts`
- Create: `src/blockly/weekTwoPeachElixirBlocks.ts`

- [x] Write compiler tests using real Blockly blocks for default wrong chain, child reorder, deletion, disconnected chains, unknown blocks, forged reciprocal connections and boundary errors.
- [x] Observe RED before implementation.
- [x] Define five statement blocks with child-readable labels and restore helpers.
- [x] Snapshot the current workspace with actual next/previous provenance and compile only through the contract.
- [x] Return diagnostics with the actual offending block ID; never read course configuration.
- [x] Re-run compiler and contract tests to GREEN.

### Task 4: Add the strict w2-m3 Progress V3 session via TDD

**Files:**
- Create: `src/progress/peachElixirSessionSchema.ts`
- Create: `src/progress/weekTwoPeachElixirSession.test.ts`
- Modify: `src/progress/types.ts`
- Modify: `src/progress/session.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/progress.ts`
- Modify: `src/context/ProgressContext.tsx`

- [x] Write RED for `PeachElixirMissionSession`, default wrong draft, update-clears-evidence, compile/runtime counts and parent “顺序调试” aggregation.
- [x] Write RED for import recompilation/replay and rejection of forged trace, provenance, run, timestamps, counters and cross-mission blocks.
- [x] Write RED for generic session update dispatch and Progress V3 export/import round-trip.
- [x] Implement strict parsing and mission overloads without weakening w1/w2-m1/w2-m2 validation.
- [x] Re-run targeted session, schema, storage and context tests to GREEN.

### Task 5: Build the lazy Blockly experience via TDD

**Files:**
- Create: `src/components/WeekTwoPeachElixirBlocklyWorkspace.test.tsx`
- Create: `src/components/WeekTwoPeachElixirBlocklyWorkspace.tsx`
- Create: `src/components/WeekTwoPeachElixirExperience.test.tsx`
- Create: `src/components/WeekTwoPeachElixirExperience.tsx`
- Create: `src/components/WeekTwoPeachElixirScene.test.tsx`
- Create: `src/components/WeekTwoPeachElixirScene.tsx`
- Create: `src/components/WeekTwoPeachElixirExperience.css`

- [x] Write workspace RED for visible default chain, real reorder, delete/restore, keyboard move, draft persistence, focus-by-source-block and locked states.
- [x] Write Experience RED for compile feedback, runtime feedback, zero punishment, run-save-before-playback, replay, draft/run recovery, CAS recovery and completion-save gating.
- [x] Write Scene RED for six states, reduced motion, mute parity, resource readiness, image failure and explicit retry.
- [x] Implement the smallest complete UI following w2-m2 patterns without copying mission answers into React state.
- [x] Run component tests to GREEN and verify no raw block/provenance IDs appear in the child UI.

### Task 6: Promote formal routing without disturbing earlier levels

**Files:**
- Modify: `src/course/formalCourse.ts`
- Modify: `src/course/course.ts`
- Modify: `src/components/MissionPageContent.tsx`
- Create: `src/components/WeekTwoPeachElixirRoute.test.tsx`
- Modify: related source-contract checks as required

- [x] Observe the existing course RED from Task 1 plus a new route RED.
- [x] Register w2-m3 as formal with accurate five-step story beats and remove only its legacy mission extension.
- [x] Add the demand-loaded Experience boundary and keep w2-m4 as the next locked legacy mission.
- [x] Prove w2-m1/w2-m2/W1 routing and budgets remain unchanged.

### Task 7: Generate, register and visually verify formal assets

**Files:**
- Create: `public/assets/week-two-peach-elixir/heavenly-route-background.webp`
- Create: `public/assets/week-two-peach-elixir/peach-elixir-states.webp`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`

- [x] Use built-in image generation for the two approved assets; inspect original outputs and reject pseudo-text, fake transparency, style mismatch or unclear stage separation.
- [x] Convert only accepted images to shipping WebP without synthesizing art in code.
- [x] Record prompt, tool, edits, SHA-256, dimensions, provenance, exact screen slot and `visual-qa-passed`.
- [x] Add RED then GREEN for directory allowlist, exact source literals, build matching and no extra/missing assets.

### Task 8: Add browser and source-contract coverage

**Files:**
- Create: `e2e/week-two-peach-elixir-debug.spec.ts`
- Create: `scripts/check-week-two-peach-elixir-e2e-contract.mjs`
- Create: `scripts/check-week-two-peach-elixir-e2e-contract.test.mjs`
- Modify: `e2e/support/storageFaultAdapter.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`

- [x] First add the Playwright tag/config RED and observe zero or missing collected cases.
- [x] Cover pointer and Chromium/Firefox keyboard correction using the visible Blockly graph, canonical trace and real source block focus.
- [x] Cover 320/390/768/1440, mute, reduced motion, refresh, replay, draft/run/completion write failure, corruption recovery, CAS, export/import, parent report and w2-m4 unlock.
- [x] Cover Experience/Scene/Workspace lazy failures, asset first-load failure and retry, family asset 404, application 404, console/request health and fail-closed page health.
- [x] Add AST/source contracts preventing `expectedSequence`, legacy tools, hidden success, direct storage, dynamic execution and test-only pass-through.

### Task 9: Fresh verification and evidence audit

**Files:**
- Create: `docs/verification/week-two-peach-elixir-debug.md`
- Update: plan checkboxes and asset QA records only after evidence exists

- [x] Run targeted RED/GREEN tests throughout implementation.
- [x] Run full Vitest with restricted workers, bundle/source contracts, asset contracts, TypeScript, production build, bundle gate and asset verify.
- [x] Run w2-m3 on all five Playwright projects and inspect saved screenshots at 320/390/768/1440 plus Firefox keyboard evidence.
- [x] Run `git diff --check` and audit changed paths to ensure no unrelated cleanup, commit, push or deploy occurred.
- [x] Record exact fresh counts, completion-matrix coverage, exclusions, residual risks and the still-blocking W1 full Playwright run.
- [x] Report `One-level playable` only if every mandatory row above has executable evidence; otherwise report `not complete` with the first unmet gate.
