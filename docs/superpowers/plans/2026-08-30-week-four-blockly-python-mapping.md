# W4-M1 积木变代码双轨等价修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 W4-M1 从 legacy sequence 升级为一关由真实 Blockly 参考图与受限 Python Worker 双轨执行、可保存作品并可靠恢复的 Blockly→Python 过渡任务。

**Architecture:** 新增独立 `WeekFourMapping*` 领域合同、Blockly compiler、同步 Python allowlist grammar 和 Worker 内 Python AST 白名单。同步 grammar 负责离线导入与证明防伪，真实 Worker 负责玩家运行；两边都生成同一个 typed semantic trace，并与 Blockly trace 逐卡比较。Progress V3 升级 revision 8，session、作品、正式证明、历史迁移、家长摘要与 W4-M2 解锁全部绑定当前保存输入。

**Tech Stack:** React 19、TypeScript 5.9、Blockly 13、CodeMirror 6、Pyodide Worker、Vitest、Testing Library、Vite、Playwright、Node test runner、Sharp、OpenAI 内建 image generation。

---

## 执行与授权总门禁

- 预期 worktree：`/Users/macmini-zz/.codex/worktrees/dac2/少儿编程学习网页`。
- 预期起点：branch `codex/w3-m5-week-three-boss`，HEAD `42dbf2e4a312d05519d96688246871bec9e9392a` 或其明确后继，upstream ahead/behind `0/0`。
- 当前已知未提交改动只能是本规格与本计划。发现未知生产改动、分支漂移或不干净来源不明时立即停止。
- `node_modules` 当前存在；`package-lock.json` 预期 SHA-256 为 `09b9f5d14de00bcce672a3475f4cc0b38412ceaedc67815811a76df0b82defcc`。依赖缺失时不得自行安装，必须重新取得授权。
- 本计划不需要增加 npm 依赖；Python 同步验证使用项目内小型 exact allowlist grammar，不能把 CodeMirror Python parser 拉进主入口。
- 用户已明确批准将 Pyodide `314.0.2` core 自托管到 `public/runtime/pyodide-314.0.2/`；只允许固定官方文件、MPL-2.0 `LICENSE` 和 `SOURCE.md`，核心五文件为 13,544,397 bytes（独立上限 15 MiB）。`SOURCE.md` 必须记录每个固定 jsDelivr URL、官方 tag/source URL、下载日期与“未修改”声明；Worker 必须从自己的 assets URL 相对解析 `../runtime/pyodide-314.0.2/`，保留 Vite base path，禁止 CDN、https runtime URL、latest/dev。
- 当前禁止 commit、push、PR、merge、deploy、安装、删除、覆盖、重置或清理。本计划每个任务只列候选提交消息；只有未来取得明确授权后才能执行提交。
- `$model-squad` 未激活；除非用户在执行回合再次明确调用，否则不得启用。
- 实施最高声明为 W4-M1 `One-level playable`。W4-M2～M5、第四周 `System loop complete`、30 关、全站、商业完成和部署继续为 `not complete`。

## 文件职责

### 新建

- `src/blockly/weekFourMappingContract.ts`：公开卡、共享语义 trace、差异快照、等价比较、零惩罚与最终状态。
- `src/blockly/weekFourMappingContract.test.ts`：默认差异、修正成功、双卡顺序、防伪与确定性。
- `src/blockly/weekFourMappingBlocks.ts`：W4-M1 五个专用 Blockly 块定义和儿童标签。
- `src/blockly/weekFourMappingCompiler.ts`：真实 workspace 序列化、恢复、结构校验和 typed trace 编译。
- `src/blockly/weekFourMappingCompiler.test.ts`：断线、多根、未知块、ownership、坐标、恢复和真实来源定位。
- `src/engine/weekFourPythonMappingGrammar.ts`：同步 exact allowlist grammar、source span 和 canonical Python trace 派生。
- `src/engine/weekFourPythonMappingGrammar.test.ts`：固定四行语法、两个字段、恶意输入拒绝与双卡语义。
- `src/engine/weekFourPythonMappingRunner.ts`：预热、request ID、20 秒 cold/1 秒 warm 超时、取消、结构化 Worker 协议和迟到消息隔离。
- `src/engine/weekFourPythonMappingRunner.test.ts`：FakeWorker 的 ready/result/load/error/timeout/cancel/late-message 合同。
- `src/workers/weekFourPythonMapping.worker.ts`：Pyodide 加载、Python `ast` 白名单、空 builtins 隔离和真实双卡执行。
- `src/progress/weekFourMappingSession.ts`：W4-M1 session 创建、草稿、run、观察、提示和失败计数更新。
- `src/progress/weekFourMappingSessionSchema.ts`：session、work 与 evidence exact-key parser，以及同步重编译/重派生校验。
- `src/progress/weekFourMappingSession.test.ts`：revision 8、作品、正式证明、历史升级、保存顺序和伪造拒绝。
- `src/components/WeekFourMappingBlocklyWorkspace.tsx`：只读但真实执行的 Blockly 参考图、恢复和失败聚焦。
- `src/components/WeekFourMappingBlocklyWorkspace.test.tsx`：真实块、编译来源、键盘聚焦、损坏恢复。
- `src/components/WeekFourMappingPythonEditor.tsx`：真实 CodeMirror 文本与仅字段可编辑的 accessible selector。
- `src/components/WeekFourMappingPythonEditor.test.tsx`：appearance/identity、鼠标/键盘、同一文本、source span 和锁定范围。
- `src/components/WeekFourMappingScene.tsx`：白虎岭公开卡和三态演出，只消费保存事件。
- `src/components/WeekFourMappingScene.test.tsx`：资源、两卡、mute、reduced motion、回放和迟到回调。
- `src/components/WeekFourMappingExperience.tsx`：draft/run/observation/work/completion 保存优先状态机与局部重试。
- `src/components/WeekFourMappingExperience.test.tsx`：完整孩子循环、五类保存失败、过期 Worker、作品和完成门禁。
- `src/components/WeekFourMappingExperience.css`：桌面双轨、窄屏纵向、焦点、状态和无横向溢出。
- `src/components/WeekFourMappingRoute.test.tsx`：专用 lazy route、错误隔离和局部重试。
- `scripts/check-week-four-mapping-e2e-contract.mjs`：E2E AST 防注入、W3-M5 formal 前置指纹、健康证据和标签门禁。
- `scripts/check-week-four-mapping-e2e-contract.test.mjs`：source-contract 正反例。
- `e2e/week-four-blockly-python-mapping.spec.ts`：五项目完整路径、安全、存储、作品、迁移、性能和故障证据。
- `public/assets/week-four-mapping/white-tiger-ridge-background.webp`：正式白虎岭入口背景。
- `public/assets/week-four-mapping/mapping-states.webp`：等待、差异、一致三态正式图。
- `docs/verification/week-four-blockly-python-mapping.md`：最终证据、completion matrix、排除项和残余风险。

### 修改

- `src/course/formalCourse.ts`、`src/course/course.ts`、`src/course/courseOutline.ts`、`src/course/course.test.ts`：W4-M1 正式注册、移除 legacy sequence/output。
- `src/progress/executableMissionIds.ts`、`src/progress/executableMissionIds.test.ts`：加入 W4-M1。
- `src/progress/types.ts`：revision 8 session、works、W4 evidence 类型。
- `src/progress/session.ts`、`src/progress/session.test.ts`：把 W4-M1 overload 路由到独立 session 模块，保留公共 hint/support API。
- `src/progress/schema.ts`、`src/progress/schema.test.ts`：revision 1～7 到 8、旧 W4-M1 marker、works/evidence/session exact parsing。
- `src/progress/progress.ts`、`src/progress/progress.test.ts`：formal completion、作品原子写入、历史升级、W4-M2 解锁和周报。
- `src/context/ProgressContext.tsx`、`src/context/ProgressContext.test.tsx`：W4 session update overload、五类持久化入口和作品/完成原子提交。
- `src/progress/storageFaultAdapter.ts`、`src/progress/storageFaultAdapter.test.ts`、`e2e/support/storageFaultAdapter.ts`：W4 draft/run/observation/work/completion 精确故障模式。
- `src/components/MissionPageContent.tsx`、`src/components/MissionPageContent.css`：专用 lazy route 和局部错误边界。
- `src/components/ParentEquipmentReport.tsx`、`src/components/ParentEquipmentReport.test.tsx`：W4 摘要与只读作品入口，不泄题。
- `scripts/check-bundle-budget.mjs`、`scripts/check-bundle-budget.test.mjs`：3 MiB W4 lazy closure、15 MiB runtime inventory 与既有预算隔离。
- `scripts/check-asset-manifest.mjs`、`scripts/check-asset-manifest.test.mjs`、`docs/assets/asset-manifest.md`：W4 exact inventory、prompt、hash、尺寸、slot 和 visual QA。
- `package.json`：把 W4 E2E source-contract test 纳入 `test:bundle-script`。

### 不修改

- W1～W3 的领域合同、compiler、Experience 与 Scene 生产行为。
- legacy `PythonEditor.tsx`、`pythonRunner.ts` 和 `python.worker.ts` 的 W4-M2～W5 兼容路径；W4-M1 使用独立 runner/worker，避免在未设计后续关卡前改变 legacy 行为。
- W4-M2～M5 的 legacy 配置与路由。
- 首页、共享入口、Phaser 和既有预算上限。
- 主工作树和部署配置。

### Task 0: 现场、依赖与授权复核

**Files:**
- Read: `AGENTS.md`
- Read: `.agents/skills/xiyou-karpathy/SKILL.md`
- Read: `.agents/skills/xiyou-karpathy/references/completion-matrix.md`
- Read: `.agents/skills/xiyou-karpathy/references/asset-provenance.md`
- Read: `docs/superpowers/specs/2026-08-30-week-four-blockly-python-mapping-design.md`

- [ ] **Step 1: 重验 Git 身份与已知改动**

Run:

```bash
pwd
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short --branch
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'
git rev-list --left-right --count '@{upstream}...HEAD'
git worktree list --porcelain
```

Expected: top-level 为 `.../dac2/少儿编程学习网页`；branch/HEAD/upstream 与门禁一致；只出现本规格与本计划。未知改动立即停止。

- [ ] **Step 2: 重验依赖但不安装**

Run:

```bash
test -d node_modules && echo node_modules=present || echo node_modules=missing
shasum -a 256 package-lock.json
node --version
npm --version
```

Expected: `node_modules=present`，lockfile hash 精确为门禁值。缺失或漂移时停止，不运行安装或覆盖。

- [ ] **Step 3: 记录声明与权限边界**

在执行更新中明确：目标最高 W4-M1 `One-level playable`；未获授权不得 commit/push/deploy；W4-M2～M5 和所有周级/全站/商业声明保持 `not complete`。

- [ ] **Step 4: 候选提交检查点**

当前不执行 git 写操作。若未来单独授权，先由主代理复核完整 diff、测试证据和 `git diff --check`，再决定候选提交。

### Task 1: 课程、预算、资产和 E2E source contract RED

**Files:**
- Modify: `src/course/course.test.ts`
- Modify: `src/progress/executableMissionIds.test.ts`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`
- Create: `scripts/check-week-four-mapping-e2e-contract.mjs`
- Create: `scripts/check-week-four-mapping-e2e-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: 写 formal/executable RED**

在 `src/course/course.test.ts` 增加：

```ts
it('registers w4-m1 as formal Blockly-to-Python mapping without legacy answers', () => {
  const mission = getMission('w4-m1');
  expect(mission).toBeDefined();
  expect(isFormalMissionOutline(getMissionOutline('w4-m1'))).toBe(true);
  expect(isExecutableMissionId('w4-m1')).toBe(true);
  expect(mission?.mode).toBe('blockly');
  expect(mission?.canon.chapters).toEqual([27]);
  expect(mission).not.toHaveProperty('expectedSequence');
  expect(mission).not.toHaveProperty('expectedOutput');
  expect(mission).not.toHaveProperty('starterCode');
  for (const id of ['w4-m2', 'w4-m3', 'w4-m4', 'w4-m5']) {
    expect(isFormalMissionOutline(getMissionOutline(id))).toBe(false);
    expect(isExecutableMissionId(id)).toBe(false);
  }
});
```

在 `src/progress/executableMissionIds.test.ts` 断言 W4-M1 是唯一第四周 executable ID。

- [ ] **Step 2: 写预算与资产 RED**

在 bundle test 要求：

```js
const W4_MAPPING_COLD_LOAD_MAX_BYTES = 3 * 1024 * 1024;
assert.equal(COLD_LOAD_ROOTS['src/components/WeekFourMappingExperience.tsx'], W4_MAPPING_COLD_LOAD_MAX_BYTES);
assert.equal(PYTHON_RUNTIME_TRANSFER_MAX_BYTES, 15 * 1024 * 1024);
```

在 asset test 要求 exact inventory：

```js
[
  'assets/week-four-mapping/white-tiger-ridge-background.webp',
  'assets/week-four-mapping/mapping-states.webp',
]
```

并锁定每张 ≤ `512 * 1024` bytes、合计 ≤ `1.25 * 1024 * 1024` bytes、slot 为 `w4-m1 WeekFourMappingScene`。

- [ ] **Step 3: 写 E2E source contract RED**

新脚本导出：

```js
export const W4_M1_TAGS = [
  '@w4-m1-full', '@w4-m1-keyboard', '@w4-m1-mouse', '@w4-m1-touch',
  '@w4-m1-storage', '@w4-m1-corrupt', '@w4-m1-parent', '@w4-m1-work',
  '@w4-m1-python-security', '@w4-m1-cold', '@w4-m1-asset-fault',
  '@w4-m1-narrow', '@w4-m1-external', '@w4-m1-lazy',
];
const forbidden = /expectedSequence|expectedOutput|LegacyMissionBuilder|MissionTools|page\.evaluate\([^)]*completeMission|new Function|\beval\s*\(/;
export function assertWeekFourMappingE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w4-m1 source contract: source must be text.');
  for (const tag of W4_M1_TAGS) if (!source.includes(tag)) throw new Error(`w4-m1 source contract: missing ${tag}.`);
  if (forbidden.test(source)) throw new Error('w4-m1 source contract: legacy or hidden completion shortcut is forbidden.');
  const file = ts.createSourceFile('w4m1.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length > 0) throw new Error('w4-m1 source contract: source must parse.');
  assertFormalW3M5Prerequisite(file);
  assertNoW4SuccessInjection(file);
  assertHealthCollectionIsImmutable(file);
  assertSecurityProbeCannotWriteProgress(file);
}
```

正反例必须拒绝：直接写 W4 mission/session/evidence/work、动态 storage key、清空 health 数组、可变原型、非内联 browser callback、绕过 CodeMirror 的成功路径；只允许固定 SHA-256 的 W3-M5 formal prerequisite helper 和只读 Python 安全 probe。

- [ ] **Step 4: 纳入 bundle script**

在 `test:bundle-script` 末尾加入：

```json
"scripts/check-week-four-mapping-e2e-contract.test.mjs"
```

- [ ] **Step 5: 运行 RED**

Run:

```bash
npm run test:unit -- src/course/course.test.ts src/progress/executableMissionIds.test.ts
npm run test:bundle-script
npm run test:assets
```

Expected: 因 W4-M1 尚未 formal、预算根/素材/E2E 不存在而失败；失败必须对应预期缺口。

- [ ] **Step 6: 候选提交检查点**

当前不 commit。若获授权，候选消息：`test: lock W4-M1 formal mapping contracts`。

### Task 2: 共享语义合同与双轨等价 RED→GREEN

**Files:**
- Create: `src/blockly/weekFourMappingContract.ts`
- Create: `src/blockly/weekFourMappingContract.test.ts`

- [ ] **Step 1: 写默认差异和修正成功 RED**

```ts
import { compareWeekFourMappingTraces, WEEK_FOUR_MAPPING_CARDS } from './weekFourMappingContract';

it('stops at the first visible semantic mismatch with zero penalty', () => {
  const blockly = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
  const python = traceForField('appearance', { kind: 'python', line: 1, from: 3, to: 13 });
  expect(compareWeekFourMappingTraces(blockly, python)).toMatchObject({
    completed: false,
    finalState: 'mapping-ready',
    failureSnapshot: { cardId: 'canon-mysterious-visitor', blocklyField: 'identity', pythonField: 'appearance' },
    penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
  });
});

it('requires both public cards to match before mapping-proven', () => {
  const blockly = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
  const python = traceForField('identity', { kind: 'python', line: 1, from: 3, to: 11 });
  expect(compareWeekFourMappingTraces(blockly, python)).toMatchObject({
    completed: true,
    finalState: 'mapping-proven',
    cardResults: [
      { cardId: 'canon-mysterious-visitor', branchAction: 'continue-verification' },
      { cardId: 'practice-mountain-traveller', branchAction: 'polite-pass' },
    ],
    failureSnapshot: null,
  });
});
```

- [ ] **Step 2: 实现完整共享类型与公开卡**

`weekFourMappingContract.ts` 必须导出：

```ts
export type WeekFourMappingField = 'appearance' | 'identity';
export type WeekFourMappingAction = 'continue-verification' | 'polite-pass';
export type WeekFourMappingState = 'mapping-ready' | 'mapping-proven';
export interface WeekFourMappingCard {
  id: 'canon-mysterious-visitor' | 'practice-mountain-traveller';
  kind: 'canon-intro' | 'practice';
  appearance: '陌生来客' | '山中樵夫';
  identity: '白骨精' | '普通人';
}
export interface WeekFourMappingTraceItem {
  cardId: WeekFourMappingCard['id'];
  field: WeekFourMappingField;
  value: string;
  conditionResult: boolean;
  branchAction: WeekFourMappingAction;
  finalSceneState: 'verification-continued' | 'traveller-cleared';
  source: { kind: 'blockly'; blockId: string } | { kind: 'python'; line: 1; from: number; to: number };
}
export interface WeekFourMappingRunResult {
  completed: boolean;
  finalState: WeekFourMappingState;
  cardResults: WeekFourMappingTraceItem[];
  failureSnapshot: WeekFourMappingFailureSnapshot | null;
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}
export const WEEK_FOUR_MAPPING_CARDS: readonly WeekFourMappingCard[] = [
  { id: 'canon-mysterious-visitor', kind: 'canon-intro', appearance: '陌生来客', identity: '白骨精' },
  { id: 'practice-mountain-traveller', kind: 'practice', appearance: '山中樵夫', identity: '普通人' },
] as const;
```

实现并导出 `traceForField(field, source)` 和 `compareWeekFourMappingTraces(blockly, python)`：固定卡顺序、exact card IDs、首个逐字段差异、稳定 snapshot ID、完整成功态和零惩罚。

- [ ] **Step 3: 增加防伪与确定性测试**

测试必须拒绝缺卡、调换卡、重复卡、错误字段值、伪造 branch、错误 scene state、非零惩罚和不同 source；相同输入重复运行深相等。

- [ ] **Step 4: 运行 GREEN**

Run:

```bash
npm run test:unit -- src/blockly/weekFourMappingContract.test.ts
```

Expected: PASS；默认只在第一张卡失败，修正后精确两卡成功。

- [ ] **Step 5: 候选提交检查点**

当前不 commit。候选消息：`feat: add W4-M1 semantic mapping contract`。

### Task 3: 真实 Blockly 参考图与 compiler RED→GREEN

**Files:**
- Create: `src/blockly/weekFourMappingBlocks.ts`
- Create: `src/blockly/weekFourMappingCompiler.ts`
- Create: `src/blockly/weekFourMappingCompiler.test.ts`

- [ ] **Step 1: 写真实图与结构错误 RED**

```ts
it('serializes and compiles the visible identity condition with stable sources', () => {
  const workspace = new Blockly.Workspace();
  restoreWeekFourMappingWorkspace(workspace, createDefaultWeekFourMappingDraft());
  expect(compileWeekFourMappingWorkspace(workspace)).toEqual(compileWeekFourMappingDraft(createDefaultWeekFourMappingDraft()));
  expect(compileWeekFourMappingWorkspace(workspace).trace.every((item) => item.source.kind === 'blockly')).toBe(true);
});

it.each(['empty', 'multiple-roots', 'missing-condition', 'missing-then', 'missing-else', 'unknown-block', 'non-reciprocal', 'wrong-parent', 'cycle'])('%s cannot compile', (fixture) => {
  expect(() => compileWeekFourMappingDraft(invalidDraft(fixture))).toThrow();
});
```

- [ ] **Step 2: 定义五个专用块**

```ts
export const WEEK_FOUR_MAPPING_BLOCK_TYPES = {
  root: 'w4_mapping_when_visitor',
  ifIdentity: 'w4_mapping_if_identity',
  identityIsDemon: 'w4_mapping_identity_is_baigujing',
  continueVerification: 'w4_mapping_continue_verification',
  politePass: 'w4_mapping_polite_pass',
} as const;
```

标签精确为“遇到山中来客”“如果”“真实身份是白骨精”“继续核验”“礼貌放行”。块定义只建立语义与连接形状，不包含答案数组或成功回调。

- [ ] **Step 3: 实现 versioned draft 与 compiler**

`WeekFourMappingWorkspaceDraftV1` 固定 `version: 1`、`missionId: 'w4-m1'`，每块保存 `id/type/x/y/parentBlockId/previousId/nextId`，if 块额外保存 `conditionId/thenFirstId/elseFirstId`。默认稳定 IDs：`mapping-root`、`mapping-if`、`mapping-condition`、`mapping-then`、`mapping-else`。

编译顺序必须来自真实连接；坐标 clamp 到既有限制但不参与语义。导出 `createDefaultWeekFourMappingDraft`、`serializeWeekFourMappingWorkspace`、`restoreWeekFourMappingWorkspace`、`compileWeekFourMappingDraft`、`compileWeekFourMappingWorkspace`、`focusableBlockIdForMappingFailure`。

- [ ] **Step 4: 运行 GREEN 与现有 Blockly 回归**

Run:

```bash
npm run test:unit -- src/blockly/weekFourMappingCompiler.test.ts src/blockly/weekThreeBossCompiler.test.ts src/blockly/weekThreeBossContract.test.ts
```

Expected: PASS；W3 编译器无回归。

- [ ] **Step 5: 候选提交检查点**

当前不 commit。候选消息：`feat: add W4-M1 Blockly reference compiler`。

### Task 4: 同步 Python grammar、Worker AST 和 runner RED→GREEN

**Files:**
- Create: `src/engine/weekFourPythonMappingGrammar.ts`
- Create: `src/engine/weekFourPythonMappingGrammar.test.ts`
- Create: `src/engine/weekFourPythonMappingRunner.ts`
- Create: `src/engine/weekFourPythonMappingRunner.test.ts`
- Create: `src/workers/weekFourPythonMapping.worker.ts`

- [ ] **Step 1: 写 exact grammar RED**

```ts
const appearance = 'if appearance == "白骨精":\n    continue_verification()\nelse:\n    polite_pass()';
const identity = appearance.replace('appearance', 'identity');

it('derives the editable source span and canonical trace from the exact four-line grammar', () => {
  expect(parseWeekFourMappingPython(appearance)).toMatchObject({ field: 'appearance', sourceSpan: { line: 1, from: 3, to: 13 } });
  expect(parseWeekFourMappingPython(identity).trace.map((item) => item.branchAction)).toEqual(['continue-verification', 'polite-pass']);
});

it.each(['import os', 'open("x")', 'from js import fetch', 'identity.__class__', 'while True:\n pass', 'print("白骨精")', appearance + '\npolite_pass()'])('rejects %s', (code) => {
  expect(() => parseWeekFourMappingPython(code)).toThrow();
});
```

- [ ] **Step 2: 实现小型同步 allowlist grammar**

导出：

```ts
export const DEFAULT_WEEK_FOUR_MAPPING_PYTHON = 'if appearance == "白骨精":\n    continue_verification()\nelse:\n    polite_pass()';
export const SOLVED_WEEK_FOUR_MAPPING_PYTHON = DEFAULT_WEEK_FOUR_MAPPING_PYTHON.replace('appearance', 'identity');
export function parseWeekFourMappingPython(code: string): {
  field: WeekFourMappingField;
  sourceSpan: { line: 1; from: number; to: number };
  trace: WeekFourMappingTraceItem[];
};
```

实现必须规范 CRLF→LF 后要求精确四行、精确缩进、精确常量与调用，只允许首行 field token 为 `appearance | identity`。它是正向 allowlist grammar，不扫描关键词黑名单；trace 由真实 field 和公开卡派生。

- [ ] **Step 3: 写 Worker/runner RED**

FakeWorker 测试覆盖：预热 ready、load-error、request ID、结构化两卡结果、20 秒 cold timeout、1 秒 warm timeout、cancel 终止、dispose、迟到 result 忽略、并发运行拒绝。期望接口：

```ts
const runtime = createWeekFourPythonRuntime({ coldTimeoutMs: 20_000, warmTimeoutMs: 1_000 });
await runtime.ready();
const result = await runtime.run(SOLVED_WEEK_FOUR_MAPPING_PYTHON, WEEK_FOUR_MAPPING_CARDS);
expect(result.trace).toHaveLength(2);
runtime.cancel();
runtime.dispose();
```

- [ ] **Step 4: 实现 Worker 内 Python AST 白名单**

Worker 使用固定 trusted harness，不把 child code 插值进 harness：

```python
def validate_and_run(candidate_code, appearance, identity):
    tree = ast.parse(candidate_code, mode="exec")
    # exact Module -> If -> Compare(Name, Eq, Constant) -> two zero-arg calls
    # accepted names: appearance, identity, continue_verification, polite_pass
    actions = []
    def continue_verification(): actions.append("continue-verification")
    def polite_pass(): actions.append("polite-pass")
    safe_globals = {
        "__builtins__": {},
        "appearance": appearance,
        "identity": identity,
        "continue_verification": continue_verification,
        "polite_pass": polite_pass,
    }
    exec(compile(tree, "<w4-m1>", "exec"), safe_globals, safe_globals)
    if len(actions) != 1:
        raise ValueError("每张卡必须只执行一个分支动作")
    return actions[0]
```

AST walker 对任何未列节点立即拒绝；结果包含实际 field、value、conditionResult、action 和 scene state。Worker 先独立验证 code，再逐卡用新 `safe_globals` 执行；不得暴露 `js`、Pyodide、文件系统或 browser 对象。

- [ ] **Step 5: 实现可复用 runtime**

`weekFourPythonMappingRunner.ts` 使用专用 module Worker，mount 时预热，维护单一 active request。每个 message 校验 request ID；timeout/cancel/dispose 必须 terminate 并把 runtime 标记为需重建。Worker trace 返回后，再与同步 grammar 的 field/source span 逐项比较；任何不一致返回 `worker-contract-mismatch`，不能完成。

- [ ] **Step 6: 运行 GREEN**

Run:

```bash
npm run test:unit -- src/engine/weekFourPythonMappingGrammar.test.ts src/engine/weekFourPythonMappingRunner.test.ts src/engine/pythonRunner.test.ts src/engine/validation.test.ts
```

Expected: PASS；legacy runner tests 保持通过。

- [ ] **Step 7: 候选提交检查点**

当前不 commit。候选消息：`feat: add restricted W4-M1 Python runtime`。

### Task 5: Progress revision 8、session、works 与 parser RED→GREEN

**Files:**
- Modify: `src/progress/types.ts`
- Create: `src/progress/weekFourMappingSession.ts`
- Create: `src/progress/weekFourMappingSessionSchema.ts`
- Create: `src/progress/weekFourMappingSession.test.ts`
- Modify: `src/progress/session.ts`
- Modify: `src/progress/session.test.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/schema.test.ts`

- [ ] **Step 1: 写 session/works/evidence RED**

测试覆盖：默认 session 保存 Blockly + appearance code；编辑 code 清除 trace/run/failure；默认 mismatch 计数；Worker load failure 只增加 infrastructure；观察同 snapshot 一次；identity 成功 run；作品与 proof 必须绑定 session；未知字段、伪造 trace、work、source span、非 canonical 时间全部拒绝。

核心断言：

```ts
const session = createWeekFourMappingSession(NOW);
const solved = updateWeekFourMappingCode(session, SOLVED_WEEK_FOUR_MAPPING_PYTHON, LATER);
const blocklyTrace = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
const pythonTrace = parseWeekFourMappingPython(SOLVED_WEEK_FOUR_MAPPING_PYTHON).trace;
const run = compareWeekFourMappingTraces(blocklyTrace, pythonTrace);
const recorded = recordWeekFourMappingRun(solved, { blocklyTrace, pythonTrace, run }, LATEST);
expect(recorded.lastRun?.finalState).toBe('mapping-proven');
expect(recorded.semanticMismatchFailures).toBe(0);
expect(recorded.runnerInfrastructureFailures).toBe(0);
```

- [ ] **Step 2: 增加 revision 8 类型**

`src/progress/types.ts` 新增：

```ts
export interface WeekFourMappingMissionSession {
  workspace: WeekFourMappingWorkspaceDraftV1;
  pythonCode: string;
  pythonSourceSpan: { line: 1; from: number; to: number };
  lastBlocklyTrace: WeekFourMappingTraceItem[];
  lastPythonTrace: WeekFourMappingTraceItem[];
  lastRun: WeekFourMappingRunResult | null;
  failureSnapshot: WeekFourMappingFailureSnapshot | null;
  conditionObservationUses: Array<{ snapshotId: string; usedAt: string; workspace: WeekFourMappingWorkspaceDraftV1; pythonCode: string }>;
  totalRuns: number;
  semanticMismatchFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  usedHintTiers: HintTier[];
  conceptFailures: { mappingField: number; programStructure: number; safeExecution: number };
  lastRunAt: string | null;
  savedAt: string;
}
export interface WeekFourMappingWorkV1 {
  kind: 'blockly-python-mapping-v1';
  workId: 'w4-m1-first-python-mapping';
  missionId: 'w4-m1';
  title: '第一份积木与 Python 对照经卷';
  workspace: WeekFourMappingWorkspaceDraftV1;
  pythonCode: string;
  blocklyTrace: WeekFourMappingTraceItem[];
  pythonTrace: WeekFourMappingTraceItem[];
  run: WeekFourMappingRunResult;
  createdAt: string;
  verifiedAt: string;
}
```

W4 evidence 为 `legacy-replay-only` 精确历史来源联合类型，或 `formal-v3`（绑定 workspace/code/traces/run/workId/times）。`ProgressV3.schemaRevision` 改为 8，并新增 `works` 与 W4 session/evidence key。

- [ ] **Step 3: 实现独立 session 更新函数**

在 `weekFourMappingSession.ts` 导出：`createWeekFourMappingSession`、`updateWeekFourMappingCode`、`recordWeekFourMappingRun`、`recordWeekFourMappingValidationFailure`、`recordWeekFourMappingInfrastructureFailure`、`recordWeekFourMappingObservation`、`recordWeekFourMappingHint`。每个函数 canonical ISO 校验、structuredClone、safe integer、过期 run 失效和精确计数。

`session.ts` 只增加 `createMissionSession('w4-m1')`、hint/support overload 并委托新模块，不再把新逻辑塞入现有 666 行分支。

- [ ] **Step 4: 实现 exact parser 与 revision 1～7 迁移**

`weekFourMappingSessionSchema.ts` 必须：

- exact keys 解析 session/work/evidence；
- 从 workspace 重编译 Blockly；
- 从 code 通过同步 grammar 重派生 source span/Python trace；
- 用 `compareWeekFourMappingTraces` 重建 run；
- 对照 session、work、proof 的每个字段；
- 禁止导入时访问网络或启动 Worker。

`schema.ts` 接受 revision 1～8，输出统一 revision 8。revision 1～7 若 `missions['w4-m1']` 已完成，创建 W4 `legacy-replay-only`，但 `sessions['w4-m1']` 与 `works` 保持空；未完成不创建任何 W4 数据。历史 W4-M2+ mission completion 原样保留。

- [ ] **Step 5: 运行 GREEN 与全部 migration 回归**

Run:

```bash
npm run test:unit -- src/progress/weekFourMappingSession.test.ts src/progress/session.test.ts src/progress/schema.test.ts src/progress/weekThreeBossSession.test.ts src/progress/progress.test.ts
```

Expected: PASS；revision 1～7 无损迁移，revision 8 防伪通过，W3 formal proofs 不漂移。

- [ ] **Step 6: 候选提交检查点**

当前不 commit。候选消息：`feat: add revision 8 mapping sessions and works`。

### Task 6: 完成、解锁、家长、Context 与五类存储故障 RED→GREEN

**Files:**
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`
- Modify: `src/context/ProgressContext.tsx`
- Modify: `src/context/ProgressContext.test.tsx`
- Modify: `src/progress/storageFaultAdapter.ts`
- Modify: `src/progress/storageFaultAdapter.test.ts`
- Modify: `e2e/support/storageFaultAdapter.ts`
- Modify: `src/components/ParentEquipmentReport.tsx`
- Modify: `src/components/ParentEquipmentReport.test.tsx`

- [ ] **Step 1: 写 formal completion/legacy upgrade RED**

测试必须证明：新玩家需 W3-M5 formal；bare/legacy W3 不可进入；旧 W4-M1 completion 保留历史访问；成功 session 原子创建 formal evidence + work；legacy W4 正式重玩保留 completedAt 并新增 verifiedAt；失败 run、appearance code、缺作品、伪造 trace 不可完成。测试文件内定义两个聚焦 fixture：`withFormalW3M5()` 复用现有 W3-M5 成功 session helper 生成合法前置；`withSuccessfulW4MappingSession(progress)` 用 `createWeekFourMappingSession`、`updateWeekFourMappingCode`、`parseWeekFourMappingPython`、`traceForField`、`compareWeekFourMappingTraces` 和 `recordWeekFourMappingRun` 构造当前保存的 identity 成功 session，不直接写 W4 mission/evidence/work。

```ts
const completed = completeMission(withSuccessfulW4MappingSession(withFormalW3M5()), 'w4-m1', { stars: 3, hintsUsed: 0 });
expect(completed.missionCompletionEvidence['w4-m1']).toMatchObject({ kind: 'formal-v3', workId: 'w4-m1-first-python-mapping' });
expect(completed.works['w4-m1-first-python-mapping']).toMatchObject({ kind: 'blockly-python-mapping-v1', missionId: 'w4-m1' });
expect(isMissionUnlocked(completed, 'w4-m2')).toBe(true);
```

- [ ] **Step 2: 实现 atomic completion 与周报**

`formalWeekFourMappingEvidence` 同步重编译 Blockly、重派生 Python trace、重建 run，要求 session last traces/run 完全相等且 `mapping-proven`。`completeMission` 在同一返回对象中写 mission、formal proof 与 work；历史升级不重复计 attempts、不覆盖更高 stars、不创建第二份 work。

`getWeeklyReport(progress, 4)` 增加 W4 摘要，基础设施失败单独字段，不计学习困难。Parent UI 显示运行次数、映射差异、验证拒绝、runtime 故障、观察使用、作品、formal/legacy 状态，不渲染完整 code、正确 token 或 raw IDs。

- [ ] **Step 3: 增加 Context overload 与原子写入口**

`ProgressContext` 增加 W4 session update overload；run/observation 使用 session update，work+completion 使用现有 completion transaction 一次写入。任何 result revision 过期不得覆盖新 code。Hints 通过 `recordWeekFourMappingHint`，不直接修改 session。

- [ ] **Step 4: 增加五类精确 fault mode**

允许的测试 key：

```ts
type WeekFourMappingFaultMode =
  | 'fail-w4-m1-draft'
  | 'fail-w4-m1-run'
  | 'fail-w4-m1-observation'
  | 'fail-w4-m1-work'
  | 'fail-w4-m1-completion';
```

每个 adapter 只允许相应 exact delta；work fault 不得留下 proof/completion/unlock，completion fault 不得留下半份 work。故障关闭后重试同一候选只写一次。

- [ ] **Step 5: 运行 GREEN**

Run:

```bash
npm run test:unit -- src/progress/progress.test.ts src/context/ProgressContext.test.tsx src/progress/storageFaultAdapter.test.ts src/components/ParentEquipmentReport.test.tsx
```

Expected: PASS；五类故障 fail closed，W4-M2 与家长摘要只在原子成功后变化。

- [ ] **Step 6: 候选提交检查点**

当前不 commit。候选消息：`feat: persist W4-M1 proof work and parent summary`。

### Task 7: 正式课程、专用 route 与双轨可见组件 RED→GREEN

**Files:**
- Modify: `src/course/formalCourse.ts`
- Modify: `src/course/course.ts`
- Modify: `src/course/courseOutline.ts`
- Modify: `src/progress/executableMissionIds.ts`
- Create: `src/components/WeekFourMappingBlocklyWorkspace.tsx`
- Create: `src/components/WeekFourMappingBlocklyWorkspace.test.tsx`
- Create: `src/components/WeekFourMappingPythonEditor.tsx`
- Create: `src/components/WeekFourMappingPythonEditor.test.tsx`
- Create: `src/components/WeekFourMappingScene.tsx`
- Create: `src/components/WeekFourMappingScene.test.tsx`

- [ ] **Step 1: 写组件 RED**

Blockly test 断言五个真实 `.blocklyDraggable[data-id]`、只读参考图、失败块聚焦和恢复错误；Python test 断言 CodeMirror 文本精确等于 session code、combobox 名称“选择 Python 判断字段”、选项 appearance/identity、Enter/Space 改同一文本、其余 code read-only；Scene test 断言公开卡标签、三态、资源失败、mute/reduced motion 和 callback 只来自保存事件。

- [ ] **Step 2: 正式化课程与 executable registry**

`formalCourse.ts` 新增 `formalWeekFourCanon` 和仅 W4-M1 的 formal mission：subtitle“同一逻辑，两种写法”，objective“让 Blockly 与 Python 在两张公开卡上做出相同判断”，story beats 只写“白虎岭前核验身份”和“积木映射为 Python”。从 `course.ts` 删除 W4-M1 legacy `mission(...)`，W4-M2～M5 原样保留。`isFormalMissionOutline` 与 `executableMissionIds` 只新增 W4-M1。

- [ ] **Step 3: 实现 Blockly 与 Python 组件**

Blockly 组件 mount 时恢复 session draft，不提供 toolbox、删除或连接修改入口；它仍是真实 Blockly workspace，并公开 `compile()` 与 `focusBlock(id)`。Python 组件 lazy 加载 CodeMirror，主文档保持 read-only；accessible field selector 通过一个 transaction 精确替换保存的 source span，随后调用 `onCodeChange(nextCode)`。任何 span/code 不匹配显示恢复错误并禁止运行。

- [ ] **Step 4: 实现场景**

Scene props 固定为：

```ts
interface WeekFourMappingSceneProps {
  state: 'waiting' | 'mismatch' | 'matched';
  activeCardId: WeekFourMappingCard['id'] | null;
  events: WeekFourMappingTraceItem[];
  muted: boolean;
  reducedMotion: boolean;
  onAssetsReady: () => void;
  onAssetsError: (message: string) => void;
}
```

Scene 不接收 expected field 或 completion callback；`matched` 只能来自已保存成功 run。资源使用精确两个 assetUrl，加载失败局部重试。

- [ ] **Step 5: 运行 GREEN**

Run:

```bash
npm run test:unit -- src/course/course.test.ts src/progress/executableMissionIds.test.ts src/components/WeekFourMappingBlocklyWorkspace.test.tsx src/components/WeekFourMappingPythonEditor.test.tsx src/components/WeekFourMappingScene.test.tsx
```

Expected: PASS；W4-M2～M5 仍 legacy。

- [ ] **Step 6: 候选提交检查点**

当前不 commit。候选消息：`feat: add W4-M1 formal dual-track UI`。

### Task 8: Experience 保存优先状态机、lazy boundary 与响应式 RED→GREEN

**Files:**
- Create: `src/components/WeekFourMappingExperience.tsx`
- Create: `src/components/WeekFourMappingExperience.test.tsx`
- Create: `src/components/WeekFourMappingExperience.css`
- Create: `src/components/WeekFourMappingRoute.test.tsx`
- Modify: `src/components/MissionPageContent.tsx`
- Modify: `src/components/MissionPageContent.css`

- [ ] **Step 1: 写完整一局和五故障 RED**

Testing Library 测试顺序：默认 draft 保存→对照运行→第一卡 mismatch 保存→火眼观察保存且输入深相等→identity transaction 保存→两卡 Worker trace 与 grammar/Blockly 一致→run 保存→work/completion 原子保存→成功对话框。分别注入 draft/run/observation/work/completion fault，断言对应重试前无后续副作用。

同时覆盖：double click 只发一个 request、编辑时 cancel 旧 Worker、过期 result 忽略、asset 未 ready 不完成、runtime load error 不计学习失败、reload 恢复同 code/run/work。

- [ ] **Step 2: 实现 Experience 状态机**

Experience 只持有可见 pending UI，不把 React state 当成功证据。执行顺序严格为：

```ts
const savedDraft = await saveDraft(workspace, pythonCode);
if (savedDraft.status !== 'saved') return showDraftRetry(savedDraft);
const blocklyTrace = compileWeekFourMappingDraft(savedDraft.progress.sessions['w4-m1']!.workspace).trace;
const pythonResult = await runtime.run(savedDraft.progress.sessions['w4-m1']!.pythonCode, WEEK_FOUR_MAPPING_CARDS);
const run = compareWeekFourMappingTraces(blocklyTrace, pythonResult.trace);
const savedRun = await saveRun(run);
if (savedRun.status !== 'saved') return showRunRetry(savedRun);
if (!run.completed) return showSavedMismatch(run.failureSnapshot!);
const completed = await completeWithWork();
if (completed.status !== 'saved') return showCompletionRetry(completed);
showSuccess(completed.progress);
```

以上 `showDraftRetry`、`showRunRetry`、`showSavedMismatch`、`showCompletionRetry` 和 `showSuccess` 都是在 `WeekFourMappingExperience` 内定义的本地状态转换函数：分别只设置对应 recovery/status UI；不得写 Progress、构造 trace 或调用完成。`saveDraft`、`saveRun`、`completeWithWork` 只包装 ProgressContext 已定义的 CAS 持久化入口。

work fault 与 completion fault 在 fault adapter 中仍是同一原子候选的两个测试阶段；生产存储只做一次原子写。

- [ ] **Step 3: 实现火眼金睛与提示边界**

观察只读取当前已保存 failure snapshot。展示实际字段/值/真假/分支；不得出现“改成 identity”、完整正确代码或自动选择。编辑 code 后立即隐藏旧观察。提示按钮在 pending save/run/completion 时锁定，且不编辑、不运行。

- [ ] **Step 4: 加入专用 lazy route**

`MissionPageContent` 新增 `WeekFourMappingRouteBoundary` 和 `mission.id === 'w4-m1'` 分支，props 从 ProgressContext 传入；正式任务不得落到 `renderLegacyMissionTools()`。lazy chunk 失败显示“积木变代码体验加载失败”和局部重试。

- [ ] **Step 5: 实现响应式 CSS**

1440 使用外层 scene/workspace 两列，workspace 内 Blockly/Python 两列；≤900px 依次 scene/cards/Blockly/Python/feedback；320/390 无固定最小宽度和横向滚动。`:focus-visible`、status/alert、非颜色差异标签、reduced-motion media query 完整。

- [ ] **Step 6: 运行 GREEN 与 route/budget 初检**

Run:

```bash
npm run test:unit -- src/components/WeekFourMappingExperience.test.tsx src/components/WeekFourMappingRoute.test.tsx src/responsive.test.tsx
npm run typecheck
```

Expected: PASS；无 direct legacy Python import 进入主 entry。

- [ ] **Step 7: 候选提交检查点**

当前不 commit。候选消息：`feat: add W4-M1 save-first mapping experience`。

### Task 9: 正式素材、manifest 与 visual QA

**Files:**
- Create: `public/assets/week-four-mapping/white-tiger-ridge-background.webp`
- Create: `public/assets/week-four-mapping/mapping-states.webp`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`

- [ ] **Step 1: 读取 imagegen skill 并生成背景**

实施时先完整读取 imagegen skill。使用内建 image generation，提示词固定为：

```text
Use case: illustration-story
Asset type: W4-M1 积木变代码儿童编程关卡的16:9宽幅白虎岭入口背景
Primary request: 明亮精致的3D中国儿童绘本风格，西游记第二十七回白虎岭入口，只作为Blockly到Python过渡关卡的安全故事背景。
Scene/backdrop: 清晨山岭入口、层叠浅色岩石、松树、柔和云雾和通往远方的山路；前景宽阔平坦，留出左中部供证据卡和角色状态叠加。
Subject: 不出现人物、妖怪、武器、尸体或骷髅。
Style/medium: polished bright 3D Chinese children's storybook game environment, jade green, warm gold sunlight, restrained cinnabar accents, rounded readable forms.
Composition/framing: 16:9 landscape, 1280x720 target, readable at phone width, generous clear foreground, no UI frame.
Lighting/mood: clear hopeful morning, curious and thoughtful, never frightening.
Constraints: no text, no letters, no Chinese characters, no pseudo-writing, no logo, no watermark, no UI, no combat, no attack, no injury, no corpse, no skeleton, no horror, no people, no weapons.
```

- [ ] **Step 2: 生成三态图**

```text
Use case: illustration-story
Asset type: W4-M1 等待对照、发现差异、映射一致三态透明横向 sprite
Primary request: 明亮精致的3D中国儿童绘本风格，一张1536x512透明背景横向三格状态图；左、中、右为三个边界精确、各512x512且互不重叠的单元：卷轴与积木等待对照、两条柔和光路出现一个差异节点、两条光路准确汇合并点亮经卷。
Subject: 使用卷轴、真实形态的Blockly积木轮廓和整洁Python代码卷轴作为叙事物件；不出现可读代码文字，不出现人物或妖怪。
Style/medium: polished bright 3D children's storybook game props, jade green, warm ivory, soft gold, restrained cinnabar.
Composition/framing: exact 3:1 horizontal strip, three non-overlapping equal 512x512 cells aligned left-to-right, identical scale and camera, generous transparent padding inside each cell, readable when CSS crops exactly one cell on mobile.
Lighting/mood: patient learning, gentle discovery, confident success.
Constraints: transparent background, no text, no letters, no Chinese characters, no pseudo-writing, no emoji, no logo, no watermark, no UI frame, no combat, no weapon, no injury, no corpse, no skeleton, no horror, no specific woman, old woman or old man disguise.
```

- [ ] **Step 3: 原尺寸检查和仅技术转换**

先检查原始生成图；不通过则重新生成，不用代码重绘。通过后仅使用项目已有 Sharp 做裁切到内容、透明画布放置、resize 和 WebP 编码：背景 1280×720，状态图 1536×512，且三格边界保持 0–511、512–1023、1024–1535。任何艺术内容修改必须回到 imagegen。

- [ ] **Step 4: 写 manifest 与 prompt records**

新增 exact 两行，prompt IDs `W4M1-001`、`W4M1-002`，完整记录 SHA-256、尺寸、source、license/provenance、slot `w4-m1 WeekFourMappingScene` 和初始 QA。`APPROVED_ASSET_DIRECTORIES` 与 required inventory 只新增 `assets/week-four-mapping/` 两个精确路径。

- [ ] **Step 5: 运行资产门禁**

Run:

```bash
file public/assets/week-four-mapping/*.webp
du -b public/assets/week-four-mapping/*.webp
shasum -a 256 public/assets/week-four-mapping/*.webp
npm run check:assets
npm run test:assets
```

Expected: 2 WebP、尺寸精确、单张/总量预算通过、manifest/hash/source bindings 一致。真实五项目截图检查通过后再改为 `visual-qa-passed` 并运行 `npm run verify:assets`。

- [ ] **Step 6: 候选提交检查点**

当前不 commit。候选消息：`feat: add verified W4-M1 story assets`。

### Task 10: E2E、性能、恢复与安全证据 RED→GREEN

**Files:**
- Create: `e2e/week-four-blockly-python-mapping.spec.ts`
- Modify: `scripts/check-week-four-mapping-e2e-contract.mjs`
- Modify: `scripts/check-week-four-mapping-e2e-contract.test.mjs`
- Modify: `scripts/check-bundle-budget.mjs`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: 写唯一合法 W3-M5 formal 前置 helper**

Helper 只可创建完整 W3-M5 formal prerequisite；固定源码 SHA-256 进入 source contract。AST 扫描禁止 helper 出现 `w4-m1`、WeekFourMapping、works 或任何 W4 completion/session/evidence 写入。

- [ ] **Step 2: 写五项目孩子主路径**

`@w4-m1-full` 使用可见 UI 完成：默认运行→第一卡差异→保存快照→火眼观察且 code/workspace 深相等→combobox 选 identity→完整双卡运行→成功→作品→刷新重播→真实文件 chooser 导出/导入→parent 摘要→W4-M2 入口。禁止 `page.evaluate` 注入 W4 success。

- [ ] **Step 3: 写输入、窄屏与故障路径**

- keyboard：Tab/Enter/Space 操作同一 selector/CodeMirror 文本；
- mouse/touch：真实 click/tap 后持久化 identity；
- 320/390/768/1440：无 overflow，scene/Blockly/Python 均可见；
- storage：五种 fault 各自显示精确重试，恢复后只完成一次；
- CAS：旧标签不能覆盖新 identity code；
- corrupt：保留原字节，snapshot 恢复后重新编译/解析；
- asset/lazy/runtime load：局部失败和重试，不发布完成；
- work/parent：作品只读、家长不含正确 token 或完整 code。

- [ ] **Step 4: 写只读 Python 安全 probe**

`@w4-m1-python-security` 可在浏览器中直接调用独立 runner 但必须在 probe 前后断言 progress/storage 深相等。依次运行 syntax error、import、open、`from js import fetch`、attribute/subscript、`eval`、双下划线、无限循环；全部返回稳定拒绝或 timeout，Worker 终止，无文件/网络/browser side effect。source contract 只允许该标签中的 runner probe，禁止调用 completion/save API。

- [ ] **Step 5: 写性能与 runtime inventory**

在 cold Chromium 清 cache、10 Mbps/4× CPU throttle 下记录：本地 W4 closure bytes、Pyodide 所有 request bytes、ready 时间、首次 result、warm result。断言 local ≤3 MiB、runtime transfer ≤15 MiB、cold ≤20 秒、warm ≤1 秒。失败即阻断，不允许白名单忽略 external request failure。

- [ ] **Step 6: 运行 source contract 与 W4 矩阵**

Run:

```bash
npm run test:bundle-script
npm run build:e2e
npm run test:e2e -- e2e/week-four-blockly-python-mapping.spec.ts
```

Expected: source contract PASS；五项目所有 W4 tests PASS，无 flaky、无允许的 Python runtime 失败。

- [ ] **Step 7: 运行 W1～W3 关键统一回归**

Run:

```bash
npm run test:e2e -- \
  e2e/dragon-palace-code-battle.spec.ts \
  e2e/ruyi-staff-code-battle.spec.ts \
  e2e/four-seas-regalia-code-battle.spec.ts \
  e2e/underworld-boss-code-battle.spec.ts \
  e2e/week-one-system-loop.spec.ts \
  e2e/week-two-horse-care.spec.ts \
  e2e/week-two-monkey-king-events.spec.ts \
  e2e/week-two-peach-elixir-debug.spec.ts \
  e2e/week-two-furnace-condition.spec.ts \
  e2e/week-two-heavenly-signal-boss.spec.ts \
  e2e/week-three-manor-help-condition.spec.ts \
  e2e/week-three-cuilan-boolean.spec.ts \
  e2e/week-three-yunzhan-dialogue.spec.ts \
  e2e/week-three-bajie-joining.spec.ts \
  e2e/week-three-boss.spec.ts
```

Expected: PASS；任何失败先分类是否为 W4 引入回归，不把历史数字当新鲜证据。

- [ ] **Step 8: 候选提交检查点**

当前不 commit。候选消息：`test: verify W4-M1 browser and security loop`。

### Task 11: 最终全量验证、视觉验收与证据文档

**Files:**
- Create: `docs/verification/week-four-blockly-python-mapping.md`
- Modify: `docs/assets/asset-manifest.md`（只在视觉证据齐全后把 W4 两行改为 `visual-qa-passed`）

- [ ] **Step 1: 运行完整本地质量门禁**

Run:

```bash
npm run test:unit
npm run typecheck
npm run test:bundle-script
npm run build
npm run verify:bundle
npm run test:assets
npm run verify:assets
git diff --check
```

Expected: 全部 PASS；记录新鲜 test files/tests/source contracts、build、bundle 和 asset 数字，不复用 W3 历史数字。

- [ ] **Step 2: 运行全站 E2E 审计**

Run:

```bash
npm run test:e2e
```

Expected: 记录 total/expected/unexpected/flaky。若 shared/W1 历史失败仍存在，逐项说明是否与 W4 无关；任何 W4、Progress、parent、storage 或 shared route 新回归阻断 W4-M1 完成。

- [ ] **Step 3: 完成五项目视觉验收**

在 1440/768/390/320 和 Firefox 1440 检查背景裁切、三态清晰度、Blockly/Python 双栏、焦点、对比、无横向溢出、mute/reduced motion 和失败/成功状态。确认原尺寸素材无伪文字、恐怖元素、三次具体化身或 provenance 问题后，更新两行 `visual-qa-passed` 并重新运行 `npm run verify:assets`。

- [ ] **Step 4: 写 verification 文档**

文档必须包含：HEAD/branch/worktree、实现范围、孩子主路径、Worker 安全结果、revision 8/works/migration、五类保存故障、五项目数字、性能 bytes/timing、asset hash/QA、W1～W3 回归、全站失败分类、completion matrix 逐格、残余风险和未验证范围。

- [ ] **Step 5: 独立审查 diff 与完成声明**

逐文件核对没有 legacy answer、第二真源、直接 storage 完成、隐藏 test hook、输出字符串通关、素材捷径或 W4-M2～M5 意外正式化。只有全部 W4 mandatory evidence 齐全时报告 W4-M1 `One-level playable`；否则精确报告 `not complete` 和下一阻塞。

- [ ] **Step 6: 授权边界收尾**

Run:

```bash
git status --short --branch
git diff --stat
git diff --check
```

Expected: 只含本任务聚焦改动；不 commit、不 push、不 deploy。若用户之后明确授权提交，再单独执行提交前复核。

## 计划自检

- 规格中的双轨等价、两张卡、appearance→identity、真实 Blockly、同步 grammar、Worker AST、结构化 trace、首差异、火眼边界、零惩罚全部有对应 RED→GREEN 任务。
- revision 8、历史 `legacy-replay-only`、formal replay、works、W3-M5 前置、W4-M2 解锁、家长摘要和五类保存故障均有明确类型、parser、UI 与 E2E 证据。
- 同步导入与异步 Worker 的职责已拆开：导入不访问网络，玩家运行必须真实执行，两者 trace 必须一致。
- 视觉、provenance、儿童安全、五项目输入、runtime 安全、15 MiB/20 秒/1 秒预算和全站回归均有实施前门禁。
- 没有 `TBD`、`TODO`、未选方案或要求执行者自行发明接口的步骤。
- 当前权限明确禁止 install/commit/push/deploy；所有提交仅为未来获授权后的候选消息。
