# First-Week Equipment And Reward Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user has not authorized commits, pushes, deployment, or changes to the original repository worktree, so commit steps are intentionally omitted.

**Goal:** Turn the first-week Ruyi Staff and regalia into persistent, equipable rewards with real optional effects in w1-m4/w1-m5, remove raw engineering IDs from the child UI, and verify all five missions in one browser matrix.

**Architecture:** Progress V3 advances to schema revision 2 with one canonical reward/equipment state and deterministic revision-1 backfill. Mission completion and item grants share the existing coordinated transaction; equip/unequip is another CAS-protected transaction. A lazy equipment drawer owns loadout changes, while formal mission components receive a read-only equipped-effect view and never edit code on the child's behalf.

**Tech Stack:** React 19, TypeScript, Blockly 13, Progress V3 localStorage/CAS/Web Locks, Vitest, Playwright, Vite.

---

## File map

- Create `src/progress/equipment.ts`: item catalogue, slots, initial state, deterministic grant/equip/unequip functions, and active-effect selectors.
- Modify `src/progress/types.ts`: `RewardEquipmentStateV1`, item/slot types, `ProgressV3.equipment`, schema revision 2.
- Modify `src/progress/schema.ts`: revision-1 migration/backfill and strict revision-2 equipment validation.
- Modify `src/progress/progress.ts`: atomic completion-plus-reward grant and Parent aggregation.
- Modify `src/context/ProgressContext.tsx`: coordinated equip/unequip API with existing save/retry/conflict behavior.
- Create `src/components/EquipmentDrawer.tsx` and `.css`: child-visible inventory/loadout UI using approved raster cells.
- Modify `src/App.tsx`: lazy equipment drawer entry on the growth map.
- Modify `src/components/AdvancedWeekOneExperience.tsx`, `AdvancedWeekOneBlocklyWorkspace.tsx`, `AdvancedWeekOneScene.tsx`: read-only equipment effects.
- Modify `src/components/FourSeasRegaliaExperience.tsx`: replace raw child provenance with labels.
- Modify Parent report components: equipment and effect-use reporting without raw IDs.
- Extend `e2e/underworld-boss-code-battle.spec.ts` and source contracts: unified w1-m1-to-w1-m5 equipment path.
- Update `docs/verification/week-one-underworld-boss.md`: evidence and strict completion boundary.

### Task 1: Canonical equipment state and pure transitions

**Files:**
- Create: `src/progress/equipment.ts`
- Create: `src/progress/equipment.test.ts`
- Modify: `src/progress/types.ts`

- [ ] **Step 1: Write RED tests for exact catalogue, grants, slots, and effect removal**

```ts
expect(grantMissionRewards(initialEquipment(), 'w1-m2', NOW)).toMatchObject({
  inventory: { 'ruyi-staff': { grantedBy: 'w1-m2', grantedAt: NOW } },
})
expect(equipItem(withStaff, 'weapon', 'ruyi-staff').equipped.weapon).toBe('ruyi-staff')
expect(() => equipItem(withStaff, 'head', 'ruyi-staff')).toThrow(/slot/)
expect(unequipItem(equipped, 'weapon').equipped.weapon).toBeNull()
expect(activeEquipmentEffects(unequipped)).not.toContain('weight-reference')
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run src/progress/equipment.test.ts`
Expected: FAIL because the module and types do not exist.

- [ ] **Step 3: Implement the minimal canonical module**

```ts
export const EQUIPMENT_CATALOGUE = {
  'ruyi-staff': { slot: 'weapon', effect: 'weight-reference', grantedBy: 'w1-m2' },
  'phoenix-crown': { slot: 'head', effect: 'decomposition-view', grantedBy: 'w1-m3' },
  'golden-chain-armor': { slot: 'body', effect: 'accepted-prefix-playback', grantedBy: 'w1-m3' },
  'cloud-walking-boots': { slot: 'feet', effect: 'repeat-problem-navigation', grantedBy: 'w1-m3' },
} as const
```

Implement immutable `initialEquipment`, `grantMissionRewards`, `equipItem`, `unequipItem`, and `activeEquipmentEffects`. Duplicate grants retain the first timestamp. Invalid/unowned/wrong-slot operations throw without mutating input.

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run src/progress/equipment.test.ts`
Expected: all equipment tests pass.

### Task 2: Progress V3 schema revision 2 and migration

**Files:**
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/schema.test.ts`
- Modify: `src/progress/types.ts`
- Test: `src/progress/storage.test.ts`, `src/progress/storageParent.test.ts`

- [ ] **Step 1: Add RED fixtures for revision-1 backfill and strict revision-2 parsing**

```ts
const migrated = migrateProgress({ ...validRevision1(), missions: completedThroughM3 })
expect(migrated.schemaRevision).toBe(2)
expect(Object.keys(migrated.equipment.inventory)).toEqual([
  'ruyi-staff', 'phoenix-crown', 'golden-chain-armor', 'cloud-walking-boots',
])
expect(() => migrateProgress(equippedButUnowned)).toThrow(/equipment/)
expect(() => migrateProgress(wrongSlot)).toThrow(/slot/)
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run src/progress/schema.test.ts src/progress/storage.test.ts`
Expected: FAIL on schema revision and missing equipment.

- [ ] **Step 3: Implement deterministic migration and exact validation**

Revision 1 backfills grants from the prerequisite mission's `completedAt`. Revision 2 requires exactly `version`, `inventory`, and `equipped`; inventory keys must be catalogue keys, grant provenance must match the catalogue, and equipped items must be owned and in the correct slot.

- [ ] **Step 4: Run GREEN and migration regression**

Run: `npx vitest run src/progress/schema.test.ts src/progress/storage.test.ts src/progress/storageParent.test.ts`
Expected: all pass.

### Task 3: Atomic completion rewards and coordinated equip writes

**Files:**
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`
- Modify: `src/context/ProgressContext.tsx`
- Modify: `src/context/ProgressContext.test.tsx`

- [ ] **Step 1: Add RED tests for atomic grants, duplicate replay, retry, and CAS**

```ts
const completed = completeMission(progress, 'w1-m3', { stars: 3, hintsUsed: 0 })
expect(completed.equipment.inventory['phoenix-crown']).toBeDefined()
expect(completeMission(completed, 'w1-m3', input).equipment).toEqual(completed.equipment)
```

Context tests must hold the coordinated save promise and assert that neither completion nor reward is published early. Add `updateEquipment(operation)` tests for saved, unsaved retry, and conflict reload.

- [ ] **Step 2: Run RED**

Run: `npx vitest run src/progress/progress.test.ts src/context/ProgressContext.test.tsx`
Expected: FAIL because rewards and the equip API are absent.

- [ ] **Step 3: Implement atomic reward completion and `updateEquipment`**

`completeMission` grants against the same returned Progress V3 document. `ProgressContext.updateEquipment` computes from `workingProgress()`, validates through `migrateProgress`, and commits through the existing queue/CAS path.

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run src/progress/progress.test.ts src/context/ProgressContext.test.tsx`
Expected: all pass with no early publication.

### Task 4: Lazy equipment drawer on the growth map

**Files:**
- Create: `src/components/EquipmentDrawer.tsx`
- Create: `src/components/EquipmentDrawer.css`
- Create: `src/components/EquipmentDrawer.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: asset source-contract tests if the approved sprite references require new React-slot tracing.

- [ ] **Step 1: Write component RED tests**

Test unopened/owned/equipped states, keyboard equip/unequip, pending lock, visible retry, conflict recovery, valid 44px controls, and the absence of currency.

- [ ] **Step 2: Run RED**

Run: `npx vitest run src/components/EquipmentDrawer.test.tsx src/App.test.tsx`
Expected: FAIL because no drawer exists.

- [ ] **Step 3: Implement the lazy drawer**

Use buttons with `aria-pressed`, one slot per item, explicit effect copy, and approved existing `/assets/dragon-palace/weapons.webp` and `/assets/dragon-palace/regalia.webp` through `assetUrl`. CSS may crop approved sprite cells but may not draw replacement art.

- [ ] **Step 4: Run GREEN and asset contracts**

Run: `npx vitest run src/components/EquipmentDrawer.test.tsx src/App.test.tsx && npm run test:assets`
Expected: all pass and assets trace to live slots.

### Task 5: Real optional effects in w1-m4 and w1-m5

**Files:**
- Modify: `src/components/AdvancedWeekOneExperience.tsx`
- Modify: `src/components/AdvancedWeekOneBlocklyWorkspace.tsx`
- Modify: `src/components/AdvancedWeekOneScene.tsx`
- Modify: corresponding component tests.
- Modify: `src/progress/types.ts` if effect-use evidence is persisted in each mission session.

- [ ] **Step 1: Write four independent RED effect tests and four removal tests**

```ts
expect(screen.getByRole('button', { name: '查看重量资料' })).toBeVisible()
expect(onRun).not.toHaveBeenCalled()
rerenderWithUnequippedStaff()
expect(screen.queryByRole('button', { name: '查看重量资料' })).toBeNull()
```

Equivalent tests cover `查看我的任务分组`, `回看已走通步骤`, and `再次定位问题积木`. Every action must leave the workspace snapshot unchanged and never call completion.

- [ ] **Step 2: Run RED**

Run: `npx vitest run src/components/AdvancedWeekOneExperience.test.tsx src/components/AdvancedWeekOneBlocklyWorkspace.test.tsx src/components/AdvancedWeekOneScene.test.tsx`
Expected: FAIL because effect controls are absent.

- [ ] **Step 3: Implement read-only effects**

Read equipped effects from ProgressContext. The decomposition view derives only the child's current graph groups/counts. Accepted-prefix playback uses existing accepted events. Repeat navigation reuses the existing source-block focus callback. Weight reference contains only previously taught factual weights and no selection or recommendation.

- [ ] **Step 4: Run GREEN and source contracts**

Run: the focused component tests plus `npm run test:bundle-script`.
Expected: all pass; help/equipment source contracts reject code-editing side effects.

### Task 6: Remove raw technical provenance from the child UI

**Files:**
- Modify: `src/components/FourSeasRegaliaExperience.tsx`
- Modify: `src/components/FourSeasRegaliaExperience.test.tsx`
- Modify: `src/components/FourSeasRegaliaFeedback.tsx` if needed.
- Modify: source contracts.

- [ ] **Step 1: Write RED assertions against raw IDs**

```ts
expect(screen.queryByText(/parent=/)).toBeNull()
expect(screen.queryByText(session.lastTrace[0].sourceBlockId)).toBeNull()
expect(screen.getByRole('region', { name: '本次执行步骤' })).toHaveTextContent('收下')
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run src/components/FourSeasRegaliaExperience.test.tsx`
Expected: FAIL because raw provenance is rendered.

- [ ] **Step 3: Replace raw provenance with child labels**

Map opcodes through the existing child-facing catalogue. Keep raw provenance only in persisted data and tests; production UI contains no raw block, instruction, or parent IDs.

- [ ] **Step 4: Run GREEN**

Run focused Four Seas tests and bundle/source contracts.

### Task 7: Parent report and exact import-export evidence

**Files:**
- Modify Parent report component and tests.
- Modify `src/progress/progress.ts` report type/test.

- [ ] **Step 1: Write RED report tests**

Assert owned items, four equipped slots, and invoked effects appear; raw IDs do not.

- [ ] **Step 2: Implement report aggregation and presentation**

Use canonical item/effect labels from `equipment.ts`. Do not create a second catalogue.

- [ ] **Step 3: Run report and import-export GREEN tests**

Run Parent component, progress, storage parent, and schema tests.

### Task 8: Unified five-mission browser contract and matrix

**Files:**
- Modify: `e2e/underworld-boss-code-battle.spec.ts`
- Modify: existing w1-m1/w1-m2/w1-m3 E2E helpers if needed.
- Modify: `playwright.config.ts`
- Modify: advanced/Four Seas source-contract scripts and tests.
- Modify: E2E storage fault adapter with exact equipment fault signatures.

- [ ] **Step 1: Write a RED full-week browser path**

Start from initial progress. Complete w1-m1 through w1-m5 with visible controls, assert grants after m2/m3, equip all items, invoke effects in m4/m5, unequip, and assert effect removal. No `evaluate` or init script may write mission/session/equipment state.

- [ ] **Step 2: Add RED storage/CAS/corrupt/Parent equipment scenarios**

Fault only exact equipment deltas. Verify retry, external reload, corrupt-source download, export, visible loadout mutation, and file-input import restore.

- [ ] **Step 3: Run focused desktop RED, implement only discovered product gaps, then GREEN**

Run desktop Chromium first, then keyboard Firefox/Chromium, narrow 390/320, parity, WebKit, and cold gates.

- [ ] **Step 4: List the final honest test partition**

Run: `npx playwright test --list --reporter=list`
Expected: every tag maps to an executed scenario; no unexecuted evidence labels.

### Task 9: Final verification and completion audit

**Files:**
- Modify: `docs/verification/week-one-underworld-boss.md`

- [ ] **Step 1: Run static gates**

```text
npm test
npm run typecheck
npm run verify:assets
npm run verify:bundle
npm audit --registry=https://registry.npmjs.org --audit-level=high
git diff --check
```

- [ ] **Step 2: Run the complete five-project Playwright suite**

Run: `npm run test:e2e`
Expected: zero failures and zero skips.

- [ ] **Step 3: Rebuild and clean final production output**

Run production `verify:bundle`, scan `dist` for all E2E fault sentinels, move exact `dist-e2e` to the system Trash, and confirm it is absent.

- [ ] **Step 4: Audit the completion matrix**

Report `System loop complete` for the equipment/reward row only if every required behavior, persistence/cross-system, and failure/browser cell is evidenced. Report the first week and full site at the exact cumulative level supported; keep every excluded system `not complete`.
