# W3-M1 Manor Help Condition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade W3-M1 into one real Blockly true/false mission whose single visible graph handles both the canonical help request and the labelled practice message, while safely delivering the persistent “火眼金睛·条件观察” ability.

**Architecture:** A zero-UI contract owns the workspace draft, two fixed scenario inputs, canonical trace, deterministic runner, diagnostics, and failure snapshot. Progress V3 revision 3 stores a derived condition-observation ability plus a dedicated W3-M1 session; the React route only renders and persists those pure results. Completion remains gated on saved dual-scenario success and ready formal assets.

**Tech Stack:** TypeScript, React, Blockly, Vitest, Playwright, Vite, Node source/asset contracts, OpenAI built-in image generation, Progress V3 localStorage coordinator.

**Execution boundary:** Work only in `/Users/macmini-zz/.codex/worktrees/3abe/少儿编程学习网页`. Preserve the current `codex/week-two-formal` uncommitted W1/W2 scene. Do not create/switch worktrees and do not run `reset`, `clean`, `commit`, `push`, or `deploy`. The normal commit steps from the planning skill are intentionally omitted because the user prohibited commits.

---

## File map

**Create**

- `src/blockly/weekThreeManorHelpContract.ts` — block/scenario types, default draft, graph validation, trace compilation, runner, diagnostics, failure snapshots.
- `src/blockly/weekThreeManorHelpContract.test.ts` — pure draft/trace/runtime truth-table and graph rejection tests.
- `src/blockly/weekThreeManorHelpBlocks.ts` — Blockly registrations and child-facing labels.
- `src/blockly/weekThreeManorHelpCompiler.ts` — snapshot the visible Blockly workspace and compile only that graph.
- `src/blockly/weekThreeManorHelpCompiler.test.ts` — visible graph mutation and provenance tests.
- `src/progress/conditionObservation.ts` — ability state derivation and strict use-audit helpers.
- `src/progress/conditionObservation.test.ts` — acquisition, stabilization, migration compatibility, and idempotent-use tests.
- `src/progress/manorHelpSessionSchema.ts` — strict W3-M1 session parser with recompile/replay validation.
- `src/progress/weekThreeManorHelpSession.test.ts` — session, edit invalidation, import, and support-summary tests.
- `src/components/WeekThreeManorHelpBlocklyWorkspace.tsx` and `.test.tsx` — one real visible graph, accessible repairs, serialized saves.
- `src/components/WeekThreeManorHelpExperience.tsx` and `.test.tsx` — persistence gate, dual-scenario run, fire-eye panel, retries.
- `src/components/WeekThreeManorHelpScene.tsx` and `.test.tsx` — formal two-scenario playback and asset failure recovery.
- `src/components/WeekThreeManorHelpRoute.test.tsx` — lazy route and load-failure boundary.
- `e2e/week-three-manor-help-condition.spec.ts` — five-project child-visible browser matrix.
- `scripts/check-week-three-manor-help-e2e-contract.mjs` and `.test.mjs` — forbid legacy/hidden completion shortcuts and require evidence tags.
- `docs/verification/week-three-manor-help-condition.md` — fresh evidence and exact completion boundary.
- `public/assets/week-three-manor-help/manor-help-background.webp` — formal high-manor roadside scene.
- `public/assets/week-three-manor-help/manor-message-states.webp` — canonical/practice message-state sheet.

**Modify narrowly**

- `src/course/formalCourse.ts`, `src/course/course.ts`, `src/course/courseOutline.ts`, `src/course/course.test.ts` — formal W3-M1 registration only.
- `src/progress/types.ts`, `src/progress/executableMissionIds.ts`, `src/progress/schema.ts`, `src/progress/schema.test.ts`, `src/progress/session.ts`, `src/progress/session.test.ts`, `src/progress/progress.ts`, `src/progress/progress.test.ts` — revision 3, ability/session registration, reports.
- `src/context/ProgressContext.tsx`, `src/context/ProgressContext.test.tsx` — typed W3 session and condition-observation use writes.
- `src/components/MissionPageContent.tsx`, `src/components/ParentEquipmentReport.tsx` and relevant tests — dedicated lazy route and parent ability summary.
- `e2e/support/storageFaultAdapter.ts`, `playwright.config.ts` — W3 draft/run/completion fault states and test tags.
- `scripts/budget-limits.mjs`, `scripts/budget-limits.d.mts`, `scripts/check-bundle-budget.mjs`, `scripts/check-bundle-budget.test.mjs` — fixed 3 MiB W3 cold route.
- `scripts/check-asset-manifest.mjs`, `scripts/check-asset-manifest.test.mjs`, `docs/assets/asset-manifest.md` — exact W3 assets, 512 KiB per raster, 1.25 MiB mission media.
- `package.json` — include the new E2E source contract test.

### Task 1: Lock the course, budget, and browser-source contracts in RED

**Files:**
- Modify: `src/course/course.test.ts`
- Modify: `scripts/budget-limits.mjs`
- Modify: `scripts/budget-limits.d.mts`
- Modify: `scripts/check-bundle-budget.mjs`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Create: `scripts/check-week-three-manor-help-e2e-contract.mjs`
- Create: `scripts/check-week-three-manor-help-e2e-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add a failing formal-course contract**

```ts
it('registers only w3-m1 as a formal executable mission without a legacy sequence', () => {
  const mission = getMission('w3-m1');
  expect(isFormalMissionOutline(getMissionOutline('w3-m1'))).toBe(true);
  expect(isExecutableMissionId('w3-m1')).toBe(true);
  expect('expectedSequence' in mission).toBe(false);
  for (const id of ['w3-m2', 'w3-m3', 'w3-m4', 'w3-m5']) {
    expect(isFormalMissionOutline(getMissionOutline(id))).toBe(false);
    expect(isExecutableMissionId(id)).toBe(false);
  }
});
```

- [ ] **Step 2: Add the fixed W3 budget constant and a test that initially fails because the route is not wired**

```js
export const WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES = 3 * 1024 * 1024;
```

```js
assert.equal(bundleBudget.WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
assert.match(bundleSource, /WeekThreeManorHelpExperience/);
```

- [ ] **Step 3: Add a source contract that forbids legacy and injected success**

```js
export function assertWeekThreeManorHelpE2ESourceContract(source) {
  for (const phrase of [
    '@w3-m1-full', '@w3-m1-keyboard', '@w3-m1-storage', '@w3-m1-corrupt',
    '@w3-m1-parent', '@w3-m1-cold', '@w3-m1-asset-fault', '@w3-m1-narrow',
    '@w3-m1-external', '@w3-m1-lazy', '火眼金睛·条件观察',
    '练习情境·不改变原著', 'WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES',
  ]) if (!source.includes(phrase)) throw new Error(`w3-m1 source contract: missing ${phrase}`);
  if (/expectedSequence|LegacyMissionBuilder|MissionTools|missions\s*\[\s*['"]w3-m1['"]\s*\]\s*=/.test(source)) {
    throw new Error('w3-m1 source contract: legacy or injected completion is forbidden');
  }
}
```

- [ ] **Step 4: Run the RED checks**

Run: `npm run test:unit -- src/course/course.test.ts && npm run test:bundle-script`

Expected: FAIL because W3-M1 is still legacy, non-executable, and has no route/E2E source.

### Task 2: Define and verify the persistent condition-observation ability

**Files:**
- Create: `src/progress/conditionObservation.ts`
- Create: `src/progress/conditionObservation.test.ts`
- Modify: `src/progress/types.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/schema.test.ts`
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`

- [ ] **Step 1: Write failing tests for acquisition, stabilization, old-revision compatibility, and idempotent use**

```ts
it('derives acquisition from w2-m4 and stabilization from w2-m5 completion', () => {
  let progress = createInitialProgress();
  progress = completeMission(progress, 'w2-m4', { stars: 3, hintsUsed: 0 });
  expect(progress.abilities.conditionObservation).toEqual({
    acquiredAt: progress.missions['w2-m4'].completedAt,
    stableUnlockedAt: null,
  });
  progress = completeMission(progress, 'w2-m5', { stars: 3, hintsUsed: 0 });
  expect(progress.abilities.conditionObservation.stableUnlockedAt)
    .toBe(progress.missions['w2-m5'].completedAt);
});

it('migrates a legal revision-2 completion without requiring a historical session', () => {
  const migrated = importProgress(JSON.stringify(revisionTwoWithCompletedW2M4AndM5));
  expect(migrated.schemaRevision).toBe(3);
  expect(migrated.abilities.conditionObservation).toEqual({
    acquiredAt: migrated.missions['w2-m4'].completedAt,
    stableUnlockedAt: migrated.missions['w2-m5'].completedAt,
  });
});
```

- [ ] **Step 2: Add the minimal types and pure derivation**

```ts
export interface LearningAbilitiesV1 {
  conditionObservation: {
    acquiredAt: string | null;
    stableUnlockedAt: string | null;
  };
}

export function deriveConditionObservation(
  missions: Record<string, MissionProgress | undefined>,
): LearningAbilitiesV1['conditionObservation'] {
  return {
    acquiredAt: missions['w2-m4']?.completedAt ?? null,
    stableUnlockedAt: missions['w2-m5']?.completedAt ?? null,
  };
}
```

- [ ] **Step 3: Upgrade V3 to `schemaRevision: 3` with version-aware migration**

Parser rule: old revision 1/2 documents may omit `abilities`; derive it from legal mission completions. Revision 3 documents must contain `abilities`, and the parsed value must deep-equal `deriveConditionObservation(parsedMissions)`. If an old document includes a W2-M4/M5 session, keep the existing session parser's recompile/replay validation before accepting its completion.

- [ ] **Step 4: Make `completeMission` publish completion and derived ability in the same returned document**

```ts
const missions = { ...progress.missions, [missionId]: completedMission };
return {
  ...progress,
  missions,
  abilities: { conditionObservation: deriveConditionObservation(missions) },
  savedAt: new Date().toISOString(),
};
```

- [ ] **Step 5: Run focused tests**

Run: `npm run test:unit -- src/progress/conditionObservation.test.ts src/progress/schema.test.ts src/progress/progress.test.ts`

Expected: PASS; malformed or self-granted ability fields fail closed.

### Task 3: Build the pure W3-M1 graph contract and deterministic runner

**Files:**
- Create: `src/blockly/weekThreeManorHelpContract.ts`
- Create: `src/blockly/weekThreeManorHelpContract.test.ts`

- [ ] **Step 1: Write the failing truth-table and graph-integrity tests**

```ts
it('fails the default condition only on the public practice scenario', () => {
  const trace = compileManorHelpDraft(createDefaultManorHelpDraft());
  const run = runManorHelp(trace);
  expect(run.completed).toBe(false);
  expect(run.scenarioResults).toEqual([
    expect.objectContaining({ scenarioId: 'canon-gaocai-help', observedValue: true, actualBranch: 'then', passed: true }),
    expect.objectContaining({ scenarioId: 'practice-manor-directions', observedValue: true, actualBranch: 'then', passed: false }),
  ]);
  expect(run.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
});

it('completes only when the same graph gives true/then and false/else', () => {
  const run = runManorHelp(compileManorHelpDraft(correctManorHelpDraft()));
  expect(run.completed).toBe(true);
  expect(run.scenarioResults.map(({ scenarioId, observedValue, actualBranch }) => ({ scenarioId, observedValue, actualBranch }))).toEqual([
    { scenarioId: 'canon-gaocai-help', observedValue: true, actualBranch: 'then' },
    { scenarioId: 'practice-manor-directions', observedValue: false, actualBranch: 'else' },
  ]);
});
```

- [ ] **Step 2: Define the minimal contract**

```ts
export type ManorScenarioId = 'canon-gaocai-help' | 'practice-manor-directions';
export type ManorConditionKind = 'explicit-demon-help' | 'mentions-gao-manor';
export type ManorBranch = 'then' | 'else';

export interface ManorHelpInstruction {
  instructionId: string;
  scenarioId: ManorScenarioId;
  opcode: 'receive-message' | 'condition-checked' | 'accept-and-return-notice' | 'continue-journey';
  sourceBlockId: string;
  parentBlockId: string | null;
  conditionSourceBlockId: string | null;
  conditionKind: ManorConditionKind | null;
  observedValue: boolean | null;
  evidenceCode: string | null;
  actualBranch: ManorBranch | null;
}
```

- [ ] **Step 3: Implement the exact two public inputs and pure evaluation**

```ts
const SCENARIOS = [
  { id: 'canon-gaocai-help', mentionsGaoManor: true, explicitDemonHelp: true },
  { id: 'practice-manor-directions', mentionsGaoManor: true, explicitDemonHelp: false },
] as const;

const observe = (kind: ManorConditionKind, scenario: typeof SCENARIOS[number]) =>
  kind === 'explicit-demon-help' ? scenario.explicitDemonHelp : scenario.mentionsGaoManor;
```

- [ ] **Step 4: Validate every graph rejection from the specification**

Add table tests for empty, missing condition, missing `THEN`, missing `ELSE`, duplicate roots, unknown block, orphan, cross-container, non-reciprocal link, cycle, wrong input shape, duplicate action, and out-of-bounds graph. Each failure must carry `sourceBlockId` or the owning `if` block ID.

- [ ] **Step 5: Run the pure contract tests**

Run: `npm run test:unit -- src/blockly/weekThreeManorHelpContract.test.ts`

Expected: PASS with default failure, correct dual-scenario success, deterministic replay, and zero penalties.

### Task 4: Make the visible Blockly workspace the only compiler input

**Files:**
- Create: `src/blockly/weekThreeManorHelpBlocks.ts`
- Create: `src/blockly/weekThreeManorHelpCompiler.ts`
- Create: `src/blockly/weekThreeManorHelpCompiler.test.ts`

- [ ] **Step 1: Register the six child-facing block types**

```ts
export const MANOR_HELP_BLOCK_LABELS = {
  w3_manor_receive_message: '收到当前口信',
  w3_manor_if_message: '如果',
  w3_manor_condition_explicit_demon_help: '口信是在明确请求降妖帮助',
  w3_manor_condition_mentions_gao_manor: '口信提到了高老庄',
  w3_manor_accept_and_return_notice: '主动应承，并请来人回庄禀报',
  w3_manor_continue_journey: '继续问路前行',
} as const;
```

The `if` block must expose `CONDITION`, `THEN`, and `ELSE`; condition blocks output Boolean; action blocks are statements.

- [ ] **Step 2: Write failing compiler tests that mutate the real graph**

```ts
it('changes both scenario observations only when the visible condition connection changes', () => {
  restoreManorHelpWorkspace(workspace, createDefaultManorHelpDraft());
  expect(compileManorHelpWorkspace(workspace).trace.filter(isConditionCheck).map((i) => i.observedValue)).toEqual([true, true]);
  replaceVisibleCondition(workspace, 'w3_manor_condition_explicit_demon_help');
  expect(compileManorHelpWorkspace(workspace).trace.filter(isConditionCheck).map((i) => i.observedValue)).toEqual([true, false]);
});
```

- [ ] **Step 3: Implement snapshot and compile**

Use `workspace.getAllBlocks(false)`, `getInputTargetBlock('CONDITION')`, `getInputTargetBlock('THEN')`, `getInputTargetBlock('ELSE')`, `getPreviousBlock()`, `getNextBlock()`, and `getSurroundParent()`. Never inspect coordinates, labels, React state, or block IDs to infer condition semantics; derive semantics only from registered block `type`.

- [ ] **Step 4: Run compiler tests**

Run: `npm run test:unit -- src/blockly/weekThreeManorHelpCompiler.test.ts`

Expected: PASS; disconnecting, deleting, moving across branches, or inserting an unknown block changes the trace or returns a focused compile failure.

### Task 5: Add the strict W3-M1 session and failure-snapshot audit

**Files:**
- Create: `src/progress/manorHelpSessionSchema.ts`
- Create: `src/progress/weekThreeManorHelpSession.test.ts`
- Modify: `src/progress/types.ts`
- Modify: `src/progress/executableMissionIds.ts`
- Modify: `src/progress/session.ts`
- Modify: `src/progress/schema.ts`

- [ ] **Step 1: Define the dedicated session**

```ts
export interface ManorHelpFailureSnapshot {
  snapshotId: string;
  conditionSourceBlockId: string;
  conditionKind: ManorConditionKind;
  scenarioId: ManorScenarioId;
  observedValue: boolean;
  evidenceCode: string;
  evidenceTextKey: string;
  branch: ManorBranch;
}

export interface ManorHelpMissionSession extends MissionSessionData<
  ManorHelpWorkspaceDraftV1,
  ManorHelpInstruction,
  ManorHelpRunResult
> {
  scenarioResults: ManorScenarioResult[];
  failureSnapshot: ManorHelpFailureSnapshot | null;
  conditionObservationUses: Array<{ snapshotId: string; usedAt: string }>;
}
```

- [ ] **Step 2: Write failing tests for edit invalidation and use idempotency**

```ts
it('clears stale run and observation evidence when the visible graph changes', () => {
  const recorded = recordManorHelpRun(createMissionSession('w3-m1', NOW), failedRun, failedTrace, NOW);
  const edited = updateWorkspaceDraft(recorded, correctDraft, LATER);
  expect(edited).toMatchObject({ lastTrace: [], lastRun: null, scenarioResults: [], failureSnapshot: null });
  expect(edited.conditionObservationUses).toEqual(recorded.conditionObservationUses);
});

it('records one audit event for repeated views of the same snapshot', () => {
  const once = recordConditionObservationUse(sessionWithSnapshot, snapshotId, NOW);
  const twice = recordConditionObservationUse(once, snapshotId, LATER);
  expect(twice.conditionObservationUses).toEqual(once.conditionObservationUses);
});
```

- [ ] **Step 3: Implement strict parse-by-recompile-and-replay**

The parser must require exact keys, parse the draft, recompute `compileManorHelpDraft(draft)`, recompute `runManorHelp(trace)`, compare every scenario result and snapshot field, prove `conditionSourceBlockId` belongs to the trace, reject unknown scenario IDs, reject duplicate snapshot-use IDs, and enforce counter arithmetic.

- [ ] **Step 4: Register only `w3-m1` as executable**

Add `'w3-m1': ManorHelpMissionSession` to `MissionSessionById`, add it to `EXECUTABLE_MISSION_IDS`, creator overloads, workspace/update/run overloads, and `sessions()` parser routing. Keep W3-M2–M5 excluded.

- [ ] **Step 5: Run session tests**

Run: `npm run test:unit -- src/progress/weekThreeManorHelpSession.test.ts src/progress/executableMissionIds.test.ts src/progress/schema.test.ts src/progress/session.test.ts`

Expected: PASS including forged trace, forged snapshot, unknown scenario, partial evidence, and legal edited-after-run states.

### Task 6: Register the formal mission and dedicated lazy route

**Files:**
- Modify: `src/course/formalCourse.ts`
- Modify: `src/course/course.ts`
- Modify: `src/course/courseOutline.ts`
- Modify: `src/components/MissionPageContent.tsx`
- Create: `src/components/WeekThreeManorHelpRoute.test.tsx`

- [ ] **Step 1: Add W3 canon and formal mission**

```ts
export const formalWeekThreeCanon: CanonRef = {
  chapters: [18],
  title: '第十八回　观音院唐僧脱难　高老庄大圣除魔',
  sourceUrl: 'https://zh.wikisource.org/zh-hans/西游记/第018回',
};

export const formalWeekThreeMissions = [
  formalMission('w3-m1', {
    subtitle: '同一条件，辨清求助与问路',
    objective: '让同一张条件程序正确处理两张口信',
    canon: formalWeekThreeCanon,
    storyBeats: [
      beat('高才求助', '高才奉命寻找能降妖的法师，悟空听明原委后主动应承。'),
      beat('练习情境', '练习口信只介绍道路，不改变原著事件。'),
    ],
  }),
];
```

- [ ] **Step 2: Make only W3-M1 formal**

Extend `isFormalMissionOutline` with `outline?.id === 'w3-m1'`; spread `formalWeekThreeMissions` before the unchanged legacy W3-M2–M5 mission declarations.

- [ ] **Step 3: Add a dedicated route boundary**

Create `loadWeekThreeManorHelpExperience`, `WeekThreeManorHelpRouteBoundary`, and the `mission.id === 'w3-m1'` branch immediately after W2-M5. It receives the same completion-persistence and interaction-lock callbacks as W2 formal missions.

- [ ] **Step 4: Run course and route tests**

Run: `npm run test:unit -- src/course/course.test.ts src/components/WeekThreeManorHelpRoute.test.tsx`

Expected: PASS; W3-M1 never renders the legacy compatibility notice, and a rejected lazy import shows a local retry.

### Task 7: Build the one-graph Blockly editor with equivalent keyboard controls

**Files:**
- Create: `src/components/WeekThreeManorHelpBlocklyWorkspace.tsx`
- Create: `src/components/WeekThreeManorHelpBlocklyWorkspace.test.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
it('repairs the real CONDITION connection and saves before running', async () => {
  render(<WeekThreeManorHelpBlocklyWorkspace {...props} />);
  await user.click(screen.getByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
  await user.click(screen.getByRole('button', { name: '执行两张口信' }));
  expect(props.onDraftChange).toHaveBeenCalledWith(expect.objectContaining({ missionId: 'w3-m1' }));
  expect(props.onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
});
```

- [ ] **Step 2: Restore and snapshot the exact visible graph**

Follow the existing serialized-save pattern: disable Blockly events during restore, connect root→if, connect `CONDITION`, `THEN`, and `ELSE`, render all blocks, coalesce the same serialized draft into one in-flight save, and never call `onRun` until that draft reports `saved`.

- [ ] **Step 3: Add accessible visible repairs**

Buttons may select/replace the condition or restore a missing branch, but every button must mutate the same Blockly workspace connection. Required labels:

```text
换成：口信提到了高老庄
换成：口信是在明确请求降妖帮助
恢复“主动应承”分支
恢复“继续问路”分支
执行两张口信
```

- [ ] **Step 4: Verify focus and serialization**

Run: `npm run test:unit -- src/components/WeekThreeManorHelpBlocklyWorkspace.test.tsx`

Expected: PASS for initial wrong graph, condition replacement, disconnect/delete recovery, focused diagnostic block, duplicate-save coalescing, retry, and keyboard activation.

### Task 8: Implement the saved-run gate and read-only fire-eye panel

**Files:**
- Create: `src/components/WeekThreeManorHelpExperience.tsx`
- Create: `src/components/WeekThreeManorHelpExperience.test.tsx`
- Modify: `src/context/ProgressContext.tsx`
- Modify: `src/context/ProgressContext.test.tsx`

- [ ] **Step 1: Write the behavior tests before the component**

```tsx
it('shows fire-eye only after a persisted failure and changes only its audit field', async () => {
  renderExperience(stableAbilityProgress);
  expect(screen.queryByRole('button', { name: '火眼金睛·条件观察' })).not.toBeInTheDocument();
  await runDefaultGraph();
  const before = structuredClone(lastSavedProgress());
  await user.click(await screen.findByRole('button', { name: '火眼金睛·条件观察' }));
  expect(screen.getByRole('region', { name: '条件观察结果' })).toHaveTextContent('true');
  const after = lastSavedProgress();
  expect(stripObservationAudit(after)).toEqual(stripObservationAudit(before));
});
```

- [ ] **Step 2: Implement the persistence-first run pipeline**

Use this order: compile → deterministic run → persist session → publish events/feedback → Scene playback → persist mission completion. A failed or conflicted session save leaves the previous UI result in place and exposes the existing backup/reload choices.

- [ ] **Step 3: Implement fire-eye from the persisted failure snapshot only**

Render exactly the snapshot's child-facing condition label, `真/假`, public evidence text, and actual branch label. Do not name the correct condition, do not call workspace mutation callbacks, do not call run, and do not select a Blockly block. Repeated views call `recordConditionObservationUse` but remain idempotent by `snapshotId`.

- [ ] **Step 4: Invalidate observation after graph edits**

The saved `updateWorkspaceDraft` result clears the old failure snapshot before the panel can reopen. Preserve total failure and observation-use history.

- [ ] **Step 5: Run experience/context tests**

Run: `npm run test:unit -- src/components/WeekThreeManorHelpExperience.test.tsx src/context/ProgressContext.test.tsx`

Expected: PASS for failure-before-observation, stable ability gate, no star deduction, deep equality outside audit, edit invalidation, repeated-view idempotency, and three save-failure recoveries.

### Task 9: Generate, register, and verify the formal scene assets

**Files:**
- Create: `public/assets/week-three-manor-help/manor-help-background.webp`
- Create: `public/assets/week-three-manor-help/manor-message-states.webp`
- Create: `src/components/WeekThreeManorHelpScene.tsx`
- Create: `src/components/WeekThreeManorHelpScene.test.tsx`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`

- [ ] **Step 1: Use the built-in image-generation skill with the approved prompts**

Background prompt:

```text
Polished bright 3D Chinese children's storybook game environment, Journey to the West chapter 18 roadside outside Gao Family Manor, spring countryside, traditional manor gate in the middle distance, clear open foreground stage for two message scenarios, warm jade green cinnabar red and soft gold palette, friendly readable silhouettes, no combat, no text, no letters, no logo, no UI, no emoji, no frame, 16:9 wide composition.
```

State-sheet prompt:

```text
Polished bright 3D Chinese children's storybook game state sheet on a clean neutral transparent-friendly background: left group shows Gao Cai respectfully explaining an urgent request for a demon-subduing helper and returning toward Gao Family Manor; right group shows an ordinary villager calmly giving road directions with no request for help; distinct poses and generous separation for cropping, child-safe, warm jade cinnabar and gold palette, no text, no letters, no logo, no UI, no emoji, no checkerboard pattern.
```

- [ ] **Step 2: Perform only technical crop/resize/WebP encoding**

Keep each raster ≤ `512 * 1024` bytes and both plus any mission media ≤ `1.25 * 1024 * 1024` bytes. Record source prompt, processing tool/version, final dimensions, SHA-256, screen slot, and provenance.

- [ ] **Step 3: Add a fail-closed scene**

Use two literal `/assets/week-three-manor-help/*.webp` imports, `data-scene-ready`, muted/reduced-motion data attributes, local image retry, and playback completion only after both images load. Scene content comes from runtime events; it never determines success.

- [ ] **Step 4: Inspect both assets at original resolution and mark QA only after inspection**

Reject pseudo-text, cropped limbs/faces, inconsistent characters, muddy condition distinction, fake transparency, or unreadable 320px composition. Only accepted files receive `visual-qa-passed` manifest rows.

- [ ] **Step 5: Run asset and scene tests**

Run: `npm run test:unit -- src/components/WeekThreeManorHelpScene.test.tsx && npm run test:assets && npm run verify:assets`

Expected: PASS with exact two-file inventory, hashes, dimensions, source literals, retry behavior, and visual-QA status.

### Task 10: Add parent reporting and W3-specific storage fault recovery

**Files:**
- Modify: `src/components/ParentEquipmentReport.tsx`
- Modify: `src/components/ParentEquipmentReport.test.tsx`
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`
- Modify: `e2e/support/storageFaultAdapter.ts`

- [ ] **Step 1: Add a compact parent-facing ability summary test**

```tsx
expect(screen.getByRole('region', { name: '火眼金睛学习能力' })).toHaveTextContent('已获得');
expect(screen.getByRole('region', { name: '火眼金睛学习能力' })).toHaveTextContent('已稳定');
expect(screen.getByRole('region', { name: '火眼金睛学习能力' })).toHaveTextContent('主动观察 1 次');
expect(screen.queryByText(/conditionSourceBlockId|canon-gaocai-help|完整 trace/)).not.toBeInTheDocument();
```

- [ ] **Step 2: Count W3 support without claiming week completion**

Map repeated `conditionSelection`, `branchRouting`, and `programStructure` failures to the week-three support phrase `真假条件与分支`; keep weekly completion based only on actual mission completion records.

- [ ] **Step 3: Extend the storage fault adapter with exact W3 phases**

Recognize only:

```text
w3-m1 draft save: session appears with null run and no completion
w3-m1 run save: prior session exists, new lastRun appears, no completion
w3-m1 completion save: persisted successful run exists, mission completion appears
w3-m1 observation save: only conditionObservationUses changes for the same snapshot
```

Reject broader mutations so tests cannot hide an invalid write.

- [ ] **Step 4: Run report and storage tests**

Run: `npm run test:unit -- src/components/ParentEquipmentReport.test.tsx src/progress/progress.test.ts src/progress/storageFaultAdapter.test.ts`

Expected: PASS; W2-M5 failed completion never stabilizes the ability or unlocks W3-M1.

### Task 11: Build the five-project child-visible Playwright matrix

**Files:**
- Create: `e2e/week-three-manor-help-condition.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `scripts/check-week-three-manor-help-e2e-contract.mjs`

- [ ] **Step 1: Add only legal prerequisite progress**

The fixture may create/complete W1 and W2 prerequisites through public progress functions to reach W3-M1, but must not assign `sessions['w3-m1']`, `missions['w3-m1']`, workspace internals, ability fields, or completion directly. Every W3 edit uses visible buttons or Blockly keyboard interactions.

- [ ] **Step 2: Cover the main user path in every viewport/browser project**

```ts
await page.goto('./#/mission/w3-m1');
await page.getByRole('button', { name: '执行两张口信' }).click();
await expect(page.getByRole('alert')).toContainText('提到高老庄，却没有请求降妖帮助');
await page.getByRole('button', { name: '火眼金睛·条件观察' }).click();
await expect(page.getByRole('region', { name: '条件观察结果' })).toContainText('true');
await page.getByRole('button', { name: '换成：口信是在明确请求降妖帮助' }).click();
await page.getByRole('button', { name: '执行两张口信' }).click();
await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
```

- [ ] **Step 3: Add storage, corruption, CAS, export/import, parent, cold, asset, and lazy tests**

Verify draft/run/completion/observation failures separately; raw corrupt current download; snapshot recovery; stale-tab conflict backup; exact session and ability round-trip; parent summary privacy; cold response bytes ≤ 3 MiB; real image `Accept` returns 404 for a missing asset; Experience/Workspace/Scene lazy failures retry locally; no completion when scene is unhealthy.

- [ ] **Step 4: Add health evidence to every test**

Fail on all console errors, page errors, request failures, and HTTP errors without filtering. Verify no horizontal overflow and visible Blockly pixel variance at 320/390/768/1440, keyboard focus, mute, and reduced motion.

- [ ] **Step 5: Verify collection before running**

Run: `npx playwright test e2e/week-three-manor-help-condition.spec.ts --list`

Expected: all W3 tags collected into the intended 1440 Chromium, 768 WebKit, 390 Chromium, 1440 Firefox, and 320 Chromium projects.

- [ ] **Step 6: Run the W3 browser matrix**

Run: `npx playwright test e2e/week-three-manor-help-condition.spec.ts`

Expected: every collected W3 test passes; no test uses hidden W3 completion injection.

### Task 12: Run full regression gates and write the evidence boundary

**Files:**
- Create: `docs/verification/week-three-manor-help-condition.md`

- [ ] **Step 1: Run all fresh non-browser gates**

Run, in order:

```bash
npm test
npm run typecheck
npm run build
npm run verify:bundle
npm run verify:assets
git diff --check
```

Expected: all exit 0. Record exact file/test/contract/asset counts and byte totals from this run; do not reuse W2 counts.

- [ ] **Step 2: Run W3 plus the existing W1/W2 browser regression matrix**

Run: `npm run test:e2e`

Expected: all configured Playwright projects pass. If total runtime makes a single run impractical, run every project/tag explicitly and record the complete command list without claiming an omitted area passed.

- [ ] **Step 3: Audit the completion matrix**

Record evidence for player input, visible graph→trace, dual-scenario state transition, persistence, failure, refresh, recovery, fire-eye cross-system effect, keyboard/responsive behavior, asset provenance, and real-browser completion. Confirm W3-M2–M5 remain legacy and unverified.

- [ ] **Step 4: Write the verification document**

The verdict may be `One-level playable` only if every mandatory W3-M1 gate above passed with fresh evidence. It must also say:

```text
W3-M1: One-level playable
Third-week System loop complete: not complete
Full-content verified: not complete
Commercial production complete: not complete
No commit, push, or deploy was performed.
```

If any mandatory gate is missing or failing, write `W3-M1: not complete`, name the missing evidence, and identify the next blocking gap.

## Plan self-review

- Spec coverage: every approved gameplay, ability, migration, persistence, failure, asset, accessibility, budget, browser, and reporting requirement maps to Tasks 1–12.
- Type consistency: the plan consistently uses `ManorHelp*`, `conditionObservation`, `canon-gaocai-help`, `practice-manor-directions`, `THEN`, `ELSE`, and `WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES`.
- Scope: only W3-M1 becomes formal/executable; W3-M2–M5 remain legacy.
- Safety: every command is scoped to the protected worktree; destructive and Git publication actions are excluded.
