# W2-M5 Heavenly Signal Boss Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `test-driven-development` and execute task-by-task in `/Users/macmini-zz/.codex/worktrees/3abe/少儿编程学习网页`. The user explicitly selected `$model-squad`: Terra is the sole writer, Luna is read-only, and the root agent independently verifies. Never create a worktree, switch branches, reset, clean, revert W1/W2-M1～M4 work, commit, push, or deploy.

**Goal:** Deliver W2-M5 “天宫总试炼” as one complete real-browser Blockly Boss level that combines fixed-count loops, event routing, sequence debugging, and repeat-until conditions in one child-owned graph.

**Architecture:** Add a W2-M5-specific zero-UI contract, Blockly compiler, deterministic runner, strict Progress V3 parser, lazy Experience/Workspace/Scene, generated raster assets, and five-project E2E. The fixed signal queue supplies external story events only; every action, handler placement, loop count, order, and condition comes from the visible connected graph. The canon epilogue is a separate runtime event after a durably saved successful trace and cannot create success.

**Tech Stack:** React 19, TypeScript, Blockly, Vitest, Playwright, Vite, Progress V3, built-in image generation.

---

### Task 1: Lock course status and all budgets with RED

**Files:**

- Modify: `src/course/course.test.ts`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `scripts/budget-limits.mjs`
- Modify: `scripts/budget-limits.d.mts`
- Modify: `scripts/check-bundle-budget.mjs`

- [x] **Step 1: Write failing formal-course assertions.**

```ts
expect(formalWeekTwoMissions).toHaveLength(5);
expect(isFormalMissionOutline(getMissionOutline('w2-m5'))).toBe(true);
expect(formalWeekTwoMissions.find((mission) => mission.id === 'w2-m5')).not.toHaveProperty('expectedSequence');
expect(readFileSync('src/course/course.ts', 'utf8')).not.toMatch(/mission\('w2-m5'[\s\S]*expectedSequence/);
```

- [x] **Step 2: Write the fixed budget RED without changing old numbers.**

```js
assert.equal(bundleBudget.WEEK_TWO_HEAVENLY_BOSS_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
assert.equal(bundleBudget.ENTRY_GZIP_LIMIT, 180 * 1024);
assert.equal(bundleBudget.HOME_TOTAL_LIMIT, 650 * 1024);
assert.equal(bundleBudget.PHASER_RAW_LIMIT, 1600 * 1024);
assert.equal(bundleBudget.GAME_SCENE_RAW_LIMIT, 1900 * 1024);
```

- [x] **Step 3: Run RED.**

Run: `npm run test:unit -- src/course/course.test.ts && node --test scripts/check-bundle-budget.test.mjs`

Expected: FAIL because W2-M5 is still legacy and the Boss cold constant is undefined.

- [x] **Step 4: Add and re-export only the Boss cold constant.**

```js
export const WEEK_TWO_HEAVENLY_BOSS_COLD_LOAD_MAX_BYTES = 3 * 1024 * 1024;
```

- [x] **Step 5: Run budget GREEN while keeping the course RED until Task 6.**

Run: `node --test scripts/check-bundle-budget.test.mjs`

Expected: PASS with every previous budget unchanged.

### Task 2: Build the zero-UI composite contract and runner

**Files:**

- Create: `src/blockly/weekTwoHeavenlySignalBossContract.test.ts`
- Create: `src/blockly/weekTwoHeavenlySignalBossContract.ts`

- [x] **Step 1: Write RED for the exact default four-bug workspace.**

```ts
const draft = createDefaultHeavenlySignalBossDraft();
expect(draft.blocks.find((block) => block.id === 'stable-repeat')?.repeatCount).toBe(2);
expect(draft.blocks.find((block) => block.id === 'accept-title')?.handlerBlockId).toBe('return-handler');
expect(draft.blocks.find((block) => block.id === 'raise-flag')?.handlerBlockId).toBe('title-handler');
expect(draft.blocks.find((block) => block.id === 'eat-elixir')?.nextId).toBe('stumble-tusita');
expect(draft.blocks.find((block) => block.id === 'furnace-loop')?.conditionBlockId).toBe('red-eyes');
```

- [x] **Step 2: Write graph validation RED.**

```ts
expect(() => validateHeavenlySignalBossDraft(missingHandler())).toThrow(/事件帽/);
expect(() => validateHeavenlySignalBossDraft(duplicateHandler())).toThrow(/重复/);
expect(() => validateHeavenlySignalBossDraft(crossContainerLink())).toThrow(/跨容器/);
expect(() => validateHeavenlySignalBossDraft(nonReciprocalLink())).toThrow(/互惠|连接/);
expect(() => validateHeavenlySignalBossDraft(detachedCondition())).toThrow(/条件/);
```

- [x] **Step 3: Write runner RED for progressive failure and the complete trace.**

```ts
expect(runHeavenlySignalBoss(compileHeavenlySignalBossDraft(defaultDraft)).diagnostic).toMatchObject({ concept: 'loop-count', sourceBlockId: 'stable-repeat' });
expect(runHeavenlySignalBoss(compileHeavenlySignalBossDraft(loopFixedDraft)).diagnostic).toMatchObject({ concept: 'event-routing', sourceBlockId: 'accept-title' });
expect(runHeavenlySignalBoss(compileHeavenlySignalBossDraft(routingFixedDraft)).diagnostic).toMatchObject({ concept: 'sequence-precondition', sourceBlockId: 'eat-elixir' });
expect(runHeavenlySignalBoss(compileHeavenlySignalBossDraft(sequenceFixedDraft)).diagnostic).toMatchObject({ concept: 'loop-condition', sourceBlockId: 'red-eyes' });
expect(runHeavenlySignalBoss(compileHeavenlySignalBossDraft(correctDraft))).toMatchObject({ completed: true, finalState: 'escaped', caredHorses: 3, furnaceRounds: 7, elapsedDays: 49, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
```

Also cover 1/2/4 repeats, never-true furnace safety stop, empty/incomplete program, deterministic replay, and all provenance fields.

- [x] **Step 4: Run module-not-found RED.**

Run: `npm run test:unit -- src/blockly/weekTwoHeavenlySignalBossContract.test.ts`

Expected: FAIL because the contract module does not exist.

- [x] **Step 5: Implement the minimum neutral contract.**

```ts
export const HEAVENLY_SIGNAL_BOSS_MISSION_ID = 'w2-m5' as const;
export const HEAVENLY_SIGNAL_QUEUE = ['stable-duty', 'returned-flower-fruit', 'heavenly-title', 'peach-message', 'furnace-refining'] as const;
export type HeavenlySignalBossState = 'awaiting-stable' | 'post-accepted' | 'horses-cared-1' | 'horses-cared-2' | 'horses-cared-3' | 'rank-learned' | 'returned' | 'flag-raised' | 'title-accepted' | 'residence-built' | 'garden-guarded' | 'banquet-learned' | 'banquet-visited' | 'tusita-entered' | 'elixir-eaten' | 'furnace-entered' | 'sheltered-in-xun' | 'furnace-waiting' | 'furnace-open' | 'escaped';
```

Generate instructions only from workspace connections. Emit the fixed queue as dispatch metadata, not answer instructions. Emit `canon-epilogue` only after a completed child trace, with `sourceBlockId: null`, and never use it to set `completed=true`.

- [x] **Step 6: Run contract GREEN.**

Run: `npm run test:unit -- src/blockly/weekTwoHeavenlySignalBossContract.test.ts`

Expected: PASS.

### Task 3: Compile the real Blockly handlers, loops, and condition

**Files:**

- Create: `src/blockly/weekTwoHeavenlySignalBossBlocks.ts`
- Create: `src/blockly/weekTwoHeavenlySignalBossCompiler.ts`
- Create: `src/blockly/weekTwoHeavenlySignalBossCompiler.test.ts`

- [x] **Step 1: Write real Blockly RED.**

```ts
const stable = workspace.newBlock('xiyou_boss_on_stable_duty', 'stable-handler');
const repeat = workspace.newBlock('xiyou_boss_repeat_horse_care', 'stable-repeat');
repeat.setFieldValue('3', 'TIMES');
stable.getInput('HANDLER')!.connection!.connect(repeat.previousConnection!);
const result = compileHeavenlySignalBossWorkspace(workspace);
expect(result).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-handler' })] });
```

Add RED for all five correct handlers, swapped event actions, real main/body/condition connections, deletion, duplicate hat, unknown block, forged reciprocal link, cycle, cross-container link, and coordinate-independent trace.

- [x] **Step 2: Run RED.**

Run: `npm run test:unit -- src/blockly/weekTwoHeavenlySignalBossCompiler.test.ts`

Expected: FAIL because blocks and compiler do not exist.

- [x] **Step 3: Register exact event, action, repeat, repeat-until, and Boolean blocks.**

```ts
this.appendStatementInput('HANDLER').appendField('当 御马监开始值守');
this.appendStatementInput('CHILDREN').appendField('每次执行');
this.appendValueInput('CONDITION').setCheck('Boolean').appendField('重复直到');
```

Snapshot `previousId`, `nextId`, `parentBlockId`, `handlerBlockId`, `conditionBlockId`, repeat count, and coordinates from the actual workspace. Delegate semantic compilation to Task 2.

- [x] **Step 4: Run compiler and contract GREEN.**

Run: `npm run test:unit -- src/blockly/weekTwoHeavenlySignalBossCompiler.test.ts src/blockly/weekTwoHeavenlySignalBossContract.test.ts`

Expected: PASS.

### Task 4: Add strict W2-M5 Progress V3 persistence

**Files:**

- Create: `src/progress/heavenlySignalBossSessionSchema.ts`
- Create: `src/progress/weekTwoHeavenlySignalBossSession.test.ts`
- Modify: `src/progress/types.ts`
- Modify: `src/progress/session.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/progress.ts`
- Modify: `src/context/ProgressContext.tsx`

- [x] **Step 1: Write session RED.**

```ts
const session = createMissionSession('w2-m5', now);
expect(session.workspace).toEqual(createDefaultHeavenlySignalBossDraft());
expect(updateWorkspaceDraft(recordRun(session, failedRun, trace, now), correctedDraft, later)).toMatchObject({ lastTrace: [], lastRun: null });
```

Add RED for same-draft in-flight merge, all concept counters, forged event/handler/source/parent/iteration/repeat/condition/day/epilogue/run/timestamp rejection, strict export/import, malformed current recovery, snapshot, CAS, parent report, and W3-M1 unlock only after durable completion.

- [x] **Step 2: Run RED.**

Run: `npm run test:unit -- src/progress/weekTwoHeavenlySignalBossSession.test.ts src/progress/schema.test.ts src/progress/progress.test.ts src/context/ProgressContext.test.tsx`

Expected: FAIL because W2-M5 is not an executable session.

- [x] **Step 3: Add only W2-M5 session types and dispatches.**

```ts
export type HeavenlySignalBossMissionSession = MissionSessionData<HeavenlySignalBossWorkspaceDraftV1, HeavenlySignalBossInstruction, HeavenlySignalBossRunResult>;
```

Parse exact keys, recompile workspace, rerun trace, and compare every field. Keep every prior parser strict and unchanged. Extend parent report with the explicit label `循环与调试综合`.

- [x] **Step 4: Run targeted Progress GREEN.**

Run: `npm run test:unit -- src/progress/weekTwoHeavenlySignalBossSession.test.ts src/progress/schema.test.ts src/progress/progress.test.ts src/context/ProgressContext.test.tsx`

Expected: PASS.

### Task 5: Build the lazy Workspace, Experience, and Scene via TDD

**Files:**

- Create: `src/components/WeekTwoHeavenlySignalBossBlocklyWorkspace.tsx`
- Create: `src/components/WeekTwoHeavenlySignalBossBlocklyWorkspace.test.tsx`
- Create: `src/components/WeekTwoHeavenlySignalBossExperience.tsx`
- Create: `src/components/WeekTwoHeavenlySignalBossExperience.test.tsx`
- Create: `src/components/WeekTwoHeavenlySignalBossScene.tsx`
- Create: `src/components/WeekTwoHeavenlySignalBossScene.test.tsx`
- Create: `src/components/WeekTwoHeavenlySignalBossExperience.css`

- [x] **Step 1: Write Workspace RED before production components.**

```tsx
render(<Workspace draft={createDefaultHeavenlySignalBossDraft()} locked={false} focusBlockId="stable-repeat" onFocusHandled={done} onDraftChange={saved} onRun={onRun} />);
await user.click(screen.getByRole('button', { name: '增加天马循环次数' }));
expect(latestDraft().blocks.find((block) => block.id === 'stable-repeat')?.repeatCount).toBe(3);
```

Cover pointer and keyboard fixes for all four bugs, deletion/restoration, actual condition socket replacement, actual handler move, focus, capacity, lock, pixel-visible host, and in-flight identical-save coalescing.

- [x] **Step 2: Write Experience and Scene RED.**

```tsx
expect(await runDefault()).toHaveTextContent('还有一匹天马没有照料');
expect(onComplete).not.toHaveBeenCalled();
```

Cover progressive first-error feedback, zero punishment, save-before-playback, no completion before run save and scene ready, four correction cycles, replay, unsaved/conflict recovery, canon epilogue only after `escaped`, resource failure/retry, reduced-motion and mute parity.

- [x] **Step 3: Run component RED.**

Run: `npm run test:unit -- src/components/WeekTwoHeavenlySignalBossBlocklyWorkspace.test.tsx src/components/WeekTwoHeavenlySignalBossExperience.test.tsx src/components/WeekTwoHeavenlySignalBossScene.test.tsx`

Expected: FAIL because components do not exist.

- [x] **Step 4: Implement the smallest UI using the W2-M4 save ordering.**

```tsx
<LazySectionBoundary label="天宫信号调度场景"><Scene events={events} replayToken={replayToken} reducedMotion={reducedMotion} muted={muted} onResourceStateChange={setSceneReady} onPlaybackComplete={() => void finishPlayback()} /></LazySectionBoundary>
```

Use actual Blockly operations for every helper button. Do not keep a React answer array, call the runner from UI state, or let hints mutate the graph.

- [x] **Step 5: Run component GREEN.**

Run: `npm run test:unit -- src/components/WeekTwoHeavenlySignalBossBlocklyWorkspace.test.tsx src/components/WeekTwoHeavenlySignalBossExperience.test.tsx src/components/WeekTwoHeavenlySignalBossScene.test.tsx`

Expected: PASS with no raw IDs in child-visible copy.

### Task 6: Promote W2-M5 to the formal route

**Files:**

- Modify: `src/course/formalCourse.ts`
- Modify: `src/course/course.ts`
- Modify: `src/course/course.test.ts`
- Modify: `src/components/MissionPageContent.tsx`
- Create: `src/components/WeekTwoHeavenlySignalBossRoute.test.tsx`

- [x] **Step 1: Write route RED.**

```tsx
renderRoute('/mission/w2-m5');
expect(await screen.findByRole('heading', { name: '天宫总试炼' })).toBeVisible();
expect(screen.queryByText('兼容指令序列')).not.toBeInTheDocument();
```

- [x] **Step 2: Run course and route RED.**

Run: `npm run test:unit -- src/course/course.test.ts src/components/WeekTwoHeavenlySignalBossRoute.test.tsx`

Expected: FAIL because W2-M5 remains legacy.

- [x] **Step 3: Add the formal story and lazy route.**

```ts
formalMission('w2-m5', {
  subtitle: '修复四类天宫程序错误',
  objective: '用事件、循环和调试完成天宫总试炼',
  canon: formalWeekTwoCanon,
  storyBeats: [
    beat('由御马监到八卦炉', '悟空从弼马温反下天宫，历经齐天名号、蟠桃金丹和八卦炉脱身。'),
    beat('掌中赌赛与五行山', '悟空脱身后与如来赌赛，最终被压在五行山下。'),
  ],
});
```

Add `WeekTwoHeavenlySignalBossRouteBoundary`, route only `mission.id === 'w2-m5'` to it, and remove only W2-M5 from legacy course data.

- [x] **Step 4: Run all W2 route tests GREEN.**

Run: `npm run test:unit -- src/course/course.test.ts src/components/WeekTwoHorseRoute.test.tsx src/components/WeekTwoMonkeyKingRoute.test.tsx src/components/WeekTwoPeachElixirRoute.test.tsx src/components/WeekTwoFurnaceConditionRoute.test.tsx src/components/WeekTwoHeavenlySignalBossRoute.test.tsx`

Expected: PASS.

### Task 7: Generate, register, and verify Boss assets

**Files:**

- Create: `public/assets/week-two-heavenly-boss/signal-dispatch-background.webp`
- Create: `public/assets/week-two-heavenly-boss/heavenly-boss-states.webp`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`

- [x] **Step 1: Use built-in image generation for two raster candidates.**

Background prompt must use the approved bright 3D Chinese children’s storybook direction and depict connected visual zones for the stable, Flower-Fruit Mountain flag terrace, peach/banquet/Tusita route, furnace, and Five Elements Mountain epilogue. It must contain no text, pseudo-writing, UI, logos, checkerboard transparency, or punishment imagery.

State-sheet prompt must depict five handler-progress groups, seven furnace rounds, escape, palm wager, and the quiet mountain epilogue as clearly crop-able panels without text or fake transparency.

- [x] **Step 2: Inspect originals and create only accepted WebP shipping files.**

Run: `shasum -a 256 public/assets/week-two-heavenly-boss/signal-dispatch-background.webp public/assets/week-two-heavenly-boss/heavenly-boss-states.webp`

Expected: two fixed hashes that match complete manifest rows.

- [x] **Step 3: Write asset gate RED.**

```js
assert.deepEqual(REQUIRED_WEEK_TWO_HEAVENLY_BOSS_ASSETS, [
  'assets/week-two-heavenly-boss/signal-dispatch-background.webp',
  'assets/week-two-heavenly-boss/heavenly-boss-states.webp',
]);
```

- [x] **Step 4: Extend only the approved directory, exact Scene slots, inventory, prompt, hash, dimensions, provenance, and QA checks.**

Run: `npm run test:assets && npm run check:assets && npm run verify:assets`

Expected: PASS only after both rows reach `visual-qa-passed`.

### Task 8: Add source contracts and five-project browser evidence

**Files:**

- Create: `e2e/week-two-heavenly-signal-boss.spec.ts`
- Create: `scripts/check-week-two-heavenly-boss-e2e-contract.mjs`
- Create: `scripts/check-week-two-heavenly-boss-e2e-contract.test.mjs`
- Modify: `e2e/support/storageFaultAdapter.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`

- [x] **Step 1: Write E2E collection and behavior RED.**

```ts
test('@boss-full @boss-narrow child fixes four visible bugs before the canon epilogue', async ({ page }) => {
  await page.goto('./#/mission/w2-m5');
  await page.getByRole('button', { name: '执行天宫总试炼' }).click();
  await expect(page.getByRole('alert')).toContainText('还有一匹天马没有照料');
});
```

Add child-visible steps for loop count, event swap, elixir move, condition replacement, 49-day success, epilogue, durable mission completion, refresh/replay, and no duplicate reward. Add separate keyboard, storage failure, corruption/CAS/export-import/parent, lazy/resource retry, cold/404/health cases.

- [x] **Step 2: Run RED collection and first browser failure.**

Run: `npx playwright test e2e/week-two-heavenly-signal-boss.spec.ts --list && npx playwright test e2e/week-two-heavenly-signal-boss.spec.ts --project=desktop-chromium-1440x1024 --grep @boss-full`

Expected: missing collection or missing formal UI before configuration/implementation is complete.

- [x] **Step 3: Add five-project tags and the exact test-only storage-fault branch.**

Distribute `@boss-full`, `@boss-keyboard`, `@boss-storage`, `@boss-corrupt`, `@boss-parent`, `@boss-lazy`, `@boss-asset-fault`, `@boss-cold`, and `@boss-narrow` across the existing five approved projects without renaming or adding projects.

- [x] **Step 4: Add AST/source gates.**

Forbid W2-M5 `expectedSequence`, legacy fallback, hidden completion, React answer arrays, direct production storage, dynamic execution, `page.evaluate` W2-M5 evidence injection, filtered health arrays, and missing visible correction steps.

- [x] **Step 5: Run source and browser GREEN.**

Run: `npm run test:bundle-script && npx playwright test e2e/week-two-heavenly-signal-boss.spec.ts`

Expected: all tagged cases pass on the five existing projects with raw health events empty.

### Task 9: Fresh full verification and evidence record

**Files:**

- Create: `docs/verification/week-two-heavenly-signal-boss.md`
- Modify: this plan only to tick steps backed by actual output

- [x] **Step 1: Run all automated gates.**

Run: `npm test && npm run typecheck && npm run verify:bundle && npm run verify:assets`

Expected: every command exits 0 with exact fresh counts recorded.

- [x] **Step 2: Re-run the five-project main path and special failure paths.**

Run: `npx playwright test e2e/week-two-heavenly-signal-boss.spec.ts --grep @boss-full && npx playwright test e2e/week-two-heavenly-signal-boss.spec.ts --grep @boss-cold`

Expected: main path and cold/404 path pass across 1440 Chromium, 768 WebKit, 390 Chromium, 1440 Firefox, and 320 Chromium.

- [x] **Step 3: Audit the working tree.**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; all W1/W2-M1～M4 changes remain; no commit, push, deploy, reset, clean, unrelated formatting, or user-change reversal.

- [x] **Step 4: Write the verification record and completion-matrix audit.**

Record exact tests, browser projects, budgets, asset hashes, failure/recovery paths, achieved level, exclusions, and residual risks. Report `One-level playable` only if every mandatory W2-M5 row is backed by fresh evidence; otherwise report `not complete` and the first unmet gate. Always keep W1 full Playwright, week-two `System loop complete`, full-content verification, and deployment outside this claim.
