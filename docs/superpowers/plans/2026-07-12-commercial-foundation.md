# Commercial Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a versioned, recoverable local save system and a responsive, accessible, performance-budgeted application shell with repeatable real-browser evidence.

**Architecture:** Separate progress schema validation and migration from storage transactions and React state. Surface recovery and write failures as typed application state, then adapt the existing pages without replacing the real Blockly, CodeMirror, AI, or Phaser interactions. Add deterministic bundle-budget checks and Playwright acceptance paths for the supported viewports and browsers.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, Playwright, localStorage, CSS media queries.

---

## File Structure

- Create `src/progress/types.ts`: V1/V2 data contracts, storage and recovery result types.
- Create `src/progress/schema.ts`: strict validation, V1 → V2 migration, import parsing.
- Create `src/progress/storage.ts`: transactional current/snapshot/corrupt storage operations.
- Modify `src/progress/progress.ts`: mission/report domain functions operating on V2.
- Modify `src/context/ProgressContext.tsx`: expose save status, recovery status and safe mutations.
- Create `src/components/RecoveryNotice.tsx`: child-safe recovery and unsaved-state notice.
- Create `src/components/PrivacyPanel.tsx`: local-data explanation and acknowledgement.
- Create `src/utils/download.ts`: isolated browser download helper for backups and corrupt-source exports.
- Modify `src/App.tsx`: wire recovery, privacy, parent backup/import/clear, lazy mission tools and focus behavior.
- Modify `src/styles.css`: responsive application shell and accessibility states.
- Modify `index.html`: declare Simplified Chinese content.
- Create `scripts/check-bundle-budget.mjs`: deterministic entry-bundle budget check.
- Modify `vite.config.mjs`: emit manifest and deterministic chunks needed by the budget check.
- Create `playwright.config.ts`: supported browser and viewport projects.
- Create `e2e/commercial-foundation.spec.ts`: real-browser save, recovery, import, mobile and keyboard paths.
- Create `docs/verification/commercial-foundation.md`: commands, browser matrix, measured bundle results and residual risks.

### Task 1: Add Strict Progress V2 Schema And Migration

**Files:**
- Create: `src/progress/types.ts`
- Create: `src/progress/schema.ts`
- Create: `src/progress/schema.test.ts`
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`

- [ ] **Step 1: Write failing schema and migration tests**

Create tests that establish the complete boundary:

```ts
import { describe, expect, it } from 'vitest';
import { createInitialProgress } from './progress';
import { parseProgress, migrateProgress } from './schema';

describe('progress V2 schema', () => {
  it('migrates V1 without losing mission or setting data', () => {
    const v1 = {
      version: 1,
      learnerName: '小行者',
      missions: {
        'w1-m1': { status: 'completed', stars: 2, attempts: 3, hintsUsed: 1, completedAt: '2026-07-12T00:00:00.000Z' },
      },
      settings: { muted: true, reducedMotion: false, parentPin: '2580' },
      savedAt: '2026-07-12T00:00:00.000Z',
    };
    expect(migrateProgress(v1)).toMatchObject({
      version: 2,
      schemaRevision: 1,
      learnerName: '小行者',
      missions: v1.missions,
      settings: v1.settings,
      privacy: { localDataNoticeSeen: false },
    });
  });

  it('accepts a valid V2 round trip', () => {
    const progress = createInitialProgress();
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });

  it.each([
    ['unknown version', { version: 99 }],
    ['unknown mission', { ...createInitialProgress(), missions: { unknown: { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: '2026-07-12T00:00:00.000Z' } } }],
    ['invalid stars', { ...createInitialProgress(), missions: { 'w1-m1': { status: 'completed', stars: 8, attempts: 1, hintsUsed: 0, completedAt: '2026-07-12T00:00:00.000Z' } } }],
    ['invalid date', { ...createInitialProgress(), savedAt: 'yesterday' }],
    ['invalid pin', { ...createInitialProgress(), settings: { ...createInitialProgress().settings, parentPin: 'abcd' } }],
  ])('rejects %s', (_label, value) => {
    expect(() => migrateProgress(value)).toThrow();
  });
});
```

Extend `progress.test.ts` to assert `completeMission()` returns V2 and preserves `privacy`, `recovery`, and `schemaRevision`.

- [ ] **Step 2: Run the focused tests and verify the red state**

Run:

```bash
npm test -- src/progress/schema.test.ts src/progress/progress.test.ts
```

Expected: FAIL because `types.ts`, `schema.ts`, `ProgressV2`, and migration behavior do not exist.

- [ ] **Step 3: Define V1 and V2 contracts**

In `types.ts`, define reusable types with these exact public shapes:

```ts
export interface MissionProgress {
  status: 'completed';
  stars: 1 | 2 | 3;
  attempts: number;
  hintsUsed: number;
  completedAt: string;
}

export interface ProgressSettings {
  muted: boolean;
  reducedMotion: boolean;
  reducedMotionOverride: boolean;
  parentPin: string;
}

export interface ProgressV1 {
  version: 1;
  learnerName: string;
  missions: Record<string, MissionProgress>;
  settings: Omit<ProgressSettings, 'reducedMotionOverride'>;
  savedAt: string;
}

export interface ProgressV2 {
  version: 2;
  schemaRevision: 1;
  learnerName: string;
  missions: Record<string, MissionProgress>;
  settings: ProgressSettings;
  privacy: { localDataNoticeSeen: boolean };
  recovery: { lastRecoveredAt: string | null; source: 'snapshot' | 'initial' | null };
  savedAt: string;
}

export type ProgressDocument = ProgressV1 | ProgressV2;
```

- [ ] **Step 4: Implement strict validation and migration**

In `schema.ts`:

- Parse JSON separately so syntax errors produce `进度文件无法读取`.
- Accept only plain objects.
- Validate every mission ID against `allMissions`, every numeric field as a finite non-negative integer, stars as 1–3, PIN as 4–6 digits, and dates with `Number.isNaN(Date.parse(value)) === false`.
- Reject unknown top-level versions with `进度版本不受支持`.
- Migrate V1 to V2 with `reducedMotionOverride: false`, unseen privacy notice, and empty recovery metadata.
- Return a fresh validated object instead of casting the input.
- Export `migrateProgress(value: unknown): ProgressV2` and `parseProgress(raw: string): ProgressV2`.

Update `progress.ts` to import types, return `ProgressV2` from `createInitialProgress`, and preserve all V2 branches in domain updates. Re-export types needed by existing consumers.

- [ ] **Step 5: Run focused and full unit verification**

Run:

```bash
npm test -- src/progress/schema.test.ts src/progress/progress.test.ts
npm run typecheck
npm test
```

Expected: all commands exit 0; the suite contains explicit migration and malformed-field coverage.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/progress/types.ts src/progress/schema.ts src/progress/schema.test.ts src/progress/progress.ts src/progress/progress.test.ts
git commit -m "feat: add strict progress v2 schema"
```

### Task 2: Add Transactional Storage And Recovery

**Files:**
- Create: `src/progress/storage.ts`
- Create: `src/progress/storage.test.ts`
- Modify: `src/progress/progress.ts`

- [ ] **Step 1: Write failing transaction and recovery tests**

Use an in-memory `Storage` fake that can throw on selected writes. Cover:

```ts
it('snapshots the previous valid current document before saving', () => {
  const storage = createMemoryStorage();
  const first = createInitialProgress();
  const second = { ...first, learnerName: '第二次保存' };
  saveProgressTransaction(first, storage);
  saveProgressTransaction(second, storage);
  expect(parseProgress(storage.getItem(PROGRESS_SNAPSHOT_KEY)!)).toEqual(first);
  expect(parseProgress(storage.getItem(PROGRESS_CURRENT_KEY)!)).toEqual(second);
});

it('preserves corrupt raw input and recovers the snapshot', () => {
  const storage = createMemoryStorage({
    [PROGRESS_CURRENT_KEY]: '{broken',
    [PROGRESS_SNAPSHOT_KEY]: JSON.stringify(createInitialProgress()),
  });
  const result = loadProgressWithRecovery(storage, fixedClock);
  expect(result.status).toBe('recovered-from-snapshot');
  expect(storage.getItem(PROGRESS_CORRUPT_KEY)).toBe('{broken');
  expect(result.progress.recovery.source).toBe('snapshot');
});

it('preserves both corrupt values before an initial reset', () => {
  const storage = createMemoryStorage({
    [PROGRESS_CURRENT_KEY]: '{broken-current',
    [PROGRESS_SNAPSHOT_KEY]: '{broken-snapshot',
  });
  const result = loadProgressWithRecovery(storage, fixedClock);
  expect(result.status).toBe('reset-after-corruption');
  expect(JSON.parse(storage.getItem(PROGRESS_CORRUPT_KEY)!)).toEqual({
    current: '{broken-current', snapshot: '{broken-snapshot',
  });
});

it('returns an unsaved result when a write fails', () => {
  const storage = createThrowingStorage(PROGRESS_CURRENT_KEY);
  expect(saveProgressTransaction(createInitialProgress(), storage)).toMatchObject({ status: 'unsaved' });
});
```

Also cover: no stored value, valid V1 migration, invalid snapshot, retry after write failure, and current data unchanged after rejected import.

- [ ] **Step 2: Verify tests fail before implementation**

Run:

```bash
npm test -- src/progress/storage.test.ts
```

Expected: FAIL because storage keys and transaction functions do not exist.

- [ ] **Step 3: Implement explicit storage results**

Export these contracts from `storage.ts`:

```ts
export const PROGRESS_CURRENT_KEY = 'xiyou-programming-progress-v2';
export const PROGRESS_SNAPSHOT_KEY = 'xiyou-programming-progress-snapshot-v2';
export const PROGRESS_CORRUPT_KEY = 'xiyou-programming-progress-corrupt-v2';

export type LoadStatus = 'normal' | 'migrated' | 'recovered-from-snapshot' | 'reset-after-corruption';
export interface LoadResult { progress: ProgressV2; status: LoadStatus; corruptDownload: string | null; }
export type SaveResult = { status: 'saved'; progress: ProgressV2 } | { status: 'unsaved'; progress: ProgressV2; error: string };
```

Implement:

- `loadProgressWithRecovery(storage = localStorage, now = () => new Date())`.
- `saveProgressTransaction(progress, storage = localStorage)`.
- `importProgressTransaction(raw, storage = localStorage)` that validates before any write.
- `retrySave(progress, storage)` as the same transaction with a user-facing result.
- `createProgressBackup(progress)` returning a JSON `Blob` payload description without clicking the DOM.
- `clearProgressTransaction(storage, now)` that snapshots current valid data before replacing it with initial V2.

Never remove corrupt keys during automatic recovery. Never catch and discard storage errors without returning `unsaved`.

- [ ] **Step 4: Remove the legacy silent-reset path**

Replace `loadProgress` and `saveProgress` exports in `progress.ts` with compatibility re-exports that delegate to the new typed storage module, then update tests so no caller can receive a bare progress object without knowing the load status.

- [ ] **Step 5: Verify storage behavior**

Run:

```bash
npm test -- src/progress/storage.test.ts src/progress/schema.test.ts src/progress/progress.test.ts
npm run typecheck
```

Expected: exit 0 with current/snapshot/corrupt, write failure, import atomicity and migration tests passing.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/progress/storage.ts src/progress/storage.test.ts src/progress/progress.ts
git commit -m "feat: add recoverable progress storage"
```

### Task 3: Surface Recovery, Unsaved State, Privacy And Motion Settings

**Files:**
- Create: `src/components/RecoveryNotice.tsx`
- Create: `src/components/RecoveryNotice.test.tsx`
- Create: `src/components/PrivacyPanel.tsx`
- Create: `src/components/PrivacyPanel.test.tsx`
- Modify: `src/context/ProgressContext.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing context and component tests**

Cover these public behaviors:

```ts
it('shows a calm child-facing recovery notice and a parent detail link', () => {
  render(<RecoveryNotice status="recovered-from-snapshot" saveStatus="saved" onRetry={vi.fn()} />);
  expect(screen.getByRole('status')).toHaveTextContent('学习进度已经安全恢复');
  expect(screen.getByRole('link', { name: '请家长查看详情' })).toHaveAttribute('href', '#/parent?recovery=1');
});

it('does not claim an unsaved completion is stored', () => {
  render(<RecoveryNotice status="normal" saveStatus="unsaved" onRetry={vi.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('本次进度尚未保存');
  expect(screen.getByRole('button', { name: '重试保存' })).toBeEnabled();
});

it('explains local-only data before acknowledgement', () => {
  render(<PrivacyPanel acknowledged={false} onAcknowledge={vi.fn()} />);
  expect(screen.getByRole('heading', { name: '你的学习数据保存在这台设备' })).toBeInTheDocument();
  expect(screen.getByText(/不会发送广告、分析或儿童行为数据/)).toBeInTheDocument();
});
```

Extend `App.test.tsx` with injected storage tests for recovery notice, retry save, privacy acknowledgement persistence, and user motion override.

- [ ] **Step 2: Run focused tests and verify failure**

```bash
npm test -- src/components/RecoveryNotice.test.tsx src/components/PrivacyPanel.test.tsx src/App.test.tsx
```

Expected: FAIL because the components and typed context state do not exist.

- [ ] **Step 3: Upgrade ProgressContext**

Expose:

```ts
interface ProgressContextValue {
  progress: ProgressV2;
  loadStatus: LoadStatus;
  saveStatus: 'saved' | 'unsaved';
  saveError: string | null;
  corruptDownload: string | null;
  complete: (missionId: string, input: CompletionInput) => SaveResult;
  replaceFromImport: (raw: string) => SaveResult;
  updateSettings: (settings: Partial<ProgressV2['settings']>) => SaveResult;
  acknowledgePrivacy: () => SaveResult;
  retrySave: () => SaveResult;
  clearProgress: () => SaveResult;
}
```

Initialize once from `loadProgressWithRecovery`. Centralize all mutations through one `commit` function that updates React state and records `saved` or `unsaved`. Do not show success wording when persistence failed.

- [ ] **Step 4: Implement visible recovery and privacy behavior**

- Render `RecoveryNotice` below the global header on all routes.
- Use `role="status"` for recovered state and `role="alert"` for unsaved state.
- Give retry a real context action.
- Show `PrivacyPanel` on first use; allow dismissal only through acknowledgement, then persist it.
- Add a visible reduced-motion control beside mute. Use `matchMedia('(prefers-reduced-motion: reduce)')` only when `reducedMotionOverride` is false; an explicit user toggle sets the override.
- Apply `data-reduced-motion="true|false"` to the root application element so Phaser and CSS can observe the same setting.

- [ ] **Step 5: Verify components and state**

```bash
npm test -- src/components/RecoveryNotice.test.tsx src/components/PrivacyPanel.test.tsx src/App.test.tsx
npm run typecheck
npm test
```

Expected: all pass with assertions for recovery, unsaved status, privacy and motion persistence.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/components/RecoveryNotice.tsx src/components/RecoveryNotice.test.tsx src/components/PrivacyPanel.tsx src/components/PrivacyPanel.test.tsx src/context/ProgressContext.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: surface save recovery and privacy"
```

### Task 4: Make Parent Data Operations Safe And Observable

**Files:**
- Create: `src/components/ParentDataTools.tsx`
- Create: `src/components/ParentDataTools.test.tsx`
- Create: `src/utils/download.ts`
- Create: `src/utils/download.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing parent workflow tests**

Cover:

```ts
it('keeps current progress after a malformed import', async () => {
  const onImport = vi.fn(() => ({ status: 'rejected' as const, error: '进度文件无法读取' }));
  render(<ParentDataTools {...baseProps} onImport={onImport} />);
  const file = new File(['{broken'], 'broken.json', { type: 'application/json' });
  fireEvent.change(screen.getByLabelText('导入进度文件'), { target: { files: [file] } });
  expect(screen.getByRole('alert')).toHaveTextContent('进度文件无法读取');
  expect(screen.getByText(/当前进度未被修改/)).toBeInTheDocument();
});

it('requires explicit confirmation and creates a backup before clear', async () => {
  const onBackup = vi.fn();
  const onClear = vi.fn();
  render(<ParentDataTools {...baseProps} onBackup={onBackup} onClear={onClear} />);
  fireEvent.click(screen.getByRole('button', { name: '清空学习数据' }));
  expect(onClear).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('输入“清空”以确认'), { target: { value: '清空' } });
  fireEvent.click(screen.getByRole('button', { name: '备份并清空' }));
  expect(onBackup).toHaveBeenCalledBefore(onClear);
});
```

Add tests for last saved time, load status, corrupt-source download availability, successful import version reporting, focus return after closing confirmation, and wrong PIN.

- [ ] **Step 2: Verify tests fail**

```bash
npm test -- src/components/ParentDataTools.test.tsx src/App.test.tsx
```

Expected: FAIL because safe parent tools do not exist.

- [ ] **Step 3: Extract ParentDataTools**

The component must receive typed callbacks and never touch storage directly. It renders:

- Current storage state and `savedAt`.
- Export current progress.
- Import file with in-memory validation before context replacement.
- Corrupt-source download only when available.
- Clear confirmation dialog with `role="dialog"`, labelled title, initial focus on the text input, Escape close, background inert behavior where supported, and focus return to the trigger.
- Explicit messages for imported, rejected, cleared and unsaved outcomes.

Implement `downloadTextFile(filename, contents, mimeType)` in `src/utils/download.ts`. Unit-test that it creates an object URL, assigns the filename, clicks once, revokes the URL, and always removes the temporary anchor.

- [ ] **Step 4: Wire parent actions to transactional storage**

Replace the ad hoc `FileReader` and direct `replaceProgress` path in `App.tsx`. Keep the PIN gate. A malformed or future-version import must not mutate progress. Clearing must call backup before `clearProgress` and retain the generated download even if storage clear fails.

- [ ] **Step 5: Verify parent workflows**

```bash
npm test -- src/components/ParentDataTools.test.tsx src/utils/download.test.ts src/App.test.tsx src/progress/storage.test.ts
npm run typecheck
```

Expected: all pass, including atomic import and backup-before-clear ordering.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/components/ParentDataTools.tsx src/components/ParentDataTools.test.tsx src/utils/download.ts src/utils/download.test.ts src/App.tsx src/App.test.tsx
git commit -m "feat: protect parent data operations"
```

### Task 5: Deliver Responsive, Accessible Shell And Bundle Budgets

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/components/GameScene.tsx`
- Modify: `index.html`
- Modify: `vite.config.mjs`
- Modify: `package.json`
- Create: `scripts/check-bundle-budget.mjs`
- Create: `src/responsive.test.tsx`

- [ ] **Step 1: Write failing accessibility and lazy-loading checks**

In `responsive.test.tsx`, assert:

```ts
import { readFile } from 'node:fs/promises';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

it('declares a Chinese document and accessible global controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  expect(html).toContain('<html lang="zh-CN">');
  render(<App />);
  expect(screen.getByRole('button', { name: /减弱动画/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /关闭声音|开启声音/ })).toBeEnabled();
});

it('does not statically import mission editors from the application entry', async () => {
  const source = await readFile(new URL('./App.tsx', import.meta.url), 'utf8');
  expect(source).not.toMatch(/^import .*BlocklyWorkspace/m);
  expect(source).not.toMatch(/^import .*PythonEditor/m);
  expect(source).not.toMatch(/^import .*AiLab/m);
});
```

Add a static CSS assertion that `html` and `body` no longer contain `min-width: 1180px` and that media queries exist for `900px` and `600px`.

- [ ] **Step 2: Verify red state**

```bash
npm test -- src/responsive.test.tsx
```

Expected: FAIL on document language, static editor imports and hard-coded minimum width.

- [ ] **Step 3: Implement responsive and focus-safe layout**

- Set `lang="zh-CN"`.
- Remove global minimum width.
- At `max-width: 900px`, make home and mission layouts single-column, make story content non-sticky, and preserve a minimum 44px touch target.
- At `max-width: 600px`, stack the top bar, mission heading and parent report; make dialogs `width: min(100% - 24px, 520px)`; keep only component-level controlled overflow for Blockly/CodeMirror.
- Add `:focus-visible` coverage for buttons, links, inputs, editor controls and dialog actions.
- With reduced motion, disable Phaser tweens in `GameScene` rather than only shortening CSS animations.

- [ ] **Step 4: Lazy-load mission-only code**

Use `React.lazy` and `Suspense` for Blockly, Python, AI and GameScene modules. Render a text loading status with retry guidance. Keep the home and parent routes free of Blockly, CodeMirror and Phaser static imports. Do not replace real tools with mock UI.

- [ ] **Step 5: Add deterministic build-budget verification**

Configure Vite `build.manifest = true`. Create `scripts/check-bundle-budget.mjs` that:

1. Reads `dist/.vite/manifest.json`.
2. Finds the `src/main.tsx` entry.
3. Recursively follows static `imports`, never `dynamicImports`.
4. Gzips each unique entry-path JS file and sums bytes.
5. Fails when entry gzip exceeds `180 * 1024`.
6. Fails if any Phaser chunk is a static import of the entry.
7. Prints entry gzip bytes and each dynamic mission chunk.

Add:

```json
"verify:bundle": "npm run build && node scripts/check-bundle-budget.mjs"
```

- [ ] **Step 6: Verify responsive shell and budgets**

```bash
npm test -- src/responsive.test.tsx src/App.test.tsx
npm run typecheck
npm run verify:bundle
npm test
```

Expected: all exit 0; output proves entry gzip ≤ 180 KB and Phaser is dynamic.

- [ ] **Step 7: Commit Task 5**

```bash
git add src/App.tsx src/styles.css src/components/GameScene.tsx index.html vite.config.mjs package.json scripts/check-bundle-budget.mjs src/responsive.test.tsx
git commit -m "feat: add responsive performance-budgeted shell"
```

### Task 6: Add Repeatable Multi-Browser Acceptance Evidence

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.ts`
- Create: `e2e/commercial-foundation.spec.ts`
- Create: `docs/verification/commercial-foundation.md`

- [ ] **Step 1: Install the browser test dependency**

Run:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium firefox webkit
```

Expected: package files contain `@playwright/test`; required browser binaries install successfully.

- [ ] **Step 2: Create Playwright projects and a failing smoke path**

Configure a local Vite web server and these projects:

```ts
projects: [
  { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 } } },
  { name: 'tablet-webkit', use: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'mobile-chromium', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 1024 } } },
]
```

Set `baseURL` to the Vite repository base and add `test:e2e` to package scripts.

Start with a test that asserts no page-level horizontal overflow at all three viewport widths. Run it before responsive implementation is accepted; it must fail against the baseline CSS and pass after Task 5.

- [ ] **Step 3: Implement the complete acceptance paths**

In `commercial-foundation.spec.ts`, cover:

- Home → first mission → wrong sequence feedback → correct completion → reload → completion remains.
- Parent PIN → export → import valid V1 → visible migrated V2 result.
- Inject broken current plus valid snapshot → reload → recovery notice → parent page → corrupt source download control.
- Malformed import → explicit error → existing mission completion unchanged.
- Keyboard-only home, mission, hint, parent PIN and clear-confirmation cancel path.
- Reduced-motion system emulation, explicit user override, reload persistence.
- Mobile path through home, first mission, failure, success and return with `scrollWidth <= clientWidth`.
- Console error collection and failed network response collection; fail on unexpected entries.

Use actual visible controls. Do not write progress directly except in the dedicated corruption setup that tests recovery.

- [ ] **Step 4: Run all browser projects**

```bash
npm run test:e2e
```

Expected: all acceptance tests pass in desktop Chromium, tablet WebKit, mobile Chromium and desktop Firefox.

- [ ] **Step 5: Record verification evidence**

Write `docs/verification/commercial-foundation.md` with:

- Commit SHA and date.
- Unit, typecheck, build and bundle-budget command results.
- Browser project names, viewports and passed scenario counts.
- Measured entry gzip and dynamic Phaser/editor chunks.
- Confirmation of `zh-CN`, keyboard path, reduced motion, mute, corruption recovery, import atomicity, console and 404 checks.
- Residual risks: local storage can be deliberately cleared; low-end physical-device performance still needs release-device sampling.
- Completion statement: only `Parent / saves` and the implemented portion of `UI / release` reach `System loop complete`; whole site remains `not complete`.

- [ ] **Step 6: Run final fresh verification**

```bash
git diff --check
npm test
npm run typecheck
npm run verify:bundle
npm run test:e2e
git status --short
```

Expected: all commands exit 0; only planned files are modified before the task commit.

- [ ] **Step 7: Commit Task 6**

```bash
git add package.json package-lock.json playwright.config.ts e2e/commercial-foundation.spec.ts docs/verification/commercial-foundation.md
git commit -m "test: verify commercial foundation in browsers"
```

## Final Completion Audit

After all six tasks and their per-task reviews:

1. Dispatch a fresh final reviewer against this plan and the approved design spec.
2. Confirm all plan checkboxes correspond to executed evidence before marking them complete.
3. Re-run the full fresh verification block from Task 6.
4. Inspect the running app at `390 × 844`, `768 × 1024`, and `1440 × 1024`.
5. Report `System loop complete` only for matrix rows proven by the evidence; report the entire website as `not complete` and name the next blocking subsystem.
6. Do not push without explicit user approval.
