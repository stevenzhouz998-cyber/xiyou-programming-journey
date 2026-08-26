# Week Two Loop Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair W2-M4 save/conflict recovery and W2-M5 hint persistence/scoring while replacing the page's manual session-mission whitelist with one exhaustive runtime capability guard.

**Architecture:** Add a tiny progress-layer guard backed by `Record<ExecutableMissionId, true>` and reuse it in session creation and the mission page. Keep recovery ownership inside W2-M4 Experience and align it with W2-M1/M2/M3/M5. Keep W2-M5 scoring sourced only from persisted `usedHintTiers`.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Playwright, Progress V3 localStorage coordinator, Blockly.

**Safety:** Work only in `/Users/macmini-zz/.codex/worktrees/3abe/少儿编程学习网页`. Do not commit, push, deploy, reset, clean, or modify the main worktree; repository safety overrides generic plan commit steps.

---

## File map

- Create `src/progress/executableMissionIds.ts` and `.test.ts`: exhaustive session-backed mission guard and its unit test.
- Modify `src/progress/session.ts`: reuse the guard for session construction validation.
- Modify `src/components/MissionPageContent.tsx`: use the guard for hint persistence and locking.
- Modify `src/components/WeekTwoFurnaceConditionExperience.tsx`, `WeekTwoFurnaceConditionBlocklyWorkspace.tsx`, and the Experience test: complete retry/conflict recovery and clear stale local save warnings after a persisted draft arrives.
- Modify `src/components/WeekTwoHeavenlySignalBossRoute.test.tsx`: Boss hint persistence regression.
- Modify `e2e/support/storageFaultAdapter.ts`: exact W2-M4 draft fault mode.
- Modify W2-M4/M5 E2E and source-contract files: visible regression evidence.
- Update W2-M4/M5 verification documents only after fresh final verification.

### Task 1: Exhaustive executable-mission guard

**Files:**
- Create: `src/progress/executableMissionIds.ts`
- Create: `src/progress/executableMissionIds.test.ts`
- Modify: `src/progress/session.ts:1-120`

- [ ] **Step 1: Write the failing guard test**

```ts
import { describe, expect, it } from 'vitest';
import { isExecutableMissionId } from './executableMissionIds';

describe('executable mission ids', () => {
  it('recognizes every current session mission and rejects other ids', () => {
    for (const id of [
      'w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5',
      'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4', 'w2-m5',
    ]) expect(isExecutableMissionId(id)).toBe(true);
    for (const id of ['w3-m1', 'legacy-mission', '', 'w2-m6']) {
      expect(isExecutableMissionId(id)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run RED**

```bash
npx vitest run src/progress/executableMissionIds.test.ts
```

Expected: FAIL because `./executableMissionIds` does not exist.

- [ ] **Step 3: Add the minimal exhaustive guard**

```ts
import type { ExecutableMissionId } from './types';

const EXECUTABLE_MISSION_IDS = {
  'w1-m1': true, 'w1-m2': true, 'w1-m3': true, 'w1-m4': true, 'w1-m5': true,
  'w2-m1': true, 'w2-m2': true, 'w2-m3': true, 'w2-m4': true, 'w2-m5': true,
} as const satisfies Record<ExecutableMissionId, true>;

export function isExecutableMissionId(value: string): value is ExecutableMissionId {
  return Object.prototype.hasOwnProperty.call(EXECUTABLE_MISSION_IDS, value);
}
```

- [ ] **Step 4: Replace both long ID checks in `createMissionSession`**

```ts
const missionIdOnly = suppliedNow === undefined && isExecutableMissionId(missionIdOrNow);
const now = suppliedNow ?? (missionIdOnly ? new Date(0).toISOString() : missionIdOrNow);
if (suppliedNow !== undefined && !isExecutableMissionId(missionIdOrNow)) {
  throw new Error('任务编号无效');
}
```

Do not alter overloads, default workspaces, timestamps, traces, or counters.

- [ ] **Step 5: Run GREEN and type coverage**

```bash
npx vitest run src/progress/executableMissionIds.test.ts src/progress/session.test.ts
npm run typecheck
```

Expected: PASS and TypeScript exit 0. Removing a guard key must make `Record<ExecutableMissionId, true>` fail type checking.

### Task 2: W2-M4 draft retry and conflict recovery

**Files:**
- Modify: `src/components/WeekTwoFurnaceConditionExperience.test.tsx`
- Modify: `src/components/WeekTwoFurnaceConditionExperience.tsx:1-55`
- Modify: `src/components/WeekTwoFurnaceConditionBlocklyWorkspace.tsx:35-80`
- Modify: `e2e/support/storageFaultAdapter.ts:150-235`
- Modify: `e2e/week-two-furnace-condition.spec.ts`
- Modify/Test: `scripts/check-week-two-furnace-e2e-contract.mjs` and `.test.mjs`

- [ ] **Step 1: Add component RED for draft retry without pending playback**

Use a custom save coordinator that returns `unsaved` for the first W2-M4 draft and `saved` after `failDraft=false`. Replace the visible condition, assert the retry alert and disabled run button, retry, then assert the alert disappears and “执行八卦炉循环” becomes enabled. Also assert no completion callback and `lastRun === null`.

Core coordinator:

```ts
let failDraft = true;
const saveProgressCoordinated = vi.fn(async (progress: any) => {
  if (failDraft && progress.sessions['w2-m4']?.lastRun === null) {
    return { status: 'unsaved' as const, progress, error: 'synthetic furnace draft fault' };
  }
  localStorage.setItem('xiyou-programming-progress-v3', JSON.stringify(progress));
  return { status: 'saved' as const, revision: 1, progress };
});
```

- [ ] **Step 2: Run RED**

```bash
npx vitest run src/components/WeekTwoFurnaceConditionExperience.test.tsx
```

Expected: FAIL because successful retry with no pending run falls back to `unsaved`.

- [ ] **Step 3: Add component RED for conflict controls**

Return `{ status: 'conflict', progress, error: 'synthetic conflict' }` for the draft write. Assert exactly one “下载本页备份” and one “载入其他标签页版本”, and no “重试保存本次记录”.

- [ ] **Step 4: Run RED again**

Expected: FAIL because W2-M4 currently renders no conflict buttons.

- [ ] **Step 5: Implement minimal retry and conflict behavior**

Import `downloadTextFile`; request `createBackup` and `reloadExternalProgress` from `useProgress`; replace `retry` with:

```ts
const retry = async () => {
  setPending(true); setRecovery('none'); setLock(true, 'session-pending');
  const saved = await retrySave();
  setPending(false);
  if (saved.status === 'saved') {
    const next = pendingRun.current;
    pendingRun.current = null;
    if (next) publish(next); else setLock(false, 'idle');
    return;
  }
  setRecovery(saved.status === 'conflict' ? 'conflict' : 'unsaved');
  setLock(true, 'session-recovery');
};
```

For `conflict`, render backup and external-load buttons. External load must clear `pendingRun`, call `reloadExternalProgress()`, set recovery to `none`, and unlock with `setLock(false, 'idle')`.

- [ ] **Step 6: Run component GREEN**

```bash
npx vitest run src/components/WeekTwoFurnaceConditionExperience.test.tsx
```

Expected: all W2-M4 Experience tests PASS.

- [ ] **Step 7: Add exact E2E draft fault and browser RED paths**

Add `exactFurnaceDraftDelta` restricted to `sessions['w2-m4']`, `lastRun === null`, and no W2-M4 mission completion. Register only:

```ts
if (mode === 'fail-furnace-draft' && exactFurnaceDraftDelta(previous, progress)) return FAILURE;
```

Add an `@furnace-storage @storage` test that fails a visible condition edit, disables the fault, retries via the visible button, and proves the run button unlocks without playback/completion.

Add an `@furnace-storage @storage` two-tab test: attach health to the stale page, save the correct condition in the first page, try another visible condition in the stale page, assert conflict buttons, download a backup, load the external version, and assert the stale visible program tree contains “听见炉头声响并看见光明”. Close the stale page.

- [ ] **Step 8: Strengthen the source contract**

Require these E2E phrases and add negative fixtures that remove each one:

```js
for (const phrase of ['fail-furnace-draft', '下载本页备份', '载入其他标签页版本']) {
  requireText(source, phrase);
}
```

- [ ] **Step 9: Run W2-M4 GREEN**

```bash
node --test scripts/check-week-two-furnace-e2e-contract.test.mjs
npx playwright test e2e/week-two-furnace-condition.spec.ts --project=desktop-chromium-1440x1024 --grep '@furnace-storage'
```

Expected: contract and all collected W2-M4 storage browser tests PASS with empty health events.

### Task 3: W2-M5 persisted hints and scoring

**Files:**
- Modify: `src/components/MissionPageContent.tsx:1-760`
- Modify: `src/components/WeekTwoHeavenlySignalBossRoute.test.tsx`
- Modify: `e2e/week-two-heavenly-signal-boss.spec.ts`
- Modify/Test: `scripts/check-week-two-heavenly-boss-e2e-contract.mjs` and `.test.mjs`

- [ ] **Step 1: Add route RED for distinct persisted Boss hint tiers**

After the real Boss route loads, click “观察提示” three times to open, close, and reopen it, then assert:

```ts
await waitFor(() => expect(
  JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m5'].usedHintTiers,
).toEqual(['observe']));
```

- [ ] **Step 2: Run RED**

```bash
npx vitest run src/components/WeekTwoHeavenlySignalBossRoute.test.tsx
```

Expected: FAIL with `usedHintTiers === []` because W2-M5 enters the local legacy hint-counter branch.

- [ ] **Step 3: Replace both page whitelists with the guard**

```ts
const sessionBackedMission = isExecutableMissionId(mission.id);
const hintsLocked = sessionBackedMission
  && (battleInteractionLocked || completionSave !== null);
```

Use the same guard in `HintPanel.onUse`:

```ts
if (isExecutableMissionId(mission.id)) {
  if (!progress.sessions[mission.id]?.usedHintTiers.includes(tier)) {
    void recordMissionHint(mission.id, tier);
  }
} else {
  setHintsUsed((count) => count + 1);
}
```

Do not change legacy W3-W6 page-local hint behavior.

- [ ] **Step 4: Run route GREEN and W1 hint regression**

```bash
npx vitest run src/components/WeekTwoHeavenlySignalBossRoute.test.tsx src/App.test.tsx
```

Expected: PASS; existing W1 hint behavior remains unchanged.

- [ ] **Step 5: Extend the Boss parent E2E to prove scoring**

Before `correctAll(page)`, click “观察提示” once and wait for `usedHintTiers=['observe']`. After completion assert:

```ts
expect(saved.missions['w2-m5']).toMatchObject({ status: 'completed', stars: 2, hintsUsed: 1 });
expect(saved.sessions['w2-m5'].usedHintTiers).toEqual(['observe']);
```

After refresh assert the same values. In the parent report assert one hint is visible; after export/import assert both the mission completion and Boss session equal the exported values.

- [ ] **Step 6: Strengthen Boss source contract**

Require `usedHintTiers`, `hintsUsed: 1`, and `stars: 2`; add negative fixtures that remove each evidence phrase.

- [ ] **Step 7: Run Boss GREEN**

```bash
node --test scripts/check-week-two-heavenly-boss-e2e-contract.test.mjs
npx playwright test e2e/week-two-heavenly-signal-boss.spec.ts --project=desktop-chromium-1440x1024 --grep '@boss-parent'
```

Expected: the browser persists one hint, awards two stars, reports one hint, and restores identical imported data.

### Task 4: Full verification and evidence update

**Files:**
- Modify after fresh evidence: `docs/verification/week-two-furnace-condition.md`
- Modify after fresh evidence: `docs/verification/week-two-heavenly-signal-boss.md`

- [ ] **Step 1: Run focused regression**

```bash
npx vitest run src/progress/executableMissionIds.test.ts src/progress/session.test.ts src/components/WeekTwoFurnaceConditionExperience.test.tsx src/components/WeekTwoHeavenlySignalBossRoute.test.tsx src/components/WeekTwoHeavenlySignalBossExperience.test.tsx src/App.test.tsx
npm run typecheck
npm run test:bundle-script
```

Expected: zero failures.

- [ ] **Step 2: Run the complete second-week browser matrix alone on port 4173**

```bash
npx playwright test e2e/week-two-horse-care.spec.ts e2e/week-two-monkey-king-events.spec.ts e2e/week-two-peach-elixir-debug.spec.ts e2e/week-two-furnace-condition.spec.ts e2e/week-two-heavenly-signal-boss.spec.ts
```

Expected: 104 existing tests plus new W2-M4 tests pass; no second preview process shares port 4173.

- [ ] **Step 3: Run complete local verification**

```bash
npm run test:unit
npm run verify:bundle
npm run verify:assets
git diff --check
```

Expected: unit suite, production build, budgets, provenance/visual QA, and whitespace checks exit 0.

- [ ] **Step 4: Update evidence honestly**

Record fresh counts and commands. Keep the achieved ceiling at `One-level playable`; report second-week `System loop complete` as `not complete` until a real reward/mastery effect changes later choices. Keep W1 full Playwright, whole-site content verification, public deployment, and release outside this task unless separately run.

- [ ] **Step 5: Confirm no unauthorized repository action**

```bash
git status --short --branch
git log -1 --oneline --decorate
```

Expected: branch `codex/week-two-formal`, HEAD `f0b07ec5cff05b7b3ee5ea94961cf7c015170b97`, and no commit/push/deploy/reset/clean.

## Plan self-review

- Spec coverage: shared guard, M4 retry/conflict recovery, M5 hint persistence/scoring, refresh, import/export, parent report, browser evidence, and completion boundary all have explicit tasks.
- Placeholder scan: no `TBD`, `TODO`, “implement later”, vague error-handling step, or “similar to” instruction remains.
- Type consistency: the guard narrows to existing `ExecutableMissionId`; recovery remains `none | unsaved | conflict`; labels match current product copy.
- Scope: no reward, currency, equipment, course, Blockly answer, visual, deployment, or Git-history behavior is introduced.
