# W2-M4 Eight-Trigram Furnace Condition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task in `/Users/macmini-zz/.codex/worktrees/3abe/少儿编程学习网页`. Never create a new worktree, switch branches, reset, clean, revert W1/W2-M1～M3 work, commit, push, or deploy. Every production behavior follows RED → observed failure → minimal GREEN.

**Goal:** Deliver W2-M4 “八卦炉脱身” as one real-browser Blockly `repeat until` condition-debugging level with deterministic provenance, Progress V3 recovery, approved raster assets, and zero punishment.

**Architecture:** Add a mission-specific zero-UI furnace contract, Blockly compiler, strict session parser, lazy experience and scene. The visible graph, including the connected condition block and loop body, is the sole source of execution; imported evidence is recompiled and replayed. Reuse the existing Progress V3 coordinator and W2-M3 in-flight draft-save merging behavior without changing their semantics.

**Tech Stack:** React 19, TypeScript, Blockly, Vitest, Playwright, Vite, Progress V3, OpenAI built-in image generation.

---

### Task 1: Lock the formal-route and cold-budget contracts

**Files:**

- Modify: `src/course/course.test.ts`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `scripts/budget-limits.mjs`
- Modify: `scripts/budget-limits.d.mts`

- [ ] **Step 1: Write RED course and budget assertions.**

```ts
expect(formalWeekTwoMissions.map((mission) => mission.id)).toContain('w2-m4');
expect(isFormalMissionOutline(getMissionOutline('w2-m4'))).toBe(true);
expect(isFormalMissionOutline(getMissionOutline('w2-m5'))).toBe(false);
expect(formalWeekTwoMissions.find((mission) => mission.id === 'w2-m4')).not.toHaveProperty('expectedSequence');
```

```js
assert.equal(limits.WEEK_TWO_FURNACE_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
assert.deepEqual(snapshotPriorLimits(limits), expectedPriorLimits);
```

- [ ] **Step 2: Run the targeted tests and observe RED.**

Run: `npm run test:unit -- src/course/course.test.ts && node --test scripts/check-bundle-budget.test.mjs`

Expected: the course test reports absent formal `w2-m4`; the budget test reports an absent furnace limit while every existing limit remains unchanged.

- [ ] **Step 3: Add only the furnace limit.**

```js
export const WEEK_TWO_FURNACE_COLD_LOAD_MAX_BYTES = 3 * 1024 * 1024;
```

- [ ] **Step 4: Re-run the budget contract to GREEN while leaving course registration RED.**

Run: `node --test scripts/check-bundle-budget.test.mjs`

Expected: PASS.

### Task 2: Create the condition-loop contract and deterministic runner

**Files:**

- Create: `src/blockly/weekTwoFurnaceConditionContract.test.ts`
- Create: `src/blockly/weekTwoFurnaceConditionContract.ts`

- [ ] **Step 1: Write RED tests for the complete default wrong graph.**

```ts
const draft = createDefaultFurnaceConditionDraft();
expect(draft.blocks.find((block) => block.type === 'xiyou_repeat_until_furnace_ready')?.conditionBlockId).toBe('smoke-red-eyes');
expect(compileFurnaceConditionDraft(draft).map((item) => item.opcode)).toContain('condition_checked');
```

- [ ] **Step 2: Write RED validation and provenance tests.**

```ts
expect(() => validateFurnaceConditionDraft(withDetachedCondition())).toThrow(/条件|连接/);
expect(() => validateFurnaceConditionDraft(withEmptyLoop())).toThrow(/循环体/);
expect(compileFurnaceConditionDraft(reorderedArrayDraft()).map((item) => item.sourceBlockId)).toEqual(expectedConnectionOrder);
```

- [ ] **Step 3: Write RED runner tests for the three conditions and every completion boundary.**

```ts
expect(runFurnaceCondition(defaultWrongTrace).diagnostic).toMatchObject({ concept: 'loop-condition', sourceBlockId: 'smoke-red-eyes' });
expect(runFurnaceCondition(neverTrueTrace).diagnostic).toMatchObject({ concept: 'condition-never-met', sourceBlockId: 'smoke-clears' });
expect(runFurnaceCondition(correctTrace)).toMatchObject({ completed: true, finalState: 'furnace-toppled', elapsedDays: 49, completedRounds: 7, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
```

- [ ] **Step 4: Run RED and confirm module-not-found failures.**

Run: `npm run test:unit -- src/blockly/weekTwoFurnaceConditionContract.test.ts`

Expected: FAIL because the contract module does not exist.

- [ ] **Step 5: Implement the smallest zero-UI contract.**

```ts
export const FURNACE_CONDITION_MISSION_ID = 'w2-m4' as const;
export type FurnaceConditionState = 'captured' | 'furnace-entered' | 'sheltered-in-xun' | 'furnace-waiting' | 'furnace-open' | 'escaped' | 'furnace-toppled';
export const FURNACE_CONDITIONS = ['smoke-red-eyes', 'furnace-open-signal', 'smoke-clears'] as const;
```

Implement exact graph validation, canonical trace generation with `conditionSourceBlockId`, deterministic seven-day rounds, and the eighth-check safety boundary. Do not read course configuration or coordinates during execution.

- [ ] **Step 6: Re-run the contract suite to GREEN.**

Run: `npm run test:unit -- src/blockly/weekTwoFurnaceConditionContract.test.ts`

Expected: PASS.

### Task 3: Compile the actual Blockly loop graph

**Files:**

- Create: `src/blockly/weekTwoFurnaceConditionCompiler.test.ts`
- Create: `src/blockly/weekTwoFurnaceConditionCompiler.ts`
- Create: `src/blockly/weekTwoFurnaceConditionBlocks.ts`

- [ ] **Step 1: Write RED tests against real Blockly connections.**

```ts
const loop = workspace.newBlock('xiyou_repeat_until_furnace_ready', 'loop');
loop.getInput('CONDITION')!.connection!.connect(workspace.newBlock('xiyou_furnace_open_signal', 'open').outputConnection!);
loop.getInput('CHILDREN')!.connection!.connect(workspace.newBlock('xiyou_wait_seven_days', 'wait').previousConnection!);
expect(compileFurnaceConditionWorkspace(workspace)).toMatchObject({ ok: true });
```

Also test a disconnected sensor, two sensors, no sensor, empty body, action in the condition input, cross-container link, unknown block, non-reciprocal connection, and a graph whose visual positions differ but whose links stay stable.

- [ ] **Step 2: Run RED.**

Run: `npm run test:unit -- src/blockly/weekTwoFurnaceConditionCompiler.test.ts`

Expected: FAIL because the compiler module and registered blocks are absent.

- [ ] **Step 3: Register the minimum visual blocks and compiler.**

```ts
this.appendValueInput('CONDITION').setCheck('Boolean').appendField('重复直到');
this.appendStatementInput('CHILDREN').appendField('每轮执行');
this.setPreviousStatement(true);
this.setNextStatement(true);
```

Use one `Boolean` output connection for every story sensor. Snapshot real Blockly parent/next/condition connections; delegate all semantic validation and trace construction to Task 2’s contract. Return diagnostics with the true source block ID.

- [ ] **Step 4: Re-run the compiler and contract suites to GREEN.**

Run: `npm run test:unit -- src/blockly/weekTwoFurnaceConditionCompiler.test.ts src/blockly/weekTwoFurnaceConditionContract.test.ts`

Expected: PASS.

### Task 4: Add strict W2-M4 Progress V3 persistence

**Files:**

- Create: `src/progress/furnaceConditionSessionSchema.ts`
- Create: `src/progress/weekTwoFurnaceConditionSession.test.ts`
- Modify: `src/progress/types.ts`
- Modify: `src/progress/session.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/progress.ts`
- Modify: `src/context/ProgressContext.tsx`

- [ ] **Step 1: Write RED session tests.**

```ts
const session = createMissionSession('w2-m4');
expect(session.workspace.blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'xiyou_repeat_until_furnace_ready' })]));
expect(updateWorkspaceDraft(session, correctedDraft, now)).toMatchObject({ lastTrace: [], lastRun: null });
```

Add cases for import recompilation/replay, forged condition provenance, changed iteration/day values, forged run status, invalid timestamps/counters, same-draft in-flight save merge, unsaved/conflict retry, recovery-source retention, export/import, parent report aggregation and W2-M5 unlock only after a durably saved completion.

- [ ] **Step 2: Run RED.**

Run: `npm run test:unit -- src/progress/weekTwoFurnaceConditionSession.test.ts src/progress/schema.test.ts src/context/ProgressContext.test.tsx`

Expected: FAIL because `w2-m4` has no executable mission session or strict parser.

- [ ] **Step 3: Add W2-M4 only to the executable-session union and parser dispatch.**

```ts
export type FurnaceConditionMissionSession = MissionSessionData<FurnaceConditionWorkspaceDraftV1, FurnaceConditionInstruction, FurnaceConditionRunResult>;
```

Extend overloads and dispatches for `w2-m4`; parse workspace, recompile the trace, rerun deterministic execution and compare exact persisted evidence. Keep W2-M5 legacy and do not weaken any W1/W2-M1～M3 parser.

- [ ] **Step 4: Re-run targeted progress tests to GREEN.**

Run: `npm run test:unit -- src/progress/weekTwoFurnaceConditionSession.test.ts src/progress/schema.test.ts src/context/ProgressContext.test.tsx`

Expected: PASS.

### Task 5: Build the lazy experience, scene and accessibility path

**Files:**

- Create: `src/components/WeekTwoFurnaceConditionBlocklyWorkspace.test.tsx`
- Create: `src/components/WeekTwoFurnaceConditionBlocklyWorkspace.tsx`
- Create: `src/components/WeekTwoFurnaceConditionExperience.test.tsx`
- Create: `src/components/WeekTwoFurnaceConditionExperience.tsx`
- Create: `src/components/WeekTwoFurnaceConditionScene.test.tsx`
- Create: `src/components/WeekTwoFurnaceConditionScene.tsx`
- Create: `src/components/WeekTwoFurnaceConditionExperience.css`

- [ ] **Step 1: Write workspace RED.**

```tsx
render(<Workspace draft={createDefaultFurnaceConditionDraft()} locked={false} onRun={onRun} onDraftChange={saved} focusBlockId="smoke-red-eyes" onFocusHandled={done} />);
await user.click(screen.getByRole('button', { name: '换成：听见炉头声响并看见光明' }));
expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
```

Cover real sensor replacement, deletion/restoration, pointer and keyboard movement, focus to condition diagnostic, visible Blockly pixels, lock state, and in-flight identical-draft save coalescing.

- [ ] **Step 2: Write Experience and Scene RED.**

```tsx
expect(await screen.findByRole('alert')).toHaveTextContent('眼睛变红只说明烟很大');
expect(onComplete).not.toHaveBeenCalled();
```

Cover run-save-before-playback, no success on unsaved run, retry/conflict recovery, replay, scene image failure/retry, resource readiness, muted/reduced-motion parity, seven-round display and no raw provenance identifiers in child copy.

- [ ] **Step 3: Run component RED.**

Run: `npm run test:unit -- src/components/WeekTwoFurnaceConditionBlocklyWorkspace.test.tsx src/components/WeekTwoFurnaceConditionExperience.test.tsx src/components/WeekTwoFurnaceConditionScene.test.tsx`

Expected: FAIL because W2-M4 components do not exist.

- [ ] **Step 4: Implement the smallest child-owned UI.**

```tsx
<LazySectionBoundary label="八卦炉脱身场景"><Scene events={events} replayToken={replayToken} reducedMotion={reducedMotion} muted={muted} onResourceStateChange={setSceneReady} onPlaybackComplete={() => void finishPlayback()} /></LazySectionBoundary>
```

Reuse W2-M3 persistence ordering and lazy boundaries. Replace the condition through the actual Blockly `CONDITION` input, persist before execution, focus the condition source block on early exit or nontermination, and never mutate a program from hints or UI feedback.

- [ ] **Step 5: Re-run component suites to GREEN.**

Run: `npm run test:unit -- src/components/WeekTwoFurnaceConditionBlocklyWorkspace.test.tsx src/components/WeekTwoFurnaceConditionExperience.test.tsx src/components/WeekTwoFurnaceConditionScene.test.tsx`

Expected: PASS.

### Task 6: Promote only W2-M4 into formal routing

**Files:**

- Modify: `src/course/formalCourse.ts`
- Modify: `src/course/course.ts`
- Modify: `src/components/MissionPageContent.tsx`
- Create: `src/components/WeekTwoFurnaceConditionRoute.test.tsx`
- Modify: `src/course/course.test.ts`

- [ ] **Step 1: Write route RED.**

```tsx
renderRoute('/mission/w2-m4');
expect(await screen.findByRole('heading', { name: '八卦炉脱身' })).toBeVisible();
expect(screen.queryByText('兼容指令序列')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run route and course RED.**

Run: `npm run test:unit -- src/course/course.test.ts src/components/WeekTwoFurnaceConditionRoute.test.tsx`

Expected: FAIL because W2-M4 remains legacy.

- [ ] **Step 3: Register the mission and lazy boundary.**

```ts
formalMission('w2-m4', {
  subtitle: '检查循环结束条件',
  objective: '让炼炉计时在正确条件下停止',
  canon: formalWeekTwoCanon,
  storyBeats: [
    beat('二郎神与老君相助', '二郎神与悟空斗法，太上老君以金刚琢相助擒拿。'),
    beat('巽位避火', '悟空进入八卦炉后藏到巽位，等到炉头声响、看见光明才脱身。'),
  ],
});
```

Add a `WeekTwoFurnaceConditionRouteBoundary`, route only `mission.id === 'w2-m4'` to it, and leave `w2-m5` on the legacy path.

- [ ] **Step 4: Re-run route, course and prior-route tests to GREEN.**

Run: `npm run test:unit -- src/course/course.test.ts src/components/WeekTwoFurnaceConditionRoute.test.tsx src/components/WeekTwoHorseRoute.test.tsx src/components/WeekTwoMonkeyKingRoute.test.tsx src/components/WeekTwoPeachElixirRoute.test.tsx`

Expected: PASS.

### Task 7: Generate and gate official furnace assets

**Files:**

- Create: `public/assets/week-two-furnace/furnace-interior-background.webp`
- Create: `public/assets/week-two-furnace/furnace-condition-states.webp`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`

- [ ] **Step 1: Generate two raster candidates through the built-in image generator.**

Use the approved bright 3D Chinese children’s storybook direction. Background prompt must include an octagonal furnace interior, visible Xun-position shelter, fire, smoke and a clearly openable furnace door; no text, UI, logos, pseudo-writing or faux transparency. State-sheet prompt must depict seven wait-progress stages plus safe exit without text or checkerboard transparency.

- [ ] **Step 2: Inspect originals, produce only accepted WebP files and calculate hashes.**

Run: `shasum -a 256 public/assets/week-two-furnace/furnace-interior-background.webp public/assets/week-two-furnace/furnace-condition-states.webp`

Expected: two fixed SHA-256 values recorded in the manifest.

- [ ] **Step 3: Write asset-gate RED.**

```js
assert.deepEqual(REQUIRED_WEEK_TWO_FURNACE_ASSETS, [
  'assets/week-two-furnace/furnace-interior-background.webp',
  'assets/week-two-furnace/furnace-condition-states.webp',
]);
```

Require exact literal scene bindings, no missing/extra furnace asset, complete manifest metadata and `visual-qa-passed` only after original-resolution inspection.

- [ ] **Step 4: Implement the narrow gate extension and manifest rows; run GREEN.**

Run: `npm run test:assets && npm run check:assets`

Expected: PASS.

### Task 8: Add source-contract and real-browser coverage

**Files:**

- Create: `e2e/week-two-furnace-condition.spec.ts`
- Create: `scripts/check-week-two-furnace-e2e-contract.mjs`
- Create: `scripts/check-week-two-furnace-e2e-contract.test.mjs`
- Modify: `e2e/support/storageFaultAdapter.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Add tagged E2E RED with visible child operations only.**

```ts
await page.goto('./#/mission/w2-m4');
await page.getByRole('button', { name: '执行八卦炉循环' }).click();
await expect(page.getByRole('alert')).toContainText('眼睛变红只说明烟很大');
await page.getByRole('button', { name: '换成：听见炉头声响并看见光明' }).click();
```

- [ ] **Step 2: Run RED collection.**

Run: `npm run test:e2e -- e2e/week-two-furnace-condition.spec.ts --project=chromium`

Expected: FAIL or collect zero cases because the formal route and visible controls are not yet available.

- [ ] **Step 3: Implement five-project browser and AST contracts.**

Cover default early exit, never-true safe stop, pointer and Chromium/Firefox keyboard condition correction, seven-round success, refresh, replay, write failure retry, corrupt current recovery, cross-tab CAS, export/import, parent report, W2-M5 unlock, 320/390/768/1440, mute, reduced motion, Blockly pixel discreteness, three lazy-load failures, asset first-load retry, furnace-family 404, application 404, console/request health and fail-closed page health.

Forbid `expectedSequence`, `LegacyMissionBuilder`, `MissionTools`, direct storage mutation, dynamic execution, hidden success, test-only pass-through and UI-owned answer arrays in W2-M4 source.

- [ ] **Step 4: Run source-contract tests and five browser projects.**

Run: `npm run test:bundle-script && npm run test:e2e -- e2e/week-two-furnace-condition.spec.ts`

Expected: PASS across configured Chromium, Firefox and remaining project variants.

### Task 9: Run fresh verification and record evidence

**Files:**

- Create: `docs/verification/week-two-furnace-condition.md`
- Modify: this plan only to tick steps after evidence exists

- [ ] **Step 1: Run the full static and build gate.**

Run: `npm run test:unit && npm run test:bundle-script && npm run test:assets && npm run typecheck && npm run build && npm run check:assets`

Expected: every command exits 0.

- [ ] **Step 2: Run the bundle budget and browser matrix; inspect screenshots.**

Run: `node scripts/check-bundle-budget.mjs && npm run test:e2e -- e2e/week-two-furnace-condition.spec.ts`

Expected: W2-M4 stays within 3 MiB and browser evidence covers both incorrect conditions and the correct seven-round result.

- [ ] **Step 3: Audit only W2-M4 changes and record the evidence.**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; no commit, push, deploy, reset, clean or unrelated source cleanup.

- [ ] **Step 4: Write exact counts, commands, completion-matrix coverage, exclusions and risks.**

State `One-level playable` only when every mandatory W2-M4 browser, persistence, failure, recovery, provenance, asset and budget gate has fresh evidence. Otherwise state `not complete`, the first unmet gate, and that W2-M5, week-two system loop, W1 full Playwright, full-content verification and public deployment remain out of scope and incomplete.
