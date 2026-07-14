# Dragon Palace Code Battle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `w1-m1` into a one-level-playable Blockly battle where the real connected workspace is the sole executable input, its trace drives every scene event, and failure, persistence, recovery, reporting, accessibility, assets, and browser evidence form one honest loop.

**Architecture:** Add a pure typed battle protocol and deterministic Dragon Palace state machine, then compile the real Blockly workspace into that protocol. Persist a versioned mission session in strict transactional ProgressV3, render only engine events in Phaser, and integrate the result through a focused `DragonPalaceExperience` while leaving the other 29 missions explicitly outside this slice.

**Tech Stack:** React 19, TypeScript 5.9, Blockly 13, Phaser 3.90, Vitest, Testing Library, Playwright 1.55, Vite 6, built-in image generation/editing tools.

---

## Scope and file map

Create these focused units:

- `src/battle/types.ts`: stable instruction, state, event, result, and diagnostic contracts.
- `src/battle/dragonPalace.ts`: pure Dragon Palace transition engine; never imports course answers, UI, Phaser, or storage.
- `src/blockly/dragonPalaceBlocks.ts`: the three allowed Blockly block definitions and type-to-opcode mapping.
- `src/blockly/compiler.ts`: compile an actual connected workspace into trace items and deterministic diagnostics.
- `src/blockly/draft.ts`: serialize and restore an owned, versioned workspace draft with stable block IDs.
- `src/blockly/workspaceCommands.ts`: append, move, and delete actual Blockly blocks for pointer and keyboard controls.
- `src/progress/session.ts`: pure mission-session updates and parent-support rules.
- `src/components/DragonPalaceExperience.tsx`: orchestration between workspace, compiler, engine, persistence, feedback, and completion.
- `src/components/BattleFeedback.tsx`: accessible compile/runtime feedback and focus return.
- `scripts/check-asset-manifest.mjs`: asset manifest and mission-budget enforcement.
- `docs/assets/asset-manifest.md`: one traceable row per Dragon Palace visual asset, plus explicit residual-risk rows for existing site assets whose original prompts/licenses are still missing.
- `e2e/dragon-palace-code-battle.spec.ts`: real child-style browser evidence.
- `docs/verification/dragon-palace-code-battle.md`: commands, screenshots, evidence level, exclusions, and residual risk.

Modify these existing units only for the listed responsibility:

- `src/progress/types.ts`, `schema.ts`, `storage.ts`, `progress.ts`: ProgressV3, migration, transactional storage, session-aware reporting.
- `src/context/ProgressContext.tsx`: expose session mutations through the existing save/retry truth model.
- `src/components/BlocklyWorkspace.tsx`: replace the hidden React sequence with real-workspace compilation.
- `src/components/GameScene.tsx`: render typed battle events with approved assets.
- `src/App.tsx`: route only `w1-m1` through the new experience and persist unique hint tiers.
- `src/styles.css`: responsive, focus, reduced-motion, and feedback layout.
- `playwright.config.ts`, `package.json`, `scripts/check-bundle-budget.mjs`: exact browser and release gates.

Do not redesign Python, AI lab, growth, rewards, equipment, divine beasts, or the other 29 missions in this plan.

### Task 1: Typed instruction protocol and deterministic battle engine

**Files:**
- Create: `src/battle/types.ts`
- Create: `src/battle/dragonPalace.ts`
- Test: `src/battle/dragonPalace.test.ts`

- [ ] **Step 1: Write failing state-machine tests**

Cover a legal prefix, success, two same-length wrong programs, a repeated instruction, the same instruction in different states, incomplete end, traceability, and the no-punishment invariant.

```ts
const instruction = (opcode: BattleOpcode, id: string): BattleInstruction => ({
  instructionId: `instruction:${id}`,
  sourceBlockId: id,
  opcode,
});

expect(runDragonPalace([instruction('enter_palace', 'a')])).toMatchObject({
  completed: false,
  finalState: 'entered-palace',
  diagnostic: { code: 'program-ended-incomplete' },
});

expect(runDragonPalace([
  instruction('enter_palace', 'a'),
  instruction('request_weapon', 'b'),
  instruction('test_weapon', 'c'),
])).toMatchObject({ completed: true, finalState: 'weapon-tested', diagnostic: null });

const askFirst = runDragonPalace([instruction('request_weapon', 'a'), instruction('enter_palace', 'b')]);
const testFirst = runDragonPalace([instruction('test_weapon', 'a'), instruction('enter_palace', 'b')]);
expect(askFirst.events).not.toEqual(testFirst.events);
expect(askFirst.diagnostic).toMatchObject({ code: 'instruction-rejected', sourceBlockId: 'a' });
expect(askFirst.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
```

- [ ] **Step 2: Run the tests and verify the red state**

Run: `npm run test:unit -- src/battle/dragonPalace.test.ts`

Expected: FAIL because `runDragonPalace` and battle types do not exist.

- [ ] **Step 3: Implement the exact pure protocol**

Use these public contracts:

```ts
export type BattleOpcode = 'enter_palace' | 'request_weapon' | 'test_weapon';
export type DragonPalaceState = 'outside-palace' | 'entered-palace' | 'weapon-requested' | 'weapon-tested';

export interface BattleInstruction {
  instructionId: string;
  sourceBlockId: string;
  opcode: BattleOpcode;
}

export interface BattleEvent {
  type: 'run-started' | 'instruction-accepted' | 'instruction-rejected' | 'state-changed' | 'run-finished';
  state: DragonPalaceState;
  instructionId: string | null;
  sourceBlockId: string | null;
  opcode: BattleOpcode | null;
  messageCode: string;
}

export type BattleDiagnostic =
  | { code: 'instruction-rejected'; concept: 'sequence-precondition'; instructionId: string; sourceBlockId: string }
  | { code: 'program-ended-incomplete'; concept: 'completeness'; instructionId: null; sourceBlockId: string | null };

export interface BattleRunResult {
  completed: boolean;
  finalState: DragonPalaceState;
  events: BattleEvent[];
  diagnostic: BattleDiagnostic | null;
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}
```

Implement transitions only from current state plus opcode:

```ts
const transitions = {
  'outside-palace': { enter_palace: 'entered-palace' },
  'entered-palace': { request_weapon: 'weapon-requested' },
  'weapon-requested': { test_weapon: 'weapon-tested' },
  'weapon-tested': {},
} satisfies Record<DragonPalaceState, Partial<Record<BattleOpcode, DragonPalaceState>>>;
```

`runDragonPalace` must not accept or import `expectedSequence`. A legal short trace returns `program-ended-incomplete`; `test_weapon` reaching `weapon-tested` returns `completed: true` without an extra hidden transition.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm run test:unit -- src/battle/dragonPalace.test.ts && npm run typecheck`

Expected: all focused tests PASS and TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/battle/types.ts src/battle/dragonPalace.ts src/battle/dragonPalace.test.ts
git commit -m "feat: add deterministic dragon palace battle engine"
```

### Task 2: Real Blockly blocks, compiler, draft, and workspace commands

**Files:**
- Create: `src/blockly/dragonPalaceBlocks.ts`
- Create: `src/blockly/compiler.ts`
- Create: `src/blockly/draft.ts`
- Create: `src/blockly/workspaceCommands.ts`
- Test: `src/blockly/compiler.test.ts`
- Test: `src/blockly/draft.test.ts`
- Test: `src/blockly/workspaceCommands.test.ts`

- [ ] **Step 1: Write failing compiler and workspace tests**

Use a headless `Blockly.Workspace` in tests. Assert that actual connected blocks produce the trace; moving, deleting, multiple top chains, invalid type, and empty workspaces change the compile result.

```ts
const workspace = new Blockly.Workspace();
registerDragonPalaceBlocks(Blockly);
const first = appendActionBlock(workspace, 'xiyou_enter_palace');
const second = appendActionBlock(workspace, 'xiyou_request_weapon');
expect(compileDragonPalaceWorkspace(workspace)).toEqual({
  ok: true,
  trace: [
    { instructionId: `instruction:${first.id}`, sourceBlockId: first.id, opcode: 'enter_palace' },
    { instructionId: `instruction:${second.id}`, sourceBlockId: second.id, opcode: 'request_weapon' },
  ],
});

moveActionBlock(workspace, second.id, -1);
expect(compileDragonPalaceWorkspace(workspace)).toMatchObject({
  ok: true,
  trace: [{ opcode: 'request_weapon' }, { opcode: 'enter_palace' }],
});
```

Add draft round-trip coverage that preserves block IDs, opcodes, next links, and recompiled trace.

- [ ] **Step 2: Verify the new tests fail**

Run: `npm run test:unit -- src/blockly/compiler.test.ts src/blockly/draft.test.ts src/blockly/workspaceCommands.test.ts`

Expected: FAIL because the Blockly units do not exist.

- [ ] **Step 3: Define three non-editable action blocks**

Export this mapping and register blocks once:

```ts
export const DRAGON_BLOCK_OPCODE = {
  xiyou_enter_palace: 'enter_palace',
  xiyou_request_weapon: 'request_weapon',
  xiyou_test_weapon: 'test_weapon',
} as const;

export type DragonBlockType = keyof typeof DRAGON_BLOCK_OPCODE;
```

Each block uses a fixed label, `previousStatement: null`, `nextStatement: null`, and no editable opcode field. UI labels may be Chinese; execution uses only the block type mapping.

- [ ] **Step 4: Implement deterministic compilation and diagnostics**

Use this result shape:

```ts
export type CompileDiagnosticCode = 'unknown-block' | 'invalid-connection' | 'multiple-top-level' | 'empty-workspace';

export type CompileResult =
  | { ok: true; trace: BattleInstruction[] }
  | { ok: false; trace: []; diagnostics: Array<{ code: CompileDiagnosticCode; sourceBlockId: string | null; concept: 'program-structure' }> };
```

Apply this diagnostic priority: unknown block, invalid connection, multiple top-level chain, empty workspace. Treat every isolated or disconnected chain as another top-level chain. Walk only actual `getNextBlock()` links and derive `instructionId` as `instruction:${block.id}`.

- [ ] **Step 5: Implement owned draft and actual-workspace mutations**

Persist this owned format rather than an opaque second answer array:

```ts
export interface WorkspaceDraftV1 {
  version: 1;
  blocks: Array<{
    id: string;
    type: DragonBlockType;
    nextId: string | null;
    x: number;
    y: number;
  }>;
}
```

`saveWorkspaceDraft` reads actual blocks and connections. `loadWorkspaceDraft` recreates blocks with the saved IDs and connects only the saved `nextId` edges. `appendActionBlock`, `moveActionBlock`, and `deleteActionBlock` must mutate the same workspace and then recompile it; they must not return or maintain an alternative sequence.

- [ ] **Step 6: Run focused verification**

Run: `npm run test:unit -- src/blockly/compiler.test.ts src/blockly/draft.test.ts src/blockly/workspaceCommands.test.ts && npm run typecheck`

Expected: focused tests PASS; typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/blockly src/battle/types.ts
git commit -m "feat: compile real dragon palace blockly programs"
```

### Task 3: Strict ProgressV3 mission-session schema and migrations

**Files:**
- Modify: `src/progress/types.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/schema.test.ts`
- Modify: `src/progress/progress.test.ts`

- [ ] **Step 1: Write failing V3 schema tests**

Add tests for fresh V3 round-trip; V1/V2 to V3 migration; stable Blockly IDs; exact session keys; invalid mission IDs; unsafe counters; duplicate hint tiers; unknown opcodes; broken `nextId`; malformed timestamps; and input-tree isolation.

```ts
const migrated = migrateProgress(validV2);
expect(migrated).toMatchObject({ version: 3, schemaRevision: 1, sessions: {} });

const invalid = { ...createInitialProgress(), sessions: { unknown: validSession } };
expect(() => migrateProgress(invalid)).toThrow('未知任务 unknown');
```

- [ ] **Step 2: Verify schema tests fail before implementation**

Run: `npm run test:unit -- src/progress/schema.test.ts src/progress/progress.test.ts`

Expected: FAIL because current parsing returns ProgressV2 and has no sessions.

- [ ] **Step 3: Add exact ProgressV3 types**

Define `ProgressV3` as V2 fields plus `version: 3`, `schemaRevision: 1`, and `sessions: Record<string, MissionSession>`. Use these session fields:

```ts
export interface MissionSession {
  workspace: WorkspaceDraftV1;
  lastTrace: BattleInstruction[];
  lastRun: BattleRunResult | null;
  totalRuns: number;
  runtimeFailures: number;
  compileFailures: number;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  conceptFailures: {
    programStructure: number;
    sequencePrecondition: number;
    completeness: number;
  };
  lastRunAt: string | null;
  savedAt: string;
}
```

Make `ProgressDocument = ProgressV1 | ProgressV2 | ProgressV3` and move runtime APIs to `ProgressV3`.

- [ ] **Step 4: Implement strict parser and migration**

`createInitialProgress()` returns V3 with empty sessions. `migrateProgress` accepts only versions 1, 2, and 3. V1/V2 migrate without data loss and gain `sessions: {}`. Parse every nested field with exact-key validation, canonical UTC dates, safe integers, known mission IDs, known block types/opcodes, unique block IDs, and valid `nextId` references.

- [ ] **Step 5: Update progress rules without changing other missions**

Change `completeMission`, `isMissionUnlocked`, export/import, and weekly reports to accept ProgressV3. Preserve existing best-star behavior. For `w1-m1`, parent support also includes session concepts marked by the Task 5 threshold; other missions keep current behavior.

- [ ] **Step 6: Run focused and existing progress tests**

Run: `npm run test:unit -- src/progress/schema.test.ts src/progress/progress.test.ts && npm run typecheck`

Expected: all progress tests PASS and no V2 runtime type remains.

- [ ] **Step 7: Commit**

```bash
git add src/progress/types.ts src/progress/schema.ts src/progress/progress.ts src/progress/schema.test.ts src/progress/progress.test.ts
git commit -m "feat: add strict progress v3 mission sessions"
```

### Task 4: Transactional V3 storage and legacy preservation

**Files:**
- Modify: `src/progress/storage.ts`
- Modify: `src/progress/storage.test.ts`

- [ ] **Step 1: Write failing transactional migration tests**

Cover valid V2 current migration to V3, V1 import, V2 import, V3 import, byte-preserved corrupt V3 download, snapshot recovery with session data, reopen after recovery, old V2 corrupt-envelope visibility, write failure rollback, and no deletion of legacy keys.

```ts
storage.setItem(LEGACY_V2_CURRENT_KEY, JSON.stringify(validV2));
const result = loadProgressTransaction(storage, clock);
expect(result.status).toBe('migrated');
expect(result.progress.version).toBe(3);
expect(storage.getItem(LEGACY_V2_CURRENT_KEY)).toBe(JSON.stringify(validV2));
expect(parseProgress(storage.getItem(CURRENT_PROGRESS_KEY)!)).toEqual(result.progress);
```

- [ ] **Step 2: Run storage tests and confirm failure**

Run: `npm run test:unit -- src/progress/storage.test.ts`

Expected: FAIL because current keys and result types are V2-only.

- [ ] **Step 3: Introduce V3 keys without destroying V2 evidence**

Use:

```ts
export const CURRENT_PROGRESS_KEY = 'xiyou-programming-progress-v3';
export const SNAPSHOT_PROGRESS_KEY = 'xiyou-programming-progress-snapshot-v3';
export const CORRUPT_PROGRESS_KEY = 'xiyou-programming-progress-corrupt-v3';
export const LEGACY_V2_CURRENT_KEY = 'xiyou-programming-progress-v2';
export const LEGACY_V2_SNAPSHOT_KEY = 'xiyou-programming-progress-snapshot-v2';
export const LEGACY_V2_CORRUPT_KEY = 'xiyou-programming-progress-corrupt-v2';
```

Load V3 first. If absent, migrate a valid V2 current or legacy V1 through the same write-and-verify transaction. Preserve all old keys. Continue exposing a valid old corrupt envelope until the user downloads or clears it through the existing protected flow.

- [ ] **Step 4: Update all transaction result types**

Every returned progress value is ProgressV3. Import `sourceVersion` is `1 | 2 | 3`. Snapshot-before-current, corrupt-source protection, exact rollback, backup-before-clear, retry, and clear uncertainty semantics remain unchanged.

- [ ] **Step 5: Run the full storage regression set**

Run: `npm run test:unit -- src/progress/storage.test.ts src/progress/schema.test.ts && npm run typecheck`

Expected: storage and schema tests PASS; typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/progress/storage.ts src/progress/storage.test.ts
git commit -m "feat: migrate transactional storage to progress v3"
```

### Task 5: Pure session counters, hints, support rules, and context persistence

**Files:**
- Create: `src/progress/session.ts`
- Create: `src/progress/session.test.ts`
- Modify: `src/context/ProgressContext.tsx`
- Modify: `src/context/ProgressContext.test.tsx`

- [ ] **Step 1: Write failing session-rule tests**

Lock the approved meanings:

```ts
const afterCompileFailure = recordCompileFailure(initial, 'program-structure', now);
expect(afterCompileFailure).toMatchObject({ compileFailures: 1, totalRuns: 0 });

const afterRuntimeFailure = recordRun(initial, rejectedRun, trace, now);
expect(afterRuntimeFailure).toMatchObject({ runtimeFailures: 1, totalRuns: 1 });

const once = recordHint(initial, 'observe', now);
const twice = recordHint(once, 'observe', now);
expect(twice.usedHintTiers).toEqual(['observe']);

expect(getSessionSupport({ ...initial, conceptFailures: { ...initial.conceptFailures, sequencePrecondition: 2 } }))
  .toContain('顺序与前置条件');
```

Also assert safe-integer overflow rejection and immutable updates.

- [ ] **Step 2: Run focused tests and confirm red**

Run: `npm run test:unit -- src/progress/session.test.ts src/context/ProgressContext.test.tsx`

Expected: FAIL because session helpers and context methods do not exist.

- [ ] **Step 3: Implement pure session updates**

Export:

```ts
export function createMissionSession(now: string): MissionSession;
export function updateWorkspaceDraft(session: MissionSession, workspace: WorkspaceDraftV1, now: string): MissionSession;
export function recordCompileFailure(session: MissionSession, concept: 'program-structure', now: string): MissionSession;
export function recordRun(session: MissionSession, result: BattleRunResult, trace: BattleInstruction[], now: string): MissionSession;
export function recordHint(session: MissionSession, tier: 'observe' | 'think' | 'partial', now: string): MissionSession;
export function getSessionSupport(session: MissionSession): string[];
```

Increment `totalRuns` only when the engine starts. Increment runtime failures for `instruction-rejected` and `program-ended-incomplete`. Mark support when one concept reaches two failures or at least two distinct hint tiers were used.

- [ ] **Step 4: Expose truthful context mutations**

Add these methods to `ProgressContextValue`:

```ts
updateMissionSession: (missionId: string, update: (session: MissionSession) => MissionSession) => SaveResult;
recordMissionHint: (missionId: string, tier: 'observe' | 'think' | 'partial') => SaveResult;
```

They must use the existing `commit` path, preserve in-memory unsaved data on storage failure, expose `saveStatus/saveError`, and work with `retrySave`.

- [ ] **Step 5: Run focused and context tests**

Run: `npm run test:unit -- src/progress/session.test.ts src/context/ProgressContext.test.tsx && npm run typecheck`

Expected: PASS, including unsaved session mutation followed by successful retry.

- [ ] **Step 6: Commit**

```bash
git add src/progress/session.ts src/progress/session.test.ts src/context/ProgressContext.tsx src/context/ProgressContext.test.tsx
git commit -m "feat: persist honest mission session evidence"
```

### Task 6: Replace hidden Blockly sequence with the real workspace

**Files:**
- Modify: `src/components/BlocklyWorkspace.tsx`
- Create: `src/components/BlocklyWorkspace.test.tsx`
- Create: `src/components/BattleFeedback.tsx`
- Create: `src/components/BattleFeedback.test.tsx`

- [ ] **Step 1: Write failing component tests**

Test through an injected workspace adapter so jsdom can assert the production behavior without a fake answer array:

- adding a command creates a real block and connects it;
- moving and deleting commands changes compiler output;
- run submits only `compileDragonPalaceWorkspace(workspace)`;
- multiple top chains block the engine call;
- feedback returns focus to `sourceBlockId`;
- draft changes call persistence;
- no `sequence` React state or `xiyou-workspace-*` direct write remains.

```ts
await user.click(screen.getByRole('button', { name: '加入：进入龙宫' }));
await user.click(screen.getByRole('button', { name: '加入：请求兵器' }));
await user.click(screen.getByRole('button', { name: '执行战斗指令' }));
expect(onRun).toHaveBeenCalledWith(expect.objectContaining({
  ok: true,
  trace: [{ opcode: 'enter_palace' }, { opcode: 'request_weapon' }],
}));
```

- [ ] **Step 2: Verify component tests fail**

Run: `npm run test:unit -- src/components/BlocklyWorkspace.test.tsx src/components/BattleFeedback.test.tsx`

Expected: FAIL against the current hidden `sequence` implementation.

- [ ] **Step 3: Implement the real-workspace props and controls**

Use this contract:

```ts
interface Props {
  missionId: 'w1-m1';
  draft: WorkspaceDraftV1;
  onDraftChange: (draft: WorkspaceDraftV1) => { status: 'saved' | 'unsaved' };
  onRun: (result: CompileResult) => void;
  focusBlockId: string | null;
  onFocusHandled: () => void;
}
```

The visible command controls must call `appendActionBlock`, `moveActionBlock`, or `deleteActionBlock` on the injected Blockly workspace. The ordered accessible list is regenerated from compiler output after each mutation. The run button compiles the current workspace at click time.

- [ ] **Step 4: Implement deterministic legacy workspace migration**

On first `w1-m1` open only, inspect `xiyou-workspace-w1-m1`. Load it into a temporary Blockly workspace, reject unknown/malformed blocks, convert it to `WorkspaceDraftV1`, and call `onDraftChange`. Remove the legacy key only after the returned context save result is `saved`; otherwise leave the original bytes untouched and show the normal unsaved state.

The only accepted legacy block is `xiyou_action`, with this exact label migration:

```ts
const LEGACY_ACTION_LABELS = {
  '进入龙宫': 'xiyou_enter_palace',
  '请求兵器': 'xiyou_request_weapon',
  '试用兵器': 'xiyou_test_weapon',
} as const;
```

Reject every other legacy label or block type and preserve the original key for backup; never guess an opcode from arbitrary text.

- [ ] **Step 5: Implement accessible feedback**

`BattleFeedback` uses `role="alert"` for failures, maps diagnostic codes to fixed child-language copy, contains a “回到问题积木” button only when a real `sourceBlockId` exists, and otherwise focuses the workspace or last valid block for `program-ended-incomplete`.

- [ ] **Step 6: Run focused tests, forbidden-path scan, and typecheck**

Run: `npm run test:unit -- src/components/BlocklyWorkspace.test.tsx src/components/BattleFeedback.test.tsx && ! rg -n "useState<string\[\]>|xiyou-workspace-" src/components/BlocklyWorkspace.tsx && npm run typecheck`

Expected: component tests PASS; the forbidden-path scan returns no matches; typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/BlocklyWorkspace.tsx src/components/BlocklyWorkspace.test.tsx src/components/BattleFeedback.tsx src/components/BattleFeedback.test.tsx
git commit -m "feat: make the blockly workspace the executable source"
```

### Task 7: Generate and gate formal Dragon Palace assets

**Required sub-skill:** `imagegen`. Use the environment's built-in image generation/editing tool for every formal illustration in this task.

**Files:**
- Create: `public/assets/dragon-palace/background.webp`
- Create: `public/assets/dragon-palace/wukong.webp`
- Create: `public/assets/dragon-palace/dragon-king.webp`
- Create: `public/assets/dragon-palace/weapons.webp`
- Create: `public/assets/dragon-palace/effects.webp`
- Create: `docs/assets/asset-manifest.md`
- Create: `scripts/check-asset-manifest.mjs`
- Create: `scripts/check-asset-manifest.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing asset-gate tests**

Test that the gate rejects a missing manifest row, duplicate stable ID, missing hash, hash mismatch, non-`visual-qa-passed` shipping asset, an extra build asset, a raster over 512 KiB, mission media over 1.25 MiB, and a prohibited shipping format.

```js
assert.throws(() => verifyAssetManifest({ manifestRows: [], publicFiles: ['assets/dragon-palace/background.webp'] }), /missing manifest row/i);
assert.throws(() => verifyAssetManifest({ manifestRows: [row, row], publicFiles: [row.assetId] }), /duplicate asset id/i);
```

- [ ] **Step 2: Run the gate test and confirm failure**

Run: `node --test scripts/check-asset-manifest.test.mjs`

Expected: FAIL because the manifest checker does not exist.

- [ ] **Step 3: Implement the manifest checker before generating assets**

Parse a Markdown table with these exact columns:

```text
Asset ID | SHA-256 | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots | QA status
```

Require exactly one row per Dragon Palace shipping asset, exact SHA-256 match, allowed extension, file size at most 512 KiB, and total `public/assets/dragon-palace` image/audio size at most 1.25 MiB. Export the pure verifier for Node tests. Add `test:assets` for checker tests, `check:assets` for hashes/provenance/budgets with `provenance-verified` accepted, and `verify:assets` for the final Task 10 gate that additionally requires `visual-qa-passed`.

Record the existing `world-map.jpg`, `mentor.jpg`, `young-hero.jpg`, and three audio files in a separate residual-risk section using their known derivation evidence. Do not mark them `visual-qa-passed` because original generation prompts/licenses remain missing. The checker for this one-level slice gates `public/assets/dragon-palace`; the global asset-to-build gate remains `not complete` until those existing site assets are replaced or their provenance is recovered.

- [ ] **Step 4: Generate the formal asset family with the built-in image tool**

Use one consistent art direction in every prompt: “commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.”

Generate:

- a 1600×900 layered Dragon Palace trial hall background with clear left hero zone, center weapon zone, and right Dragon King zone;
- a transparent 640×640 young Wukong character matching the existing approved age and costume direction;
- a transparent 640×640 Dragon King character with friendly authority rather than menace;
- a transparent 1024×512 three-weapon sheet with spear, halberd, and heavy staff in separated equal cells;
- a transparent 1024×512 feedback sheet with accepted, blocked, and success effects in separated equal cells.

Inspect every generated image visually before conversion. Reject and regenerate inconsistent anatomy, unreadable weapons, accidental text, merged cells, or background contamination. Convert accepted outputs to WebP without changing content and keep generation sources outside `public/`.

- [ ] **Step 5: Record real hashes and visual-QA evidence**

Run `shasum -a 256 public/assets/dragon-palace/*.webp` and `sips -g pixelWidth -g pixelHeight public/assets/dragon-palace/*.webp`. Insert the returned values, exact prompts/tool references, dimensions, provenance, and screen slots into `docs/assets/asset-manifest.md`; do not insert sample hashes. Mark `visual-qa-passed` only after actual-file inspection and Task 10 screenshots at 320, 390, 768, and 1440 are available. Until then keep generated rows at `provenance-verified` and do not claim this task release-complete.

- [ ] **Step 6: Run asset tests and budget check**

Run: `node --test scripts/check-asset-manifest.test.mjs && npm run check:assets`

Expected: checker tests PASS and the provenance/hash/budget check passes while rows remain `provenance-verified`. Task 10 alone promotes approved rows and runs `verify:assets`.

- [ ] **Step 7: Commit generated, provenance-verified assets and gate**

```bash
git add public/assets/dragon-palace docs/assets/asset-manifest.md scripts/check-asset-manifest.mjs scripts/check-asset-manifest.test.mjs package.json
git commit -m "feat: add provenance-gated dragon palace art"
```

### Task 8: Event-driven Phaser scene

**Files:**
- Modify: `src/components/GameScene.tsx`
- Modify: `src/components/GameScene.test.tsx`

- [ ] **Step 1: Replace active-step tests with event-trace tests**

Assert that assets load from `assets/dragon-palace`, accepted events update the expected actor/weapon, rejected events do not advance state, same-length wrong traces produce different scene states, replay does not rebuild Phaser, reduced motion uses immediate state changes, mute suppresses audio, and unmount destroys once.

```tsx
const view = render(<GameScene events={acceptedEvents} replayToken={1} reducedMotion={false} muted={false} />);
expect(screen.getByRole('img', { name: '龙宫试兵代码执行场景' })).toHaveAttribute('data-scene-state', 'weapon-requested');
view.rerender(<GameScene events={rejectedEvents} replayToken={2} reducedMotion muted />);
expect(screen.getByRole('img', { name: '龙宫试兵代码执行场景' })).toHaveAttribute('data-scene-state', 'outside-palace');
```

- [ ] **Step 2: Run the scene tests and verify failure**

Run: `npm run test:unit -- src/components/GameScene.test.tsx`

Expected: FAIL because the scene still accepts only `activeStep`.

- [ ] **Step 3: Implement event-only scene rendering**

Use this prop contract:

```ts
interface GameSceneProps {
  events: BattleEvent[];
  replayToken: number;
  reducedMotion: boolean;
  muted: boolean;
  onPlaybackComplete?: () => void;
}
```

Preload only manifest-approved assets. Apply each event in order. Standard mode uses Phaser tween/timeline callbacks; reduced motion applies the same state changes immediately. `instruction-rejected` shows the blocked effect and preserves the prior state. Expose an ARIA live text transcript and `data-scene-state` derived from the last applied event for browser evidence, not for success decisions.

- [ ] **Step 4: Run scene, asset, and type verification**

Run: `npm run test:unit -- src/components/GameScene.test.tsx && node --test scripts/check-asset-manifest.test.mjs && npm run typecheck`

Expected: focused tests PASS and typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/GameScene.tsx src/components/GameScene.test.tsx
git commit -m "feat: render battle events in the dragon palace scene"
```

### Task 9: Integrate the one-level loop and parent report

**Files:**
- Create: `src/components/DragonPalaceExperience.tsx`
- Create: `src/components/DragonPalaceExperience.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing complete-loop component tests**

Cover compile failure, same-length runtime failure, focus return, incomplete trace, correction, playback completion, success, persistence, refresh restoration, unique hint tiers, unsaved banner/retry, next unlock, and parent support.

```tsx
await childAdds('请求兵器', '进入龙宫', '试用兵器');
await user.click(screen.getByRole('button', { name: '执行战斗指令' }));
expect(await screen.findByText('还没有进入龙宫，龙王听不到请求。')).toBeVisible();
expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();

await childMoves('进入龙宫', '上移');
await user.click(screen.getByRole('button', { name: '执行战斗指令' }));
expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeVisible();
expect(readStoredProgress().sessions['w1-m1'].totalRuns).toBe(2);
```

- [ ] **Step 2: Run the integration tests and confirm red**

Run: `npm run test:unit -- src/components/DragonPalaceExperience.test.tsx src/App.test.tsx src/progress/progress.test.ts`

Expected: FAIL because `w1-m1` still uses `validateSequence` and local hint state.

- [ ] **Step 3: Implement `DragonPalaceExperience` orchestration**

The component reads `progress.sessions['w1-m1']` or creates an initial session. On draft changes, persist through `updateMissionSession`. On compile failure, record one compile failure and show `BattleFeedback`. On compile success, call `runDragonPalace`, persist trace/result/counters, pass its events to `GameScene`, and complete only after playback ends with `result.completed === true`.

Calculate stars from distinct hint tiers: zero tiers gives 3, one gives 2, two or three gives 1. Do not use a local resettable hint count.

- [ ] **Step 4: Route only the first mission through the new loop**

In `MissionPageContent`, render `DragonPalaceExperience` only when `mission.id === 'w1-m1'`. Keep existing tools for the other 29 missions and retain their `not complete` status. Remove `activeStep` from the first mission path. Change `HintPanel` to report the stable tier key and call `recordMissionHint('w1-m1', tier)` once per distinct tier.

- [ ] **Step 5: Add session-aware parent reporting**

For week 1, merge `getSessionSupport(progress.sessions['w1-m1'])` into `needsSupport`. Display “运行 N 次 · 调整 N 次” for the first mission, where adjustments equal `compileFailures + runtimeFailures`, without exposing code text. Keep the report behind the existing PIN.

- [ ] **Step 6: Implement responsive and focus styling**

Add styles for `.dragon-palace-experience`, `.battle-transcript`, `.block-program-list`, `.block-program-actions`, `.battle-feedback`, and `.unsaved-session`. At 600px and below enforce scene → controls → program → feedback. Add visible `:focus-visible` states and ensure reduced motion does not remove state feedback.

- [ ] **Step 7: Run integration and full unit regression**

Run: `npm run test:unit -- src/components/DragonPalaceExperience.test.tsx src/App.test.tsx src/progress/progress.test.ts && npm test && npm run typecheck`

Expected: focused tests PASS; full unit/bundle-script suite PASS; typecheck exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/DragonPalaceExperience.tsx src/components/DragonPalaceExperience.test.tsx src/App.tsx src/App.test.tsx src/progress/progress.ts src/progress/progress.test.ts src/styles.css
git commit -m "feat: complete the dragon palace code battle loop"
```

### Task 10: Browser matrix, budgets, visual QA, and evidence

**Files:**
- Create: `e2e/dragon-palace-code-battle.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `scripts/check-bundle-budget.mjs`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `docs/assets/asset-manifest.md`
- Create: `docs/verification/dragon-palace-code-battle.md`
- Create: `docs/verification/screenshots/dragon-palace-320.png`
- Create: `docs/verification/screenshots/dragon-palace-390.png`
- Create: `docs/verification/screenshots/dragon-palace-768.png`
- Create: `docs/verification/screenshots/dragon-palace-1440.png`

- [ ] **Step 1: Write failing Playwright paths before implementation adjustments**

Use visible controls that mutate real Blockly. Never inject completion state, call engine functions from the page, or write a correct workspace directly.

The full path must perform: wrong real program → rejected scene state → focus actual block → move/delete/add actual block → success → refresh → same IDs/trace → next mission unlocked → PIN-protected parent support. Add export/import, unsaved/retry, and V3 corrupt-session recovery with original-byte download.

- [ ] **Step 2: Define the exact browser matrix**

Keep the four existing projects and add:

```ts
{ name: 'narrow-chromium-320x844', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true } }
```

Run the full correction/success/refresh/report path on Chromium 1440, Chromium 390, Firefox 1440, and WebKit 768. Run the complete open-to-success path plus overflow checks at Chromium 320. Run keyboard-only editing at Chromium 1440 and Firefox 1440. Run reduced-motion/mute parity at Chromium 390 and WebKit 768. Run full corrupt V3 preservation/recovery at Chromium 1440 and recovery smoke at Firefox 1440/WebKit 768.

- [ ] **Step 3: Add cold mission transfer budgets**

Extend budget tests first, then enforce:

```js
export const DRAGON_PALACE_COLD_BYTES = 2.5 * 1024 * 1024;
export const DRAGON_PALACE_MEDIA_BYTES = 1.25 * 1024 * 1024;
export const SINGLE_RASTER_BYTES = 512 * 1024;
```

Playwright disables cache and sums actual response bodies for a cold `w1-m1` load. The check fails above 2.5 MiB. Static asset verification fails if mission image/audio totals exceed 1.25 MiB or a raster exceeds 512 KiB.

- [ ] **Step 4: Run E2E red and fix only real product defects**

Run: `npm run test:e2e -- e2e/dragon-palace-code-battle.spec.ts`

Expected initially: failures identify missing browser behavior, focus, layout, recovery, or budgets. Fix product code and tests only where the browser demonstrates a real defect; do not weaken assertions or add hidden shortcuts.

- [ ] **Step 5: Capture and inspect visual evidence**

Run with `XIYOU_UPDATE_EVIDENCE=1` and capture the successful battle state at 320, 390, 768, and 1440. Inspect every screenshot for cropping, clarity, character consistency, readable blocks/feedback, and absence of placeholders. If any asset fails, regenerate or edit it with the built-in image tool and update its real hash.

Only after all four screenshots pass visual review, change the five Dragon Palace manifest rows from `provenance-verified` to `visual-qa-passed`.

- [ ] **Step 6: Run complete fresh verification**

Run exactly:

```bash
npm test
npm run typecheck
npm run verify:assets
npm run verify:bundle
npm run test:e2e
git diff --check
rg -n "emoji|placeholder|TO""DO|TB""D|xiyou-workspace-|useState<string\[\]>" src public docs/assets scripts e2e
git status --short --branch
```

Expected: unit and script tests pass; typecheck exits 0; asset and bundle gates pass; all five Playwright projects pass with zero skips; `git diff --check` is clean; the scan reports no shipping placeholder or hidden-sequence implementation; only intentional tracked task changes remain before commit.

- [ ] **Step 7: Write evidence without overstating completion**

In `docs/verification/dragon-palace-code-battle.md`, record command outputs and counts, browser projects, cold bytes, asset totals, screenshots, failure/recovery evidence, and residual risk. Explicitly record that existing global site images/audio still lack original prompt/license evidence and therefore block commercial production completion. State exactly:

```text
w1-m1 龙宫试兵：One-level playable
其余 29 关、Python、AI、成长奖励、装备、神兽、完整战斗系统与公开部署：not complete
整站：not complete
```

- [ ] **Step 8: Commit final evidence and gates**

```bash
git add e2e/dragon-palace-code-battle.spec.ts playwright.config.ts scripts/check-bundle-budget.mjs scripts/check-bundle-budget.test.mjs docs/assets/asset-manifest.md docs/verification/dragon-palace-code-battle.md docs/verification/screenshots
git commit -m "test: verify dragon palace code battle in browsers"
```

## Per-task subagent review loop

For every task above:

1. Dispatch a fresh implementer subagent with only that task, the design spec, this plan, and current repository status.
2. Require the implementer to follow TDD, run the task's commands, inspect its own diff, commit, and report exact evidence.
3. Dispatch a fresh specification reviewer. If it finds a gap, send the findings back to the same implementer, require a fix commit, and repeat specification review.
4. After specification approval, dispatch a fresh quality reviewer. If it finds an issue, send it back to the same implementer, require a fix commit, and repeat quality review.
5. Independently inspect the diff and rerun task verification before starting the next task.
6. Never run two implementer tasks in parallel because later tasks depend on earlier contracts.

## Final completion boundary

After Task 10, invoke `verification-before-completion`, `requesting-code-review`, and `finishing-a-development-branch`. Do not push. Do not mark the overall commercial-site goal complete. Offer the standard branch options only after all fresh verification and final review evidence exists.
