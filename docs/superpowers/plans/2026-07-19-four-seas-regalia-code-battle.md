# w1-m3 Four Seas Regalia Code Battle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `w1-m3 四海披挂` from the explicitly labelled Legacy compatibility route to one complete nested-Blockly, code-driven, Progress V3-persisted playable level with formal assets and five-project browser evidence.

**Architecture:** Preserve the verified w1-m1/w1-m2 vertical slices and add mission-specific w1-m3 blocks, nested draft/compiler semantics, deterministic runner, session schema, formal scene, and lazy experience. The visible Blockly tree is the sole source of execution: compiled child instructions retain their owning container block ID, and the deterministic runner rejects wrong order, wrong scope, duplicate, incomplete, or premature actions. All writes continue through `ProgressContext` and the existing Web Locks/revision-CAS coordinator.

**Tech Stack:** React 19, TypeScript 5.9, Blockly 13, Phaser 3.90, Vitest 4, Testing Library, Vite 6, Playwright 1.55, built-in image generation/editing, existing Progress V3 storage and asset-manifest gates.

---

## File map

- `src/battle/fourSeasRegalia.ts` and `.test.ts`: deterministic nested-task runner and exact visible failure outcomes.
- `src/battle/types.ts`: w1-m3 opcodes, states, events, diagnostics, and run-result types.
- `src/blockly/fourSeasRegaliaBlocks.ts`: top-level/container/subtask block definitions and labels.
- `src/blockly/fourSeasRegaliaCompiler.ts` and `.test.ts`: compile the one visible main chain and its two real statement-input child chains.
- `src/blockly/fourSeasRegaliaDraft.ts` and `.test.ts`: lossless nested draft with stable IDs, scope IDs, next links, and safe rollback.
- `src/progress/types.ts`, `session.ts`, `schema.ts`, `progress.ts`, `ProgressContext.tsx` and tests: w1-m3 session union, canonical validation, transactional updates, recovery, unlock, and parent aggregation.
- `public/assets/dragon-palace/regalia.webp`: approved three-object regalia illustration sheet.
- `public/assets/dragon-palace/wukong-regalia.webp`: approved fully equipped Wukong illustration.
- `src/components/FourSeasRegaliaScene.tsx` and tests: event-driven Phaser presentation using only approved rasters.
- `src/components/FourSeasRegaliaBlocklyWorkspace.tsx` and tests: real nested Blockly host plus keyboard/touch controls over the same workspace.
- `src/components/FourSeasRegaliaFeedback.tsx` and tests: structural/runtime feedback with source-block focus.
- `src/components/FourSeasRegaliaExperience.tsx` and tests: run/save/playback/completion orchestration.
- `src/components/MissionPageContent.tsx`, `App.test.tsx`, `styles.css`, `responsive.test.tsx`: lazy formal route, hint lock, accessibility, and responsive integration.
- `scripts/budget-limits.mjs`, `check-bundle-budget.mjs`, `check-asset-manifest.mjs` and tests: fixed w1-m3 cold/scene/asset gates without widening w1-m1 or w1-m2.
- `docs/assets/asset-manifest.md`: exact prompts, hashes, dimensions, provenance, slots, and QA states.
- `e2e/four-seas-regalia-code-battle.spec.ts`, `playwright.config.ts`: five-project visible wrong-to-correct child path and focused recovery/performance evidence.
- `docs/verification/four-seas-regalia-code-battle.md`: final evidence and strict completion boundary.

## Task 1: Build nested Blockly semantics and the deterministic w1-m3 runner

**Files:**
- Create: `src/battle/fourSeasRegalia.ts`
- Create: `src/battle/fourSeasRegalia.test.ts`
- Create: `src/blockly/fourSeasRegaliaBlocks.ts`
- Create: `src/blockly/fourSeasRegaliaCompiler.ts`
- Create: `src/blockly/fourSeasRegaliaCompiler.test.ts`
- Create: `src/blockly/fourSeasRegaliaDraft.ts`
- Create: `src/blockly/fourSeasRegaliaDraft.test.ts`
- Modify: `src/battle/types.ts`

- [ ] **Step 1: Write failing runner tests for the exact nested trace**

Define test instructions with stable source and parent IDs:

```ts
const top = (id: string, opcode: FourSeasOpcode): FourSeasInstruction => ({
  instructionId: `instruction:${id}`,
  sourceBlockId: id,
  parentBlockId: null,
  opcode,
})

const child = (
  id: string,
  parentBlockId: string,
  opcode: FourSeasOpcode,
): FourSeasInstruction => ({
  instructionId: `instruction:${id}`,
  sourceBlockId: id,
  parentBlockId,
  opcode,
})

const correctTrace = [
  top('request', 'request_regalia'),
  top('collect', 'collect_gifts'),
  child('boots-gift', 'collect', 'receive_cloud_boots'),
  child('armor-gift', 'collect', 'receive_golden_armor'),
  child('crown-gift', 'collect', 'receive_purple_crown'),
  top('equip', 'equip_regalia'),
  child('wear-crown', 'equip', 'wear_crown'),
  child('wear-armor', 'equip', 'wear_armor'),
  child('wear-boots', 'equip', 'wear_boots'),
  top('verify', 'verify_regalia'),
]

it('completes only after both visible subtask groups run in canon order', () => {
  expect(runFourSeasRegalia(correctTrace)).toMatchObject({
    completed: true,
    finalState: 'regalia-verified',
    diagnostic: null,
    penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
  })
})
```

Add separate tests for crown-before-boots, armor-before-crown while dressing, a receive block under `equip`, a wear block under `collect`, missing child, duplicate action, verify-before-equipped, a child referencing a different container ID, immutable input, and byte-for-byte deterministic repeated runs. Every failure must name the real rejected source block and retain zero penalty.

- [ ] **Step 2: Run the runner test and record RED**

Run:

```bash
npx vitest run src/battle/fourSeasRegalia.test.ts
```

Expected: FAIL because `FourSeasOpcode`, `FourSeasInstruction`, and `runFourSeasRegalia` do not exist.

- [ ] **Step 3: Implement the minimal mission types and pure runner**

Add these opcodes:

```ts
export type FourSeasOpcode =
  | 'request_regalia'
  | 'collect_gifts'
  | 'receive_cloud_boots'
  | 'receive_golden_armor'
  | 'receive_purple_crown'
  | 'equip_regalia'
  | 'wear_crown'
  | 'wear_armor'
  | 'wear_boots'
  | 'verify_regalia'
```

Use the states fixed in the design spec, one `run-started`, instruction accepted/rejected and state-changed events derived only from the trace, and one `run-finished`. The runner must compare every child `parentBlockId` to the active visible container instruction's `sourceBlockId`; do not infer or repair scope.

- [ ] **Step 4: Write failing real-Blockly compiler and nested-draft tests**

Register the exact block catalogue:

```ts
export const FOUR_SEAS_BLOCK_OPCODE = {
  xiyou_request_regalia: 'request_regalia',
  xiyou_collect_gifts: 'collect_gifts',
  xiyou_receive_cloud_boots: 'receive_cloud_boots',
  xiyou_receive_golden_armor: 'receive_golden_armor',
  xiyou_receive_purple_crown: 'receive_purple_crown',
  xiyou_equip_regalia: 'equip_regalia',
  xiyou_wear_crown: 'wear_crown',
  xiyou_wear_armor: 'wear_armor',
  xiyou_wear_boots: 'wear_boots',
  xiyou_verify_regalia: 'verify_regalia',
} as const
```

Top-level blocks use `previousStatement/nextStatement` checked as `FourSeasTop`; `collect_gifts` exposes input `GIFTS`, `equip_regalia` exposes input `GEAR`, and all six child blocks use generic `FourSeasSubtask` statement connections so a wrong placement remains executable wrong logic rather than a hidden editor correction.

The compiler test must build a real `Blockly.Workspace`, make the top-level and child connections, and assert the exact ten-instruction trace shown in Step 1 including `parentBlockId`.

Compiler RED cases: empty workspace, multiple main chains, missing container child chain, noncanonical bidirectional connection, unknown block, w1-m1/w1-m2 block, orphan child, container nested inside another container, and cycle.

Use this draft shape:

```ts
export interface FourSeasWorkspaceDraftV1 {
  version: 1
  blocks: Array<{
    id: string
    type: FourSeasBlockType
    nextId: string | null
    parentBlockId: string | null
    x: number
    y: number
  }>
}
```

Draft tests must prove stable IDs, top-level links, both statement-input child heads, each child scope ID, and coordinates survive save/load. Reject duplicate IDs, unknown `nextId`, unknown/wrong-type parent, multiple heads in one scope, cross-scope next link, cycles, unsafe coordinates, excessive nodes, and foreign mission blocks. A failed apply must restore the previous workspace exactly; a failed rollback returns `AggregateError`.

- [ ] **Step 5: Run compiler/draft tests and record RED**

Run:

```bash
npx vitest run src/blockly/fourSeasRegaliaCompiler.test.ts src/blockly/fourSeasRegaliaDraft.test.ts
```

Expected: FAIL because the mission block, compiler, and draft modules do not exist.

- [ ] **Step 6: Implement the smallest lossless nested compiler and draft**

Compiler traversal is main-chain preorder: emit each top-level instruction, then emit the connected statement-input child chain for `collect_gifts` or `equip_regalia`. Use the container block's real ID as every descendant instruction's `parentBlockId`. Validate before producing any trace.

Draft load creates all blocks first, connects each same-scope `nextId`, then connects the unique head of each child scope to the correct container input. Validate the complete graph before clearing the target workspace.

- [ ] **Step 7: Run focused and existing domain regressions**

Run:

```bash
npx vitest run src/battle/fourSeasRegalia.test.ts src/blockly/fourSeasRegaliaCompiler.test.ts src/blockly/fourSeasRegaliaDraft.test.ts src/battle/dragonPalace.test.ts src/battle/ruyiStaff.test.ts src/blockly/compiler.test.ts src/blockly/draft.test.ts src/blockly/ruyiStaffCompiler.test.ts src/blockly/ruyiStaffDraft.test.ts
```

Expected: PASS with w1-m1/w1-m2 unchanged.

- [ ] **Step 8: Commit Task 1**

```bash
git add src/battle src/blockly
git commit -m "feat: add four seas nested battle domain"
```

## Task 2: Extend Progress V3, recovery, Context, unlocks, and parent reporting

**Files:**
- Modify: `src/progress/types.ts`
- Modify: `src/progress/session.ts`
- Modify: `src/progress/session.test.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/schema.test.ts`
- Modify: `src/progress/storage.test.ts`
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`
- Modify: `src/context/ProgressContext.tsx`
- Modify: `src/context/ProgressContext.test.tsx`

- [ ] **Step 1: Write failing mission-aware V3 parser and recovery tests**

Add `FourSeasRegaliaMissionSession` to the typed mission map:

```ts
export interface MissionSessionById {
  'w1-m1': DragonPalaceMissionSession
  'w1-m2': RuyiStaffMissionSession
  'w1-m3': FourSeasRegaliaMissionSession
}
```

Create the valid session fixture by compiling a real Task 1 workspace and running `runFourSeasRegalia`. Assert parse/serialize preserves the exact nested draft, trace, events, stable IDs, parent IDs, counters, and timestamps.

Mutate one field at a time and assert rejection for foreign block type, forged parent ID, wrong opcode, foreign state, event source absent from trace, noncanonical run, mismatched final state, duplicate IDs, oversized arrays, and an unsupported `w1-m4` session.

Add a storage transaction test where current V3 has a corrupted w1-m3 nested draft and a legal snapshot has stable IDs. Assert the damaged current bytes remain downloadable and the legal snapshot restores those exact IDs and parent links.

- [ ] **Step 2: Run Progress V3 tests and record RED**

Run:

```bash
npx vitest run src/progress/schema.test.ts src/progress/storage.test.ts src/progress/session.test.ts
```

Expected: FAIL because w1-m3 is not a supported executable session and schema cannot validate its canonical run.

- [ ] **Step 3: Implement typed sessions and strict canonical parsing**

Extend `MissionSessionData` with the new draft/trace/run specialization. Add mission-dispatched workspace, trace, event, diagnostic, and run validators; w1-m1 and w1-m2 must retain their exact existing canonical validators. For w1-m3, parse `parentBlockId` as nullable bounded source ID and verify it matches both the trace instruction and every instruction event/diagnostic.

After structural parsing, re-run `runFourSeasRegalia(lastTrace)` and deep-compare the parsed run; no persisted event or completion flag may be trusted without canonical equality.

- [ ] **Step 4: Write failing session/parent/cross-level tests**

Assert:

```ts
expect(isMissionUnlocked(completedW1M3, 'w1-m4')).toBe(true)

const report = getWeeklyReport(progressWithThreeSessions, 1)
expect(report.sessionRuns).toBe(
  progress.sessions['w1-m1']!.totalRuns
  + progress.sessions['w1-m2']!.totalRuns
  + progress.sessions['w1-m3']!.totalRuns
)
expect(report.needsSupport).toContain('任务分解')
```

Add tests proving `createMissionSession('w1-m3', now)`, `updateWorkspaceDraft`, `recordCompileFailure`, `recordRun`, and `recordHint` preserve w1-m3 types and safe counters. Replay/session saves must not increment mission completion attempts.

- [ ] **Step 5: Run these tests and record RED**

Run:

```bash
npx vitest run src/progress/session.test.ts src/progress/progress.test.ts src/context/ProgressContext.test.tsx
```

Expected: FAIL because creation, update overloads, parent aggregation, and Context routing stop at w1-m2.

- [ ] **Step 6: Implement Context and parent aggregation through existing coordinators**

Add only typed `w1-m3` overloads and mission dispatch to `updateMissionSession`/`recordMissionHint`. Continue calling the existing `commit()` path and dynamic storage coordinator; do not create a storage key or direct `localStorage` call.

Aggregate all three first-week sessions for runs and adjustments. Map repeated w1-m3 program-structure/sequence/completeness failures to child-facing parent support headed by `任务分解`, without changing earlier mission wording.

- [ ] **Step 7: Run focused storage and concurrency regressions**

Run:

```bash
npx vitest run src/progress/schema.test.ts src/progress/storage.test.ts src/progress/storageCoordinator.test.ts src/progress/session.test.ts src/progress/progress.test.ts src/context/ProgressContext.test.tsx
```

Expected: PASS, including Web Locks, revision CAS, multi-tab conflict, corrupt recovery, clear, rollback, and no-lock fail-closed cases.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/progress src/context
git commit -m "feat: persist four seas sessions in progress v3"
```

## Task 3: Generate approved regalia art and build the formal event-driven scene

**Files:**
- Create: `public/assets/dragon-palace/regalia.webp`
- Create: `public/assets/dragon-palace/wukong-regalia.webp`
- Create: `src/components/FourSeasRegaliaScene.tsx`
- Create: `src/components/FourSeasRegaliaScene.test.tsx`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`
- Modify: `src/utils/assets.test.ts`

- [ ] **Step 1: Read and follow the project asset gate and built-in image-generation skill**

Use only the environment's built-in image generation/editing tool. Treat existing `wukong.webp` as a style/identity reference after visually inspecting it. Do not use external image search, CSS art, hand-authored SVG, code drawing, or an untracked source.

- [ ] **Step 2: Write failing asset/source and scene tests**

Asset tests must expect two new WebP files, exact manifest rows, immediately following prompt records, real dimensions/hashes, built-in-tool provenance, and actual `FourSeasRegaliaScene.tsx` slots. Extend the checker without weakening the six existing Dragon Palace rows.

Scene tests must require exact imports/loads for:

```ts
assetUrl('/assets/dragon-palace/regalia.webp')
assetUrl('/assets/dragon-palace/wukong-regalia.webp')
```

They must also prove the scene exposes `data-scene-state`, `data-visible-regalia`, `data-effect-cell`, and `data-motion-mode`, maps the wrong first gift to a blocked result, renders all collected items before dressing, uses the equipped Wukong only after the wear sequence, and reports asset-load failure with a local retry button.

- [ ] **Step 3: Run the tests and record RED**

Run:

```bash
npx vitest run src/components/FourSeasRegaliaScene.test.tsx src/utils/assets.test.ts
node --test scripts/check-asset-manifest.test.mjs
```

Expected: FAIL because neither formal asset nor scene/manifest slot exists.

- [ ] **Step 4: Generate and inspect `regalia.webp`**

Generate a transparent-ready three-object sheet on a flat removable chroma-key background. Use this exact shared art direction in the recorded prompt:

```text
commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.
```

The three separated subjects are: ornate phoenix-wing purple-gold crown, articulated golden chain armor, and a matched pair of cloud-pattern silk walking boots. Preserve generous spacing, no character, no weapon, no shadow, and no overlap. Remove the flat background with the installed imagegen chroma-key helper, verify transparent corners/clean edges, then technically encode to WebP without redrawing.

- [ ] **Step 5: Generate/edit and inspect `wukong-regalia.webp`**

Use the existing approved Wukong raster as the identity/style reference. The output must preserve the same child-friendly face, proportions, stance, and transparent cutout while adding all three exact regalia items. No weapon, text, extra character, floor, shadow, or background. Use the built-in edit/generation path and the same shared art-direction sentence. Inspect both source and final at original resolution; reject mismatched identity, missing item, fused silhouette, opaque corner, fringe, or unapproved text.

- [ ] **Step 6: Register exact manifest evidence and implement the scene**

Record stable file IDs, SHA-256, exact pixel dimensions, full accepted prompts, built-in tool source, provenance, actual w1-m3 screen slots, and `visual-qa-passed`. The combined approved Dragon Palace media must remain below 1.25 MiB and each file below 512 KiB.

Implement `FourSeasRegaliaScene` by reusing the approved background, base Wukong, Dragon King, effects, and the two new rasters. Phaser may crop/position/scale/animate only. Event playback must use owner/generation guards, reduced motion parity, and the same deterministic transcript for standard/reduced motion.

- [ ] **Step 7: Run focused asset and scene gates**

Run:

```bash
npx vitest run src/components/FourSeasRegaliaScene.test.tsx src/utils/assets.test.ts
npm run test:assets
npm run verify:assets
```

Expected: PASS with every existing and new approved raster decoded, traced, hashed, within limits, and marked visual-QA-passed.

- [ ] **Step 8: Commit Task 3**

```bash
git add public/assets/dragon-palace src/components/FourSeasRegaliaScene.tsx src/components/FourSeasRegaliaScene.test.tsx docs/assets/asset-manifest.md scripts/check-asset-manifest.mjs scripts/check-asset-manifest.test.mjs src/utils/assets.test.ts
git commit -m "feat: add formal four seas regalia scene"
```

## Task 4: Build the real nested Blockly workspace and child-facing feedback

**Files:**
- Create: `src/components/FourSeasRegaliaBlocklyWorkspace.tsx`
- Create: `src/components/FourSeasRegaliaBlocklyWorkspace.test.tsx`
- Create: `src/components/FourSeasRegaliaFeedback.tsx`
- Create: `src/components/FourSeasRegaliaFeedback.test.tsx`
- Modify: `src/styles.css`
- Modify: `src/responsive.test.tsx`

- [ ] **Step 1: Write failing component tests against a real Blockly workspace adapter**

The test must use visible helper controls to create the four-block main chain, then add the three gift children into `collect` and three wear children into `equip`. Execute and assert the callback receives the exact compiler result with real IDs and parent IDs.

Add separate tests proving:

- a deliberately wrong gift order compiles as that same wrong order rather than being auto-corrected;
- move up/down inside a scope changes the actual Blockly connections and next compile trace;
- moving a child to the other container changes `parentBlockId`;
- delete, clear, and direct Blockly changes update the same tree summary;
- draft-save rejection retains the visible edit and exposes retry;
- incoming corrupt draft leaves the current workspace unchanged;
- capacity, lock, focus restore, block focus, keyboard Enter, and touch helper controls remain usable;
- no component state array is used as an execution source.

- [ ] **Step 2: Write failing feedback tests**

Require exact child-facing copy for at least:

```ts
const RUNTIME_COPY = {
  'four-seas.wrong-order.receive_purple_crown': '北海龙王还没有送来云履，现在不能先收金冠。',
  'four-seas.wrong-scope.wear_crown': '“戴上金冠”应放在“穿戴整副披挂”任务组中。',
  'four-seas.incomplete.all-gifts-received': '三件宝物已收齐，还要把穿戴步骤分解完整。',
} as const
```

Feedback must focus itself as `role=alert` and route the action back to the exact source block or the workspace when no source exists.

- [ ] **Step 3: Run focused tests and record RED**

Run:

```bash
npx vitest run src/components/FourSeasRegaliaBlocklyWorkspace.test.tsx src/components/FourSeasRegaliaFeedback.test.tsx src/responsive.test.tsx
```

Expected: FAIL because the real nested workspace and feedback components do not exist.

- [ ] **Step 4: Implement one workspace, one draft, and one compiler path**

Follow the proven Ruyi workspace persistence/locking pattern, but derive a scoped tree from the actual Blockly graph after every change. Accessible helper buttons operate on the workspace:

- top-level buttons append request/container/verify blocks to the one main chain;
- gift buttons append to the real `GIFTS` input chain;
- wear buttons append to the real `GEAR` input chain;
- scoped move buttons rebuild only that Blockly scope;
- cross-container move disconnects the block from one input chain and reconnects it to the other.

`run` must call only `compileFourSeasRegaliaWorkspace(workspace)`. The text tree is derived output and cannot be passed directly to battle logic.

- [ ] **Step 5: Implement safe draft persistence, locking, focus, and narrow fitting**

Use generation-guarded async draft save, accepted-draft rollback after a locked mutation, explicit unsaved/conflict UI, and the existing retry contract. At 390/320px, close delayed Blockly flyouts, resize the SVG, and use Blockly viewport operations so both containers and their real child stacks stay inside the host after initialization, resize, restore, and lock/unlock.

- [ ] **Step 6: Run focused and all Blockly UI regressions**

Run:

```bash
npx vitest run src/components/FourSeasRegaliaBlocklyWorkspace.test.tsx src/components/FourSeasRegaliaFeedback.test.tsx src/components/RuyiStaffBlocklyWorkspace.test.tsx src/components/BlocklyWorkspace.test.tsx src/responsive.test.tsx
```

Expected: PASS without weakening existing workspace geometry, persistence, or accessibility assertions.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/components/FourSeasRegaliaBlocklyWorkspace.tsx src/components/FourSeasRegaliaBlocklyWorkspace.test.tsx src/components/FourSeasRegaliaFeedback.tsx src/components/FourSeasRegaliaFeedback.test.tsx src/styles.css src/responsive.test.tsx
git commit -m "feat: add nested four seas blockly workspace"
```

## Task 5: Integrate the lazy experience, durable completion loop, and real browser RED path

**Files:**
- Create: `src/components/FourSeasRegaliaExperience.tsx`
- Create: `src/components/FourSeasRegaliaExperience.test.tsx`
- Create: `e2e/four-seas-regalia-code-battle.spec.ts`
- Modify: `src/components/MissionPageContent.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Write failing experience tests for save/playback/completion ordering**

Use a fake scene loader whose `onPlaybackComplete` is controlled by the test and a real workspace adapter. Prove:

- compile failure records only compile failure and never starts playback;
- wrong trace saves its exact run, plays the visible failure, and never completes;
- correct trace does not call `onComplete` until the exact session save returns `saved` and the exact playback request finishes;
- save failure keeps the current real run/draft, locks hints/editing, and exposes retry;
- CAS conflict exposes the existing external-version flow and never overwrites CURRENT;
- replay, duplicate callbacks, unmount, stale save completion, and refresh-restored run cannot duplicate completion;
- stored nested draft/run is replayable after remount without reopening success;
- reduced motion and standard motion consume identical events.

- [ ] **Step 2: Write a failing desktop browser path before route integration**

Add `@regalia-full` that begins from a legal w1-m1/w1-m2-completed fixture only, navigates visibly to w1-m3, asserts the absence of `.legacy-mission-tools`, builds the wrong nested gift order, runs it, sees blocked scene/error/focused source, corrects the real child chain, completes, refreshes, and verifies stable block IDs/parent IDs plus w1-m4 unlock.

The test must contain no `page.evaluate` assignment to `missions['w1-m3']`, `sessions['w1-m3']`, workspace, trace, run, or success state.

- [ ] **Step 3: Run unit and focused browser tests and record RED**

Run:

```bash
npx vitest run src/components/FourSeasRegaliaExperience.test.tsx src/App.test.tsx
npx playwright test e2e/four-seas-regalia-code-battle.spec.ts --project=desktop-chromium-1440x1024 --grep @regalia-full
```

Expected: FAIL because w1-m3 still renders `MissionTools` and no formal experience exists.

- [ ] **Step 4: Implement the experience using the existing durable-run contract**

Follow the proven w1-m2 ordering without copy-pasting hidden success state:

```ts
const MISSION_ID = 'w1-m3' as const
```

Save draft through `updateMissionSession(MISSION_ID, updateWorkspaceDraft)`. On run, persist `recordCompileFailure` or `recordRun`; attach the exact run identity to its request. Release completion only after that run is durable and its scene playback completed. Completion evidence is based on distinct persisted hint tiers. Session retry and mission-completion retry remain separate owning flows.

- [ ] **Step 5: Replace only w1-m3's Legacy branch with a lazy local boundary**

`MissionPageContent` must lazy-load `FourSeasRegaliaExperience`; w1-m1/w1-m2 keep their existing branches, and w1-m4+ keep `MissionTools`. Lock hints during playback, session persistence/recovery, and completion persistence. The outer experience, inner scene, and inner workspace each retain story/objective and explicit reload/retry behavior when their exact chunk fails.

- [ ] **Step 6: Run the focused UI and real browser path to GREEN**

Run:

```bash
npx vitest run src/components/FourSeasRegaliaExperience.test.tsx src/App.test.tsx src/responsive.test.tsx
npx playwright test e2e/four-seas-regalia-code-battle.spec.ts --project=desktop-chromium-1440x1024 --grep @regalia-full
```

Expected: PASS through visible nested Blockly and the formal scene, with no injected completion.

- [ ] **Step 7: Run the complete unit suite and commit Task 5**

Run:

```bash
npm run test:unit
npm run typecheck
```

Expected: PASS.

Commit:

```bash
git add src/components/FourSeasRegaliaExperience.tsx src/components/FourSeasRegaliaExperience.test.tsx src/components/MissionPageContent.tsx src/App.test.tsx src/styles.css e2e/four-seas-regalia-code-battle.spec.ts playwright.config.ts
git commit -m "feat: make four seas regalia playable"
```

## Task 6: Fix budgets, complete the five-project matrix, and record evidence

**Files:**
- Modify: `scripts/budget-limits.mjs`
- Modify: `scripts/budget-limits.d.mts`
- Modify: `scripts/check-bundle-budget.mjs`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `vite.config.ts`
- Modify: `e2e/four-seas-regalia-code-battle.spec.ts`
- Modify: `e2e/commercial-foundation.spec.ts`
- Modify: `e2e/dragon-palace-code-battle.spec.ts`
- Modify: `e2e/ruyi-staff-code-battle.spec.ts`
- Create: `docs/verification/four-seas-regalia-code-battle.md`
- Create: `docs/verification/screenshots/four-seas-regalia-1440.png`
- Create: `docs/verification/screenshots/four-seas-regalia-768.png`
- Create: `docs/verification/screenshots/four-seas-regalia-390.png`
- Create: `docs/verification/screenshots/four-seas-regalia-320.png`
- Create: `docs/verification/screenshots/four-seas-regalia-wrong-order-768.png`

- [ ] **Step 1: Write failing fixed-budget and source-contract tests**

Require these implementation-time constants without changing prior limits:

```js
export const DRAGON_PALACE_COLD_LOAD_MAX_BYTES = 2.5 * 1024 * 1024
export const RUYI_STAFF_COLD_LOAD_MAX_BYTES = 2.5 * 1024 * 1024
export const FOUR_SEAS_COLD_LOAD_MAX_BYTES = 2.75 * 1024 * 1024
```

Add `FourSeasRegaliaScene.tsx` and `FourSeasRegaliaBlocklyWorkspace.tsx` as independently identified bounded dynamic roots. Require all three formal experiences to remain route-lazy, forbid Phaser/Blockly in the entry static closure, reject reverse entry imports and static/mixed dependency cycles, and scan the w1-m3 E2E source for evaluate-injected completion/session/draft plus missing health listeners on independently created pages.

- [ ] **Step 2: Run rules and record RED**

Run:

```bash
node --test scripts/check-bundle-budget.test.mjs
```

Expected: FAIL because w1-m3 fixed constants, scene/workspace closure gates, and E2E source contracts are not yet exported.

- [ ] **Step 3: Implement the shared fixed gates and repair chunk topology, never the budgets**

Add manifest roots and reports using the existing safe graph traversal. If entry/homepage/w1-m1/w1-m2/w1-m3 exceeds its fixed limit, reduce route imports, split shared dependencies, or remove reverse edges. Do not widen any limit, re-encode an unapproved legacy asset, or make a formal route load `world-map.jpg`.

- [ ] **Step 4: Expand the w1-m3 browser evidence with honest project tags**

All five projects execute the same visible wrong-order-to-correct nested Blockly path. Add focused tags for:

- keyboard nested editing in desktop Chromium and Firefox;
- reduced-motion/unmuted versus independent muted-before-run parity;
- draft/run/completion write failure and visible retry;
- two real pages exercising external completion/CAS without injected w1-m3 state;
- corrupt current + legal snapshot recovery with stable nested IDs and damaged-source download;
- parent report plus V3 export, visible session mutation, and import restoration;
- exact outer experience, inner scene, and inner workspace 503 paths;
- 320/390 nested block geometry, touch target hit testing, scene→program→feedback order, and no document overflow;
- fail-closed cold HTTP accounting for w1-m1, w1-m2, and w1-m3.

Use project-level grep/tag assignment. Do not use project-name early returns or `test.skip` to let a weaker action pass under a stronger title.

- [ ] **Step 5: Execute focused RED→GREEN loops**

Run each new focused tag first. If it fails, fix the product or evidence boundary and rerun the exact tag. Never change an assertion merely to accept a race; reproduce and fix the ownership/state transition.

Use commands such as:

```bash
npx playwright test e2e/four-seas-regalia-code-battle.spec.ts --project=desktop-chromium-1440x1024 --grep @regalia-storage
npx playwright test e2e/four-seas-regalia-code-battle.spec.ts --project=tablet-webkit-768x1024 --grep @regalia-parity
npx playwright test e2e/four-seas-regalia-code-battle.spec.ts --project=narrow-chromium-320x844 --grep @regalia-narrow
```

Expected final focused result: PASS with no hidden shortcut and no unexpected console/page/request errors.

- [ ] **Step 6: Run full static, build, asset, security, and five-project gates**

Run:

```bash
npm test
npm run typecheck
npm run verify:assets
npm run verify:bundle
npx playwright test --list
npm run test:e2e
npm audit --registry=https://registry.npmjs.org --audit-level=high
git diff --check
```

Expected: every command exits 0. Record exact test counts, browser project counts, generated closure sizes, homepage bytes, and cold response bytes rather than copying the historical baseline.

- [ ] **Step 7: Capture and inspect original-resolution evidence**

Generate tracked screenshots only through the explicit evidence-update path after the same visible successful/wrong run. Inspect all five images at original resolution for correct regalia semantics, transparent edges, no clipping/overflow, nested Blockly visibility, readable feedback, and absence of placeholder/emoji/CSS art. Record dimensions and SHA-256.

- [ ] **Step 8: Write the final verification document with strict exclusions**

The document must contain implementation/evidence SHAs, RED history, exact commands/results, scenario matrix, actual byte budgets/headroom, asset manifest evidence, screenshot review, browser health, residual risk, and these exact completion boundaries:

```text
w1-m3 四海披挂：One-level playable
w1-m1 龙宫求兵：One-level playable regression maintained
w1-m2 定海神针：One-level playable regression maintained
本地 Parent / saves 基础：System loop complete for the previously verified implemented local foundation only
其余 27 关、完整成长/神兽/装备/伙伴/战斗/奖励体系、公开部署：not complete
整站：not complete
```

If any mandatory gate is missing, replace the w1-m3 line with `not complete` and state the exact missing evidence.

- [ ] **Step 9: Commit Task 6**

```bash
git add scripts vite.config.ts e2e docs/verification
git commit -m "test: verify four seas playable level"
```

## Final branch audit

After all six task-level specification and quality reviews pass, dispatch a fresh final reviewer over the entire range from `db631ba` to HEAD. The reviewer must audit the design specification, implementation plan, product code, tests, built assets, generated manifest, browser evidence, and completion wording. Fix every Critical or Important issue through the original responsible implementer and re-review before final verification.

Run once more after the final review fixes:

```bash
npm test
npm run typecheck
npm run verify:assets
npm run verify:bundle
npm run test:e2e
git diff --check
git status --short --branch
```

Do not push, deploy, merge, delete `stash@{0}`, or claim more than the evidence level established above.
