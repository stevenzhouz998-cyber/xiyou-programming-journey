# W3-M2 变化高翠兰双闸门 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `w3-m2 变化高翠兰` 从 legacy `expectedSequence` 升级为一关由可见 Blockly 双闸门、严格 Progress V3 revision 4、火眼金睛观察和五项目真实浏览器证据驱动的 `One-level playable` 任务。

**Architecture:** 新增独立零 UI 合同，把可见 workspace 编译为带 checkpoint、condition 与 branch provenance 的 canonical trace，再由确定性 runner 驱动故事状态。UI 复用 Progress V3 协调保存、CAS、snapshot、导入导出与 lazy boundary 基础设施，但 W3-M2 拥有独立 session parser、completion proof、Blockly workspace、Experience、Scene、E2E source contract 和正式素材门禁。

**Tech Stack:** React 19、TypeScript 5.9、Blockly 13、Phaser 3、Vitest 4、Testing Library、Playwright 1.55、Vite 6、Node test、Sharp、WebP。

---

## 执行边界

- 所有命令明确使用 `/Users/macmini-zz/.codex/worktrees/3abe/少儿编程学习网页` 为 workdir。
- 不修改 `/Users/macmini-zz/Documents/少儿编程学习网页`，不新建或切换 worktree，不执行 reset/clean。
- 用户禁止 commit、push、PR 和 deploy；本计划省略 writing-plans 默认的逐任务 commit，只保留可审计的测试检查点。
- 开始实现前重查分支 `codex/week-two-formal`、HEAD `4503b97a8b00ad4b12107c323a88dd6dbb142d02` 与现场差异；只允许已批准设计规格和本计划先存在。
- W3-M3～W3-M5 保持 legacy；任何专项门禁缺失时 W3-M2 为 `not complete`。

## 文件结构

**新增合同与编译**

- `src/blockly/weekThreeCuilanBooleanContract.ts`：块类型、workspace、trace、runner、失败快照与默认图。
- `src/blockly/weekThreeCuilanBooleanContract.test.ts`：图验证、状态机、伪造拒绝和零惩罚。
- `src/blockly/weekThreeCuilanBooleanBlocks.ts`：Blockly block registration 和儿童标签。
- `src/blockly/weekThreeCuilanBooleanCompiler.ts`：从真实 Blockly workspace 序列化、编译、反序列化。
- `src/blockly/weekThreeCuilanBooleanCompiler.test.ts`：真实 Blockly 连接、删除、跨容器和恢复测试。

**新增进度与 UI**

- `src/progress/cuilanBooleanSessionSchema.ts`：W3-M2 session 与观察历史严格解析。
- `src/progress/weekThreeCuilanBooleanSession.test.ts`：revision 4、session、完成证明、恢复和家长证据。
- `src/components/WeekThreeCuilanBooleanBlocklyWorkspace.tsx` 及测试：唯一可见图和鼠标/键盘修复。
- `src/components/WeekThreeCuilanBooleanExperience.tsx`、CSS 及测试：四类写入、播放、火眼金睛和恢复。
- `src/components/WeekThreeCuilanBooleanScene.tsx` 及测试：正式素材状态播放与资源恢复。
- `src/components/WeekThreeCuilanBooleanRoute.test.tsx`：独立 lazy route boundary。

**新增资产、合同和浏览器证据**

- `public/assets/week-three-cuilan/cuilan-disguise-background.webp`。
- `public/assets/week-three-cuilan/cuilan-boolean-states.webp`。
- `scripts/check-week-three-cuilan-e2e-contract.mjs` 及测试。
- `e2e/week-three-cuilan-boolean.spec.ts`。
- `docs/verification/week-three-cuilan-boolean.md`。

**聚焦修改**

- `src/course/formalCourse.ts`、`course.ts`、`courseOutline.ts`、`course.test.ts`。
- `src/progress/types.ts`、`schema.ts`、`schema.test.ts`、`session.ts`、`progress.ts`、`progress.test.ts`、`executableMissionIds.ts` 及测试。
- `src/context/ProgressContext.tsx`。
- `src/components/MissionPageContent.tsx`、`ParentEquipmentReport.tsx` 及测试。
- `e2e/support/storageFaultAdapter.ts`、`playwright.config.ts`、`package.json`。
- `scripts/budget-limits.mjs`、`.d.mts`、bundle/asset verifier 及测试、`docs/assets/asset-manifest.md`。

### Task 1: 建立双闸门零 UI 合同与确定性 runner

**Files:**
- Create: `src/blockly/weekThreeCuilanBooleanContract.test.ts`
- Create: `src/blockly/weekThreeCuilanBooleanContract.ts`

- [ ] **Step 1: 写默认失败、正确 true/then→false/else 和严格伪造拒绝的 RED 测试**

```ts
import { describe, expect, it } from 'vitest';
import {
  compileCuilanBooleanDraft,
  createDefaultCuilanBooleanDraft,
  runCuilanBoolean,
} from './weekThreeCuilanBooleanContract';

describe('W3-M2 双闸门合同', () => {
  it('默认第二闸门错误地读取外形并在 continue-disguise 失败', () => {
    const run = runCuilanBoolean(compileCuilanBooleanDraft(createDefaultCuilanBooleanDraft()));
    expect(run.completed).toBe(false);
    expect(run.failureSnapshot).toMatchObject({
      checkpointId: 'identity-reveal',
      conditionKind: 'appearance-matches-cuilan',
      observedValue: true,
      branch: 'then',
    });
    expect(run.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
  });

  it('第二闸门读取真实身份时走 false/else 并到达 demon-fled', () => {
    const draft = createDefaultCuilanBooleanDraft();
    const condition = draft.blocks.find((block) => block.id === 'cuilan-identity-condition')!;
    condition.type = 'w3_cuilan_condition_identity_is_cuilan';
    const run = runCuilanBoolean(compileCuilanBooleanDraft(draft));
    expect(run.completed).toBe(true);
    expect(run.finalState).toBe('demon-fled');
    expect(run.checkpointResults.map(({ observedValue, actualBranch }) => ({ observedValue, actualBranch })))
      .toEqual([{ observedValue: true, actualBranch: 'then' }, { observedValue: false, actualBranch: 'else' }]);
  });
});
```

- [ ] **Step 2: 运行 RED 并确认失败原因是模块尚不存在**

Run: `npx vitest run src/blockly/weekThreeCuilanBooleanContract.test.ts`

Expected: FAIL，提示无法解析 `weekThreeCuilanBooleanContract`。

- [ ] **Step 3: 实现最小但完整的合同类型、默认图、验证器、编译器和 runner**

```ts
export type CuilanCheckpointId = 'disguise-readiness' | 'identity-reveal';
export type CuilanConditionKind = 'appearance-matches-cuilan' | 'identity-is-cuilan';
export type CuilanBranch = 'then' | 'else';
export type CuilanStoryState =
  | 'cuilan-safe' | 'transformed-as-cuilan' | 'disguise-ready'
  | 'clue-acquired' | 'identity-checked' | 'revealed' | 'demon-fled';

export interface CuilanFailureSnapshot {
  snapshotId: string;
  checkpointId: CuilanCheckpointId;
  conditionSourceBlockId: string;
  conditionKind: CuilanConditionKind;
  conditionLabel: string;
  observedValue: boolean;
  evidenceCode: string;
  evidenceTextKey: string;
  branch: CuilanBranch;
}

export function conditionValue(kind: CuilanConditionKind): boolean {
  return kind === 'appearance-matches-cuilan';
}
```

实现时只允许 `compileCuilanBooleanDraft(validatedDraft)` 生成 instruction；`runCuilanBoolean` 必须验证 instructionId、checkpoint、source/parent、condition、observedValue、evidence 与 branch 的全部互相一致性，再执行状态机。

- [ ] **Step 4: 扩展合同测试覆盖所有非法图和 runtime 失败概念**

测试矩阵必须包含：空图、多根、断线、环、非互惠连接、未知块、孤立块、重复必需块、缺 condition、缺 then/else、空分支、跨容器、错 checkpoint 次序、线索前显形、第一闸门 identity=false、两个分支动作互换、伪造 condition/source/parent/branch/evidence、确定性重放和零惩罚。

- [ ] **Step 5: 运行合同测试到 GREEN**

Run: `npx vitest run src/blockly/weekThreeCuilanBooleanContract.test.ts`

Expected: PASS，默认失败和正确 `false → else` 都由 trace 证明。

### Task 2: 注册真实 Blockly 块并建立 workspace 编译边界

**Files:**
- Create: `src/blockly/weekThreeCuilanBooleanBlocks.ts`
- Create: `src/blockly/weekThreeCuilanBooleanCompiler.ts`
- Create: `src/blockly/weekThreeCuilanBooleanCompiler.test.ts`

- [ ] **Step 1: 写真实 Blockly 连接 RED 测试**

```ts
it('序列化的两个条件来自各自真实 value input', () => {
  const workspace = new Blockly.Workspace();
  registerCuilanBooleanBlocks();
  restoreDefaultCuilanBooleanWorkspace(workspace);
  const draft = serializeCuilanBooleanWorkspace(workspace);
  expect(draft.blocks.find((block) => block.id === 'cuilan-ready-condition')?.type)
    .toBe('w3_cuilan_condition_appearance_matches');
  expect(draft.blocks.find((block) => block.id === 'cuilan-identity-condition')?.type)
    .toBe('w3_cuilan_condition_appearance_matches');
  workspace.dispose();
});
```

- [ ] **Step 2: 运行 RED**

Run: `npx vitest run src/blockly/weekThreeCuilanBooleanCompiler.test.ts`

Expected: FAIL，缺少 block registration/compiler exports。

- [ ] **Step 3: 实现块标签和编译接口**

```ts
export const CUILAN_BOOLEAN_BLOCK_LABELS = {
  w3_cuilan_transform: '变作高翠兰',
  w3_cuilan_if_disguise_ready: '如果伪装已经准备好',
  w3_cuilan_condition_appearance_matches: '外形和高翠兰相同',
  w3_cuilan_condition_identity_is_cuilan: '真实身份是高翠兰',
  w3_cuilan_hold_disguise: '保持伪装，等待妖怪进屋',
  w3_cuilan_adjust_transform: '调整变化',
  w3_cuilan_collect_clue: '从对话得知姓名和云栈洞住处',
  w3_cuilan_if_identity_reveal: '如果真实身份仍是高翠兰',
  w3_cuilan_continue_disguise: '继续装作高翠兰',
  w3_cuilan_reveal_wukong: '显出悟空本相',
} as const;
```

`registerCuilanBooleanBlocks` 使用 statement/value checks 区分主链、条件和 checkpoint branch；`serializeCuilanBooleanWorkspace` 读取真实连接，`restoreCuilanBooleanWorkspace` 恢复稳定 ID 与坐标，`compileCuilanBooleanWorkspace` 只调用纯合同编译器。

- [ ] **Step 4: 增加删除、非法连接、跨容器、重复 ownership 与恢复测试**

测试必须真实调用 Blockly connection API；不允许通过手写 draft 冒充 workspace 覆盖。

- [ ] **Step 5: 运行 compiler 与 contract 测试**

Run: `npx vitest run src/blockly/weekThreeCuilanBooleanCompiler.test.ts src/blockly/weekThreeCuilanBooleanContract.test.ts`

Expected: PASS。

### Task 3: 把课程与路由门禁从 legacy 切到 formal

**Files:**
- Modify: `src/course/formalCourse.ts`
- Modify: `src/course/course.ts`
- Modify: `src/course/courseOutline.ts`
- Modify: `src/course/course.test.ts`
- Modify: `src/progress/executableMissionIds.ts`
- Modify: `src/progress/executableMissionIds.test.ts`
- Modify: `src/components/MissionPageContent.tsx`
- Create: `src/components/WeekThreeCuilanBooleanRoute.test.tsx`

- [ ] **Step 1: 将现有课程断言改成 RED：W3-M2 formal、W3-M3～M5 legacy**

```ts
it('registers w3-m2 as formal without expectedSequence', () => {
  const mission = getMission('w3-m2');
  expect(isFormalMissionOutline(getMissionOutline('w3-m2'))).toBe(true);
  expect(isExecutableMissionId('w3-m2')).toBe(true);
  expect('expectedSequence' in mission!).toBe(false);
  for (const id of ['w3-m3', 'w3-m4', 'w3-m5']) {
    expect(isFormalMissionOutline(getMissionOutline(id))).toBe(false);
    expect(isExecutableMissionId(id)).toBe(false);
  }
});
```

- [ ] **Step 2: 运行课程 RED**

Run: `npx vitest run src/course/course.test.ts src/progress/executableMissionIds.test.ts`

Expected: FAIL，W3-M2 仍含 `expectedSequence` 且不在 executable registry。

- [ ] **Step 3: 新增 formal mission 并移除 legacy 定义**

```ts
formalMission('w3-m2', {
  subtitle: '同一时刻，外形和身份可以一真一假',
  objective: '让两道条件分别判断伪装外形与真实身份',
  canon: formalWeekThreeCanon,
  storyBeats: [
    beat('变化等候', '高翠兰安全离开后，悟空变作她的模样等候妖怪。'),
    beat('取得线索并显形', '妖怪未认出悟空；悟空得知姓名住处后显出本相。'),
  ],
})
```

把 `isFormalMissionOutline` 与 `EXECUTABLE_MISSION_IDS` 增加 `w3-m2`，从 `course.ts` 删除它的 legacy `mission(...)`。

- [ ] **Step 4: 在 MissionPageContent 新增独立 lazy route boundary**

```tsx
const WeekThreeCuilanBooleanExperience = lazy(() => import('./WeekThreeCuilanBooleanExperience'));
export function WeekThreeCuilanBooleanRouteBoundary(props: FormalRouteProps) {
  return <LazySectionBoundary label="变化高翠兰任务"><Suspense fallback={<p role="status">变化高翠兰任务加载中，请稍候……</p>}>
    <WeekThreeCuilanBooleanExperience {...props} />
  </Suspense></LazySectionBoundary>;
}
```

在 `mission.id === 'w3-m2'` 分支渲染该 boundary；legacy fallback 不得再收到 W3-M2。

- [ ] **Step 5: 运行课程与 route 测试到 GREEN**

Run: `npx vitest run src/course/course.test.ts src/progress/executableMissionIds.test.ts src/components/WeekThreeCuilanBooleanRoute.test.tsx`

Expected: PASS。

### Task 4: 升级 Progress V3 revision 4 与严格 W3-M2 session parser

**Files:**
- Create: `src/progress/cuilanBooleanSessionSchema.ts`
- Create: `src/progress/weekThreeCuilanBooleanSession.test.ts`
- Modify: `src/progress/types.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/schema.test.ts`
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`

- [ ] **Step 1: 写 revision 4、迁移、伪造拒绝和完成证明 RED 测试**

```ts
it('migrates revision 3 and preserves legacy w3-m2 without forging formal proof', () => {
  const old = { ...createInitialProgress(), schemaRevision: 3, missions: {
    'w3-m2': { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW },
  }};
  const migrated = migrateProgress(old);
  expect(migrated.schemaRevision).toBe(4);
  expect(migrated.missionCompletionEvidence['w3-m2']).toMatchObject({ kind: 'legacy-preformal' });
  expect(migrated.sessions['w3-m2']).toBeUndefined();
});
```

- [ ] **Step 2: 运行 progress RED**

Run: `npx vitest run src/progress/weekThreeCuilanBooleanSession.test.ts src/progress/schema.test.ts src/progress/progress.test.ts`

Expected: FAIL，revision 4、W3-M2 session/evidence 类型尚不存在。

- [ ] **Step 3: 增加类型和 revision 4 迁移**

```ts
export interface CuilanBooleanMissionSession extends Omit<MissionSessionData<
  CuilanBooleanWorkspaceDraftV1,
  CuilanBooleanInstruction,
  CuilanBooleanRunResult
>, 'conceptFailures'> {
  conceptFailures: {
    programStructure: number;
    conditionSelection: number;
    branchRouting: number;
    sequencePrecondition: number;
    completeness: number;
  };
  checkpointResults: CuilanCheckpointResult[];
  failureSnapshot: CuilanFailureSnapshot | null;
  conditionObservationUses: Array<{ snapshotId: string; usedAt: string; workspace: CuilanBooleanWorkspaceDraftV1 }>;
}
```

`ProgressV3.schemaRevision` 改为 `4`；`MissionSessionById`、`MissionCompletionEvidenceV1` 和 `ExecutableMissionId` 加入 W3-M2。迁移 revision 3 时保留全部数据，并为历史完成生成 `legacy-preformal` 标记。

- [ ] **Step 4: 实现 session parser 与 formal-v3 proof 校验**

parser 精确检查字段、上限、ISO 时间、计数恒等式；lastTrace 必须等于 workspace 重编译结果，lastRun 必须等于 runner 重放结果；每个观察历史 workspace 必须重编译出相同失败 snapshot。formal-v3 proof 必须包含 immutable workspace、trace、run、completedAt、verifiedAt，且 run completed/finalState 为真。

- [ ] **Step 5: 覆盖历史解锁与新玩家解锁边界**

测试证明历史 legacy W3-M2 不被重新锁回 W3-M3，但新玩家只有完成保存后的 formal proof 才解锁 W3-M3；legacy proof 不能显示正式徽标。

- [ ] **Step 6: 运行 progress 测试到 GREEN**

Run: `npx vitest run src/progress/weekThreeCuilanBooleanSession.test.ts src/progress/schema.test.ts src/progress/progress.test.ts`

Expected: PASS。

### Task 5: 扩展 session 操作、ProgressContext 和家长摘要

**Files:**
- Modify: `src/progress/session.ts`
- Modify: `src/context/ProgressContext.tsx`
- Modify: `src/components/ParentEquipmentReport.tsx`
- Modify: `src/components/ParentEquipmentReport.test.tsx`
- Modify: `src/progress/weekThreeCuilanBooleanSession.test.ts`

- [ ] **Step 1: 写草稿清除旧证据、运行计数和观察审计 RED 测试**

```ts
it('records one immutable observation use without changing the graph', () => {
  const failed = recordRun(createMissionSession('w3-m2', NOW), failedRun, failedTrace, NOW);
  const observed = recordConditionObservationUse(failed, failed.failureSnapshot!.snapshotId, LATER);
  expect(observed.conditionObservationUses).toHaveLength(1);
  expect(observed.conditionObservationUses[0]!.workspace).toEqual(failed.workspace);
  expect(observed.workspace).toEqual(failed.workspace);
});
```

- [ ] **Step 2: 运行 session/context RED**

Run: `npx vitest run src/progress/weekThreeCuilanBooleanSession.test.ts src/components/ParentEquipmentReport.test.tsx`

Expected: FAIL，overload 和家长 W3-M2 汇总尚不存在。

- [ ] **Step 3: 增加 create/update/recordRun/recordObservation/getSupport overload**

`createMissionSession('w3-m2', now)` 使用默认错误图；`updateWorkspaceDraft` 清空 lastTrace/lastRun/checkpointResults/failureSnapshot；`recordRun` 维护五类 conceptFailures；`recordConditionObservationUse` 接受 W3-M1 或 W3-M2 且深拷贝对应历史 workspace。

- [ ] **Step 4: 将 ProgressContext 的联合类型和提示记录加入 W3-M2**

```ts
if (missionId === 'w3-m2') {
  return updateMissionSessionAt(
    missionId,
    (session: CuilanBooleanMissionSession) => recordHint(session, tier, now),
    now,
  );
}
```

保持 pending unpublished、completion lock、CAS 和 retry 语义不变。

- [ ] **Step 5: 家长报告仅显示次数、时间和 formal proof**

增加 W3-M2 观察次数及最近时间，并显示“变化高翠兰正式 Blockly 证明已保存”；不得渲染 condition label、block ID、trace 或答案图。

- [ ] **Step 6: 运行 session/context/parent 测试到 GREEN**

Run: `npx vitest run src/progress/weekThreeCuilanBooleanSession.test.ts src/components/ParentEquipmentReport.test.tsx src/context/WeekTwoHorseProgressContext.test.tsx`

Expected: PASS，既有 context 行为不回退。

### Task 6: 实现唯一可见 Blockly workspace

**Files:**
- Create: `src/components/WeekThreeCuilanBooleanBlocklyWorkspace.tsx`
- Create: `src/components/WeekThreeCuilanBooleanBlocklyWorkspace.test.tsx`

- [ ] **Step 1: 写默认两条件、真实删除、修复和并发保存 RED 测试**

```tsx
it('修改第二条件后保存同一真实 workspace', async () => {
  const onDraftChange = vi.fn().mockResolvedValue({ status: 'saved' });
  render(<WeekThreeCuilanBooleanBlocklyWorkspace
    draft={createDefaultCuilanBooleanDraft()} locked={false}
    focusBlockId={null} onFocusHandled={() => undefined}
    onDraftChange={onDraftChange} onRun={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: '第二道条件换成：真实身份是高翠兰' }));
  await waitFor(() => expect(onDraftChange).toHaveBeenCalledOnce());
  expect(onDraftChange.mock.calls[0]![0].blocks)
    .toEqual(expect.arrayContaining([expect.objectContaining({ type: 'w3_cuilan_condition_identity_is_cuilan' })]));
});
```

- [ ] **Step 2: 运行 workspace RED**

Run: `npx vitest run src/components/WeekThreeCuilanBooleanBlocklyWorkspace.test.tsx`

Expected: FAIL，组件不存在。

- [ ] **Step 3: 实现 workspace 生命周期和序列化保存**

组件必须创建/销毁 Blockly workspace，恢复持久 draft，监听结构变化，非法本地图显示“积木连接待修复，修复后会保存”且不污染持久草稿；合法变化按队列串行保存，晚到保存不得覆盖新图。Run 只从当前 workspace 编译。

- [ ] **Step 4: 实现鼠标/触摸/键盘修复与聚焦**

两个可访问控制都操作真实 condition connection；Enter/Space 与点击生成相同 draft。删除 condition/branch 后 Run 提供结构反馈；恢复按钮重新连接真实块。`focusBlockId` 只选中问题块，不修改图。

- [ ] **Step 5: 运行 workspace 与 compiler 测试到 GREEN**

Run: `npx vitest run src/components/WeekThreeCuilanBooleanBlocklyWorkspace.test.tsx src/blockly/weekThreeCuilanBooleanCompiler.test.ts`

Expected: PASS。

### Task 7: 实现 Experience、Scene、四类写入与火眼金睛

**Files:**
- Create: `src/components/WeekThreeCuilanBooleanExperience.tsx`
- Create: `src/components/WeekThreeCuilanBooleanExperience.css`
- Create: `src/components/WeekThreeCuilanBooleanExperience.test.tsx`
- Create: `src/components/WeekThreeCuilanBooleanScene.tsx`
- Create: `src/components/WeekThreeCuilanBooleanScene.test.tsx`
- Modify: `src/components/MissionPageContent.tsx`

- [ ] **Step 1: 写默认失败→观察→修复→成功和四类写故障 RED 测试**

测试必须断言：失败 run 保存前无播放；观察审计保存前不显示事实；完成保存前不弹成功、不解锁；草稿失败保留同一图；火眼金睛显示 label/value/evidence/actual branch，但按钮点击后 workspace 与 trace 不变。

- [ ] **Step 2: 运行 Experience/Scene RED**

Run: `npx vitest run src/components/WeekThreeCuilanBooleanExperience.test.tsx src/components/WeekThreeCuilanBooleanScene.test.tsx`

Expected: FAIL，组件尚不存在。

- [ ] **Step 3: 实现 Experience 操作状态机**

```ts
type Operation = 'idle' | 'draft' | 'run' | 'observation' | 'retry' | 'playback' | 'completing' | 'recovery';
type Recovery = 'none' | 'unsaved' | 'conflict';
const stableAbility = progress.abilities.conditionObservation.acquiredAt !== null
  && progress.abilities.conditionObservation.stableUnlockedAt !== null;
const fireEyeAvailable = stableAbility && persistedSession.failureSnapshot !== null;
```

Run 流程固定为保存 draft → 保存 run → 播放 → 保存 completion。任何步骤失败都设置独立 retry payload；外部 CAS 冲突提供下载本页备份和载入其他标签页版本。

- [ ] **Step 4: 实现观察结果的不泄题文案**

默认失败只显示：`外形和高翠兰相同`、`真`、`变化后的外形已经和高翠兰相同`、`进入继续装作高翠兰分支`。不得出现“换成真实身份”或正确图。

- [ ] **Step 5: 实现 Scene 状态与资源失败恢复**

Scene 只从 runtime events 派生 `transforming/disguised/clue/revealed/fled` 画面；两张 WebP load 完成前 `data-scene-ready=false`，资源错误显示 alert 和带 cache-busting query 的重试。reduced motion/mute 只改变呈现属性。

- [ ] **Step 6: 运行 Experience、Scene、Route 和 W3-M1 邻接测试到 GREEN**

Run: `npx vitest run src/components/WeekThreeCuilanBooleanExperience.test.tsx src/components/WeekThreeCuilanBooleanScene.test.tsx src/components/WeekThreeCuilanBooleanRoute.test.tsx src/components/WeekThreeManorHelpExperience.test.tsx`

Expected: PASS。

### Task 8: 生成正式素材并扩展资产与包体门禁

**Files:**
- Create: `public/assets/week-three-cuilan/cuilan-disguise-background.webp`
- Create: `public/assets/week-three-cuilan/cuilan-boolean-states.webp`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`
- Modify: `scripts/budget-limits.mjs`
- Modify: `scripts/budget-limits.d.mts`
- Modify: `scripts/check-bundle-budget.mjs`
- Modify: `scripts/check-bundle-budget.test.mjs`

- [ ] **Step 1: 先写 W3-M2 资产 exact inventory 和 3 MiB route closure RED 测试**

```js
assert.equal(bundleBudget.WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
assert.deepEqual(requiredCuilanAssets, [
  'assets/week-three-cuilan/cuilan-disguise-background.webp',
  'assets/week-three-cuilan/cuilan-boolean-states.webp',
]);
```

- [ ] **Step 2: 运行资产/预算 RED**

Run: `node --test scripts/check-asset-manifest.test.mjs scripts/check-bundle-budget.test.mjs`

Expected: FAIL，W3-M2 inventory、paths 和 budget 尚不存在。

- [ ] **Step 3: 使用内置 image generation 生成两张儿童安全正式素材**

背景 prompt 必须要求：明亮 3D 儿童绘本、高老庄灯笼后宅或庭院、等待与观察空间、无文字伪字、无卧床、无亲密动作。状态图 prompt 必须要求：悟空变化完成、伪装等候、猪刚鬣在门口被外形迷惑、悟空显形、猪刚鬣逃走；高翠兰本人已安全离开；透明背景、同尺度、无攻击命中画面。

- [ ] **Step 4: 检查原尺寸、alpha edge、尺寸、hash 和体积并写 manifest**

每张不超过 `512 * 1024` bytes，两张合计不超过 `1.25 * 1024 * 1024` bytes；manifest slot 必须精确为 `w3-m2 WeekThreeCuilanBooleanScene`，QA 只有人工原尺寸检查后才能标记 `visual-qa-passed`。

- [ ] **Step 5: 扩展 asset verifier 和 bundle verifier**

允许新目录、要求恰好两张资源、检查 Scene 字面量与 assetUrl 调用、透明状态图 alpha edge；新增 `WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES` 和 Experience closure，禁止入口静态依赖 Blockly/Phaser。

- [ ] **Step 6: 运行资产、build 与预算到 GREEN**

Run: `npm run test:assets && npm run verify:assets && npm run verify:bundle`

Expected: PASS，并打印 W3-M2 2 files 总字节和不超过 3 MiB 的 route closure。

### Task 9: 建立 E2E source contract、测试故障适配器和五项目矩阵

**Files:**
- Create: `scripts/check-week-three-cuilan-e2e-contract.mjs`
- Create: `scripts/check-week-three-cuilan-e2e-contract.test.mjs`
- Create: `e2e/week-three-cuilan-boolean.spec.ts`
- Modify: `e2e/support/storageFaultAdapter.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`

- [ ] **Step 1: 写 E2E source contract RED**

要求 tags：`@w3-m2-full`、`keyboard`、`storage`、`corrupt`、`parent`、`cold`、`asset-fault`、`narrow`、`external`、`lazy`；禁止 legacy、`page.evaluate`/`addInitScript` 直接写 W3-M2 session/mission/evidence，要求每个独立 Page 绑定 raw browser health 并在 afterEach 精确断言空数组。

- [ ] **Step 2: 运行 source contract RED**

Run: `node --test scripts/check-week-three-cuilan-e2e-contract.test.mjs`

Expected: FAIL，E2E source 尚不存在。

- [ ] **Step 3: 扩展 storageFaultAdapter 的四种精确差量规则**

新增 `fail-cuilan-draft`、`fail-cuilan-run`、`fail-cuilan-observation`、`fail-cuilan-completion` 和 `corrupt-cuilan-current`。每条只接受预期字段变化，拒绝生产 bundle 出现 sentinel；completion fault 必须同时阻止 mission 与 formal proof。

- [ ] **Step 4: 编写 24 条五项目儿童可见路径**

desktop 15：完整路径、键盘、四类 storage、motion/mute、external CAS、corrupt、parent/export-import、cold/404、asset fault、Experience/Scene/Workspace 三层 lazy。tablet 2、390 mobile 2、Firefox 3、320 narrow 2：各自 full/cold，Firefox另含 keyboard。修复只能点击或键盘激活真实 workspace 控件，不得直接注入成功状态。

- [ ] **Step 5: 增加三态截图与几何断言**

每项目保存 Blockly/failure/success 三张原始截图；断言 scrollWidth、Scene、Workspace、feedback、Fire Eye 与 replay 区域不重叠。截图留在 ignored test-results。

- [ ] **Step 6: 更新 Playwright grep 与 npm bundle-contract script**

五个 project 分别加入 W3-M2 tags；`test:bundle-script` 加入新 source contract 测试。

- [ ] **Step 7: 运行 source contract 和专项矩阵到 GREEN**

Run: `node --test scripts/check-week-three-cuilan-e2e-contract.test.mjs && npx playwright test e2e/week-three-cuilan-boolean.spec.ts --reporter=line`

Expected: source contract PASS；Playwright **24/24**。

### Task 10: 完成全量门禁、视觉 QA 和诚实验证记录

**Files:**
- Create: `docs/verification/week-three-cuilan-boolean.md`
- Modify only if a current-task defect is found: files already listed above

- [ ] **Step 1: 新鲜运行单元、合同、类型、构建和预算**

Run:

```bash
npm test
npm run typecheck
npm run build
npm run verify:bundle
npm run verify:assets
git diff --check
```

Expected: 所有命令 exit 0；记录实际 file/test/contract/asset 数量和实际预算数字，不沿用旧计数。

- [ ] **Step 2: 新鲜运行 W2/W3 已正式关回归**

Run:

```bash
npx playwright test \
  e2e/week-two-horse-care.spec.ts \
  e2e/week-two-monkey-king-events.spec.ts \
  e2e/week-two-peach-elixir-debug.spec.ts \
  e2e/week-two-furnace-condition.spec.ts \
  e2e/week-two-heavenly-signal-boss.spec.ts \
  e2e/week-three-manor-help-condition.spec.ts \
  e2e/week-three-cuilan-boolean.spec.ts \
  --reporter=line
```

Expected: 原有 130 条加新 W3-M2 项目映射全部通过；如果 Playwright 去重或 grep 改变实际总数，记录真实总数。

- [ ] **Step 3: 运行全站 Playwright 审计**

Run: `npm run test:e2e`

Expected: 记录实际通过/失败/耗时。若旧 shared/W1 24 项仍失败，逐类披露且确认 W3-M2 无失败；不得将专项绿灯写成全站绿灯。

- [ ] **Step 4: 主代理目视检查 15 张原始截图**

逐张确认 1440 Chromium、768 WebKit、390 Chromium、1440 Firefox、320 Chromium 的 Blockly 像素、失败反馈、火眼金睛、成功画面、儿童安全内容和无重叠；发现问题先写失败验收再修复。

- [ ] **Step 5: 写验证文档并审计 completion matrix**

验证文档必须包含：worktree/branch/HEAD、实际命令和 exit code、专项矩阵、全站失败清单、输入→trace→状态→保存证据、能力边界、迁移、资产 hash/尺寸/字节、预算、排除项和下一阻塞。

- [ ] **Step 6: 最终状态检查**

Run: `git status --short --branch && git diff --check && git diff --stat`

Expected: 只有 W3-M2 规格、计划、实现、素材和验证相关变化；无 commit、push、PR、deploy、reset、clean 或新 worktree。

## 计划自检

- 规格中的原著边界、儿童安全、双闸门、false/else 成功、唯一事实源、严格 trace、零惩罚、火眼金睛、revision 4、legacy/formal proof、恢复、正式资产、预算、五项目 24 条矩阵和完成等级均有对应任务。
- 文件名、type 名、checkpoint 名、condition kind、schema revision 和证据 kind 在所有任务中一致。
- 没有把 W3-M3～M5、全站旧失败修复或部署混入实现范围。
- 用户禁止 Git 外发，因此计划以测试检查点替代逐任务 commit；只有用户后续明确授权才可提交或推送。
