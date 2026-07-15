# w1-m2 Ruyi Staff Code Battle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `w1-m2` from the explicitly labelled legacy sequence shell to one complete real-Blockly, code-driven Ruyi Staff battle with Progress V3 persistence and five-project browser evidence.

**Architecture:** Keep the verified `w1-m1` vertical slice intact while adding mission-specific `w1-m2` blocks, compiler rules, deterministic runner, and scene semantics. Share only the established contracts: stable block provenance, transactional mission sessions, failure feedback, storage coordination, and lazy loading. Progress V3 dispatches validation by mission ID so one mission can never execute the other mission's blocks or canonical run.

**Tech Stack:** React 19, TypeScript 5.9, Blockly 13, Phaser 3.90, Vitest 4, Testing Library, Vite 6, Playwright 1.55, existing Progress V3/Web Locks/revision-CAS storage modules.

---

## File map

- `src/battle/ruyiStaff.ts` and `.test.ts`: deterministic second-mission state machine.
- `src/blockly/ruyiStaffBlocks.ts`: w1-m2 block types, labels, and opcode catalogue.
- `src/blockly/ruyiStaffCompiler.ts` and `.test.ts`: compile the one visible connected chain.
- `src/blockly/ruyiStaffDraft.ts` and `.test.ts`: lossless, mission-specific V3 draft serialization.
- `src/progress/types.ts`, `session.ts`, `schema.ts` and tests: mission-aware V3 session union, canonical validation, recovery, counters, and parent support.
- `src/components/RuyiStaffExperience.tsx` and tests: run/save/playback/completion orchestration.
- `src/components/RuyiStaffBlocklyWorkspace.tsx` and tests: real Blockly host plus keyboard/touch controls that mutate the same workspace.
- `src/components/RuyiStaffScene.tsx` and tests: event-driven Phaser presentation using approved Dragon Palace rasters.
- `src/components/RuyiStaffFeedback.tsx` and tests: compile/runtime child-facing feedback and block focus.
- `src/App.tsx`, `App.test.tsx`, `styles.css`, `progress/progress.ts` and tests: lazy route, w1-m3 unlock, parent report, accessibility, and responsive layout.
- `scripts/budget-limits.mjs`, `scripts/check-bundle-budget.mjs` and tests: fixed w1-m2 cold and scene closure budgets without changing w1-m1.
- `docs/assets/asset-manifest.md`: trace the already approved five rasters to their new w1-m2 slots.
- `e2e/ruyi-staff-code-battle.spec.ts`, `playwright.config.ts`: five-project real child path and focused failure/recovery/performance paths.
- `docs/verification/ruyi-staff-code-battle.md`: final evidence and strict completion boundary.

### Task 1: Build the mission-specific Blockly and deterministic battle domain

**Files:**
- Create: `src/battle/ruyiStaff.ts`
- Create: `src/battle/ruyiStaff.test.ts`
- Create: `src/blockly/ruyiStaffBlocks.ts`
- Create: `src/blockly/ruyiStaffCompiler.ts`
- Create: `src/blockly/ruyiStaffCompiler.test.ts`
- Create: `src/blockly/ruyiStaffDraft.ts`
- Create: `src/blockly/ruyiStaffDraft.test.ts`
- Modify: `src/battle/types.ts`

- [ ] **Step 1: Write the failing runner tests**

Add tests that construct instructions with stable IDs and assert the exact states, events, diagnostic source, and zero penalty:

```ts
const instruction = (sourceBlockId: string, opcode: RuyiStaffOpcode): BattleInstruction => ({
  instructionId: `instruction:${sourceBlockId}`,
  sourceBlockId,
  opcode,
})

it('completes only after inspecting, choosing 13500, and shrinking', () => {
  const result = runRuyiStaffBattle([
    instruction('inspect', 'inspect_weights'),
    instruction('staff', 'choose_ruyi_staff'),
    instruction('shrink', 'shrink_ruyi_staff'),
  ])
  expect(result).toMatchObject({
    completed: true,
    finalState: 'ruyi-staff-shrunk',
    diagnostic: null,
    penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
  })
})

it.each(['choose_sabre', 'choose_halberd'] as const)(
  'shows the wrong selected weapon for %s and stops on that real block',
  (opcode) => {
    const result = runRuyiStaffBattle([
      instruction('inspect', 'inspect_weights'),
      instruction('wrong', opcode),
      instruction('shrink', 'shrink_ruyi_staff'),
    ])
    expect(result).toMatchObject({
      completed: false,
      finalState: 'wrong-weapon-selected',
      diagnostic: {
        type: 'instruction-rejected',
        sourceBlockId: 'wrong',
        opcode,
      },
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    })
  },
)
```

Also cover choose-before-inspect, shrink-before-choose, repeated actions, incomplete programs, immutable input, and deterministic repeated runs.

- [ ] **Step 2: Run the runner tests and record RED**

Run:

```bash
npx vitest run src/battle/ruyiStaff.test.ts
```

Expected: FAIL because `runRuyiStaffBattle`, `RuyiStaffOpcode`, and the second-mission state types do not exist.

- [ ] **Step 3: Implement the minimal deterministic runner and shared union types**

Extend `src/battle/types.ts` with the second opcode/state members while keeping the existing Dragon Palace exports valid:

```ts
export type RuyiStaffOpcode =
  | 'inspect_weights'
  | 'choose_sabre'
  | 'choose_halberd'
  | 'choose_ruyi_staff'
  | 'shrink_ruyi_staff'

export type RuyiStaffState =
  | 'awaiting-inspection'
  | 'weights-inspected'
  | 'wrong-weapon-selected'
  | 'ruyi-staff-selected'
  | 'ruyi-staff-shrunk'

export type BattleOpcode = DragonPalaceOpcode | RuyiStaffOpcode
export type BattleState = DragonPalaceState | RuyiStaffState
```

Implement `runRuyiStaffBattle()` as a pure transition loop. A wrong weapon emits `instruction-rejected` at `wrong-weapon-selected`; other illegal transitions reject at the current state. Every run starts at `awaiting-inspection`, ends with one `run-finished`, and returns the fixed zero penalty.

- [ ] **Step 4: Write compiler and draft tests before their implementation**

Register these exact types and labels:

```ts
export const RUYI_BLOCK_OPCODE = {
  xiyou_inspect_weights: 'inspect_weights',
  xiyou_choose_sabre: 'choose_sabre',
  xiyou_choose_halberd: 'choose_halberd',
  xiyou_choose_ruyi_staff: 'choose_ruyi_staff',
  xiyou_shrink_ruyi_staff: 'shrink_ruyi_staff',
} as const
```

Tests must create a real `Blockly.Workspace`, connect blocks, and prove:

```ts
expect(compileRuyiStaffWorkspace(workspace)).toEqual({
  ok: true,
  trace: [
    { instructionId: 'instruction:inspect', sourceBlockId: 'inspect', opcode: 'inspect_weights' },
    { instructionId: 'instruction:staff', sourceBlockId: 'staff', opcode: 'choose_ruyi_staff' },
    { instructionId: 'instruction:shrink', sourceBlockId: 'shrink', opcode: 'shrink_ruyi_staff' },
  ],
})
```

Compiler RED cases: empty, multiple top-level chains, broken/noncanonical connection, unknown block, and a real w1-m1 block. Draft RED cases: save/load stable IDs and connections; reject duplicates, cycles, unsafe coordinates, unknown `nextId`, and any w1-m1 block.

- [ ] **Step 5: Run compiler/draft tests and record RED**

Run:

```bash
npx vitest run src/blockly/ruyiStaffCompiler.test.ts src/blockly/ruyiStaffDraft.test.ts
```

Expected: FAIL because the files and exports do not exist.

- [ ] **Step 6: Implement blocks, compiler, and lossless draft**

Use statement blocks with `previousStatement` and `nextStatement`. The compiler follows the only top block's real `next` links, derives IDs from block IDs, and rejects every type outside `RUYI_BLOCK_OPCODE`. The draft shape is:

```ts
export interface RuyiWorkspaceDraftV1 {
  version: 1
  blocks: Array<{
    id: string
    type: RuyiBlockType
    nextId: string | null
    x: number
    y: number
  }>
}
```

Validate before mutating a target workspace; if application fails, restore the prior draft or throw an `AggregateError` when rollback also fails.

- [ ] **Step 7: Run focused and existing w1-m1 domain tests**

Run:

```bash
npx vitest run src/battle/ruyiStaff.test.ts src/blockly/ruyiStaffCompiler.test.ts src/blockly/ruyiStaffDraft.test.ts src/battle/dragonPalace.test.ts src/blockly/compiler.test.ts src/blockly/draft.test.ts src/blockly/workspaceCommands.test.ts
```

Expected: PASS, with existing w1-m1 behavior unchanged.

- [ ] **Step 8: Commit Task 1**

```bash
git add src/battle src/blockly
git commit -m "feat: add ruyi staff battle domain"
```

### Task 2: Extend Progress V3 and parent reporting without a storage bypass

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

- [ ] **Step 1: Write failing mission-aware Progress V3 tests**

Add a valid `w1-m2` session fixture whose workspace, trace, and run come from the Task 1 modules. Assert:

```ts
const parsed = parseProgress(JSON.stringify(progress))
expect(parsed.sessions['w1-m2']).toEqual(progress.sessions['w1-m2'])
```

Mutate one field at a time and assert rejection for: w1-m1 block in w1-m2 draft, wrong opcode, foreign state, forged event source, noncanonical run, unknown session key beyond `w1-m1`/`w1-m2`, oversized arrays, and duplicated IDs. Add snapshot recovery proving the damaged current bytes remain available while the valid w1-m2 snapshot reopens with stable IDs.

- [ ] **Step 2: Run Progress V3 tests and record RED**

Run:

```bash
npx vitest run src/progress/schema.test.ts src/progress/storage.test.ts src/progress/session.test.ts src/progress/progress.test.ts src/context/ProgressContext.test.tsx
```

Expected: FAIL because V3 currently validates every session as w1-m1 and parent support only reads `w1-m1`.

- [ ] **Step 3: Implement the mission-aware session union and canonical parser**

Keep the JSON session field names unchanged. Type the workspace/trace/run members as the two mission-specific unions, then pass `missionId` into workspace, trace, state, opcode, event, diagnostic, and canonical-run validation. Dispatch only:

```ts
function canonicalRun(missionId: string, trace: readonly BattleInstruction[]) {
  if (missionId === 'w1-m1') return runDragonPalaceBattle(trace)
  if (missionId === 'w1-m2') return runRuyiStaffBattle(trace)
  invalid(`任务 ${missionId} 尚未支持可执行session`)
}
```

Do not add a new top-level storage key or direct browser storage call. `createMissionSession()` accepts a mission ID or initial workspace factory so w1-m2 starts with an empty `RuyiWorkspaceDraftV1` and w1-m1 remains byte-compatible.

- [ ] **Step 4: Add parent support and cross-system tests before implementation**

Create two failed w1-m2 runs and assert:

```ts
const report = getWeeklyReport(progress, 1)
expect(report.needsSupport).toContain('数值比较')
expect(report.sessionRuns).toBe(w1m1Runs + w1m2Runs)
expect(isMissionUnlocked(progress, 'w1-m3')).toBe(true)
```

Also prove a w1-m2 completion survives serialize/import and that replay/session writes do not increment mission attempts.

- [ ] **Step 5: Implement parent aggregation and transactional context typing**

Aggregate sessions for each implemented mission in the week. Map repeated `w1-m2` runtime failures to `数值比较`, while preserving existing w1-m1 support wording. Expose aggregate run/adjust counts on `WeeklyReport`. Keep `updateMissionSession` routed through the existing coordinated commit path and existing retry/conflict behavior.

- [ ] **Step 6: Run the focused Progress V3 and storage suites**

Run:

```bash
npx vitest run src/progress/schema.test.ts src/progress/storage.test.ts src/progress/storageCoordinator.test.ts src/progress/session.test.ts src/progress/progress.test.ts src/context/ProgressContext.test.tsx
```

Expected: PASS, including Web Locks/revision CAS/no-lock fail-closed regressions.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/progress src/context
git commit -m "feat: persist ruyi staff sessions in progress v3"
```

### Task 3: Replace the w1-m2 shell with lazy real Blockly and an event-driven scene

**Files:**
- Create: `src/components/RuyiStaffBlocklyWorkspace.tsx`
- Create: `src/components/RuyiStaffBlocklyWorkspace.test.tsx`
- Create: `src/components/RuyiStaffFeedback.tsx`
- Create: `src/components/RuyiStaffFeedback.test.tsx`
- Create: `src/components/RuyiStaffScene.tsx`
- Create: `src/components/RuyiStaffScene.test.tsx`
- Create: `src/components/RuyiStaffExperience.tsx`
- Create: `src/components/RuyiStaffExperience.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`
- Modify: `src/responsive.test.tsx`

- [ ] **Step 1: Write failing real-workspace component tests**

Mount a test Blockly adapter and prove the visible controls mutate and compile the same workspace:

```ts
fireEvent.click(screen.getByRole('button', { name: '加入：查看三件兵器重量' }))
fireEvent.click(screen.getByRole('button', { name: '加入：选择定海神针（13500斤）' }))
fireEvent.click(screen.getByRole('button', { name: '加入：缩小定海神针' }))
fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))
expect(onRun).toHaveBeenCalledWith(expect.objectContaining({
  ok: true,
  trace: expect.arrayContaining([
    expect.objectContaining({ opcode: 'choose_ruyi_staff' }),
  ]),
}))
expect(container.querySelector('.blockly-host')).not.toBeNull()
```

Add RED tests for move/delete/clear, compile errors, focus by block ID, draft callback failure retaining visible edits, visible retry, and no independent sequence state.

- [ ] **Step 2: Write failing experience/completion tests**

The component test must run a wrong real trace, assert the wrong block diagnostic, correct the actual workspace, and assert `onComplete` only after the scene's playback callback. Call replay and playback callbacks twice and prove completion remains once. Remount with persisted session and prove no success dialog is reopened and the stored run is replayable.

- [ ] **Step 3: Run component tests and record RED**

Run:

```bash
npx vitest run src/components/RuyiStaffBlocklyWorkspace.test.tsx src/components/RuyiStaffFeedback.test.tsx src/components/RuyiStaffScene.test.tsx src/components/RuyiStaffExperience.test.tsx src/App.test.tsx src/responsive.test.tsx
```

Expected: FAIL because w1-m2 still renders `LegacyMissionBuilder` and none of the new components exist.

- [ ] **Step 4: Implement the real Blockly workspace and feedback**

Use `Blockly.inject()` with only the five Task 1 blocks, no sounds, `zelos`, and the existing Dragon Palace colors. The visible program list is derived on every change from `workspace.getTopBlocks()`/`getNextBlock()`; it is never stored as execution state. `执行战斗指令` calls only `compileRuyiStaffWorkspace(workspace)`.

Child-facing runtime copy must include these exact outcomes:

```ts
const RUNTIME_COPY = {
  'ruyi-staff.wrong-weapon.choose_sabre': '3600斤比13500斤轻，大捍刀不是最重的兵器。',
  'ruyi-staff.wrong-weapon.choose_halberd': '7200斤比13500斤轻，方天画戟不是最重的兵器。',
  'ruyi-staff.incomplete.weights-inspected': '程序结束了：已经看到重量，还要选择最重的13500斤定海神针。',
  'ruyi-staff.incomplete.ruyi-staff-selected': '程序结束了：已经选对定海神针，还要把它缩小到随身大小。',
} as const
```

- [ ] **Step 5: Implement the event-driven formal scene**

Lazy-load Phaser only from `RuyiStaffScene.tsx`. Load the five approved `/assets/dragon-palace/*.webp` files. Use the weapon sheet's three existing cells and the effect sheet's three existing cells; Phaser may crop, position, scale, and animate them but must not draw replacement art.

Render the weight information as accessible HTML beside the canvas:

```tsx
<dl className="weapon-weight-list" aria-label="三件兵器重量">
  <div><dt>大捍刀</dt><dd>3600斤</dd></div>
  <div><dt>方天画戟</dt><dd>7200斤</dd></div>
  <div><dt>定海神针</dt><dd>13500斤</dd></div>
</dl>
```

Expose deterministic data attributes for scene state, selected weapon, effect cell, and motion mode. Guard every async callback with an owner/generation token, as the existing w1-m1 scene does.

- [ ] **Step 6: Implement experience orchestration and lazy App routing**

Declare the route component lazily:

```ts
const RuyiStaffExperience = lazy(() => import('./components/RuyiStaffExperience')
  .then((module) => ({ default: module.RuyiStaffExperience })))
```

In `MissionPageContent`, render w1-m1's existing experience, w1-m2's lazy experience, and `MissionTools` only for the remaining compatibility missions. The w1-m2 wrapper uses `progress.sessions['w1-m2']`, `updateMissionSession`, `recordRun`, `recordCompileFailure`, and the existing `complete()` callback. It must not call `localStorage`.

- [ ] **Step 7: Add responsive, keyboard, reduced-motion, mute, and lazy-failure assertions**

At 320px assert no document overflow and scene → controls → Blockly → feedback vertical order. Keyboard tests press Enter on add/move/delete/run/focus actions. Reduced motion applies the same events immediately. Mute is passed before execution and prevents success audio in the App path. Error boundaries retain the story and explicit reload action if either lazy component rejects.

- [ ] **Step 8: Run focused UI tests and the complete unit suite**

Run:

```bash
npx vitest run src/components/RuyiStaffBlocklyWorkspace.test.tsx src/components/RuyiStaffFeedback.test.tsx src/components/RuyiStaffScene.test.tsx src/components/RuyiStaffExperience.test.tsx src/App.test.tsx src/responsive.test.tsx
npm test
npm run typecheck
```

Expected: all commands PASS with no compatibility-label assertion remaining for `w1-m2`.

- [ ] **Step 9: Commit Task 3**

```bash
git add src/components src/App.tsx src/App.test.tsx src/styles.css src/responsive.test.tsx
git commit -m "feat: make w1-m2 a real code battle"
```

### Task 4: Lock assets, bundle budgets, and five-project browser evidence

**Files:**
- Modify: `scripts/budget-limits.mjs`
- Modify: `scripts/budget-limits.d.mts`
- Modify: `scripts/check-bundle-budget.mjs`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`
- Modify: `docs/assets/asset-manifest.md`
- Create: `e2e/ruyi-staff-code-battle.spec.ts`
- Modify: `e2e/commercial-foundation.spec.ts`
- Modify: `playwright.config.ts`
- Create: `docs/verification/ruyi-staff-code-battle.md`
- Create after browser capture: `docs/verification/screenshots/ruyi-staff-320.png`
- Create after browser capture: `docs/verification/screenshots/ruyi-staff-390.png`
- Create after browser capture: `docs/verification/screenshots/ruyi-staff-768.png`
- Create after browser capture: `docs/verification/screenshots/ruyi-staff-1440.png`

- [ ] **Step 1: Write failing budget and asset contract tests**

Add the fixed export without changing the first mission constant:

```js
export const RUYI_STAFF_COLD_BYTES = 2.5 * 1024 * 1024;
```

Require both formal scene roots to be Phaser-approved dynamic roots, each under 1900 KiB raw, while Blockly and non-scene closures still reject Phaser. Require the manifest's five rows to name real `w1-m1` and `w1-m2` screen slots without adding files, changing hashes, or lowering QA status.

- [ ] **Step 2: Run gate tests and record RED**

Run:

```bash
npm run test:bundle-script
npm run test:assets
```

Expected: FAIL because the second fixed budget/root/asset slots are absent.

- [ ] **Step 3: Implement budget and provenance gates**

Keep the exact existing file hashes, dimensions, prompts, provenance and `visual-qa-passed` status. Extend only Purpose/Screen slots where the same approved art is genuinely used by the new scene. Add a second cold collector that applies the same fail-closed HTTP rules as w1-m1.

- [ ] **Step 4: Write the five-project real child E2E path**

Add `@staff-full` to all five Playwright project grep patterns. The test may install a valid pre-load fixture containing only completed `w1-m1`; it must assert `sessions['w1-m2']` and `missions['w1-m2']` are absent before the visible path.

Each project must visibly:

```ts
await add(page, '查看三件兵器重量')
await add(page, '选择方天画戟（7200斤）')
await add(page, '缩小定海神针')
await page.getByRole('button', { name: '执行战斗指令' }).click()
await expect(page.locator('.ruyi-staff-scene')).toHaveAttribute('data-selected-weapon', 'halberd')
await expect(page.getByRole('alert')).toContainText('7200斤比13500斤轻')
await page.getByRole('button', { name: '回到问题积木' }).click()
await page.getByRole('button', { name: '删除：选择方天画戟（7200斤）' }).click()
await add(page, '选择定海神针（13500斤）')
await page.getByRole('button', { name: '上移：选择定海神针（13500斤）' }).click()
await page.getByRole('button', { name: '执行战斗指令' }).click()
await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible()
```

Then read evidence only, refresh, prove identical IDs/trace/events/counters, return to map, and prove w1-m3 enabled. No `page.evaluate` may create or modify w1-m2 gameplay success.

- [ ] **Step 5: Add focused browser paths**

Add exact tests for:

- `@staff-storage`: an intentional coordinated write failure retains the real visible edit and retry persists it;
- `@staff-corrupt`: corrupt current w1-m2 session preserves bytes and restores a legal snapshot with stable IDs in Chromium, Firefox, and WebKit;
- `@staff-keyboard`: desktop Chromium and Firefox complete by keyboard actions on the same Blockly workspace;
- `@staff-parity`: reduced motion plus pre-execution mute preserves trace/events/final state and makes no new media play/request;
- `@staff-cold`: all five projects cold-load w1-m2 below `RUYI_STAFF_COLD_BYTES`, while the existing w1-m1 cold test stays unchanged;
- parent/export/import: desktop Chromium shows aggregate Week 1 run/adjust counts and exports/imports the exact w1-m2 session;
- lazy 503: w1-m2 experience/tool failure keeps the mission page and explicit reload action visible.

Update the old commercial-foundation compatibility assertion so it no longer treats w1-m2 as legacy. If it retains a compatibility browser sample, target `w1-m3` with an explicitly non-gameplay pre-load unlock fixture.

- [ ] **Step 6: Run focused browser RED, then fix product tests rather than weakening assertions**

Run the new suite first:

```bash
npx playwright test e2e/ruyi-staff-code-battle.spec.ts --project=desktop-chromium-1440x1024 --reporter=list
```

Expected first run: at least one honest product/test integration failure. Fix product races or selectors through visible behavior; do not inject success or replace assertions with hidden state.

- [ ] **Step 7: Run complete static and browser gates**

Run:

```bash
npm test
npm run typecheck
npm run verify:assets
npm run verify:bundle
npx playwright test --list
npm run test:e2e -- --reporter=list
npm audit --registry=https://registry.npmjs.org
git diff --check
rg -n "emoji|placeholder|TO""DO|TB""D|localStorage\.(setItem|removeItem|clear)" src public docs/assets scripts e2e
```

Expected: every executable gate exits 0; browser list and result show all five projects with zero skips; any scan match is individually classified and no product component/storage bypass remains.

- [ ] **Step 8: Capture and inspect real-browser screenshots**

Run:

```bash
npm run test:e2e:update-evidence -- --grep @staff-full --reporter=list
```

Inspect the 320, 390, 768, and 1440 images at original resolution. Reject and fix any clipped formal raster, stretched canvas, unreadable weight, obscured control, placeholder, whole-page horizontal overflow, or wrong vertical order before accepting them.

- [ ] **Step 9: Write the evidence document with exact fresh results**

Record implementation SHA, evidence SHA, RED observations, exact test counts, per-project scenario counts, measured w1-m1/w1-m2 cold bytes and headroom, asset slot QA, screenshot sizes, residual risks, and the strict conclusion:

```text
w1-m2 定海神针：One-level playable
w1-m1 龙宫求兵：One-level playable（回归保持）
本地 Parent / saves 基础：System loop complete（原边界保持）
w1-m3 至 w6-m5、完整成长/神兽/装备/战斗系统、公开部署、整站：not complete
```

If any mandatory gate is missing or failing, write `w1-m2：not complete` instead.

- [ ] **Step 10: Commit Task 4**

```bash
git add scripts docs/assets e2e playwright.config.ts docs/verification
git commit -m "test: verify w1-m2 playable loop"
```

## Final controller verification

After all four tasks pass their individual specification and quality reviews, dispatch one final reviewer across the full implementation range. Then independently run the complete commands from Task 4 Step 7, inspect git status, and compare every design-spec requirement against executable evidence. Do not push, deploy, merge, delete the worktree, or modify the main-repository stash.
