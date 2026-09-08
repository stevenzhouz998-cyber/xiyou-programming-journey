# W4-M3 Python 分支归位 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 W4-M3 从 legacy 输出比较升级为一关由真实 CodeMirror Python、受限 Pyodide Worker、`if/else` typed trace、revision-10 作品/证明和真实浏览器闭环共同驱动的正式条件任务。

**Architecture:** 新增独立 `WeekFourBranch*` 合同、受限 draft envelope、四结构 canonical grammar、真实 Python Worker、session/schema 和 Experience；只复用 W4-M1/W4-M2 的同源 Pyodide 文件和生命周期模式，不复用 mapping 或 assignment/seal 语义。Progress V3 升到 revision 10，formal completion 原子绑定当前 code、canonical/Worker trace、run 和作品，并以独立 compatibility 分支保留历史 W4-M3/W4-M4 访问。

**Tech Stack:** React 19、TypeScript 5.9、CodeMirror 6、Pyodide 314.0.2 / CPython 3.14.0、Web Worker、Vitest、Testing Library、Vite、Playwright、Node test runner、Sharp、OpenAI 内建 image generation。

---

## 执行与授权总门禁

- 预期 worktree：`/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`。
- 预期起点：detached HEAD `cd713bc3c4d37268ea21fa913112d1d27d2e3f71`；远端同名 ref 必须相同，不得从过期本地 `5fcdc3a` 开始。
- 实施前允许的未跟踪文件只有批准规格和本计划。任何生产文件漂移先停止并重新盘点。
- 不新增 npm/pip 依赖，不复制或修改 `public/runtime/pyodide-314.0.2/`，不使用 CDN。
- 当前权限禁止 commit、push、PR、merge、deploy、安装、删除、覆盖、重置或清理。计划中的候选提交只记录未来原子边界，未获新授权不得执行。
- 不自动启用 `model-squad` 或子代理；只有用户在实施回合明确授权对应方式时才使用。
- 当前等级为 W4-M3 `Design complete`。实施最高候选为 W4-M3 `One-level playable`；W4-M4/M5、第四周系统闭环、30 关、全站、商业完成和公开部署保持 `not complete`。

## 文件职责

### 新建

- `src/engine/weekFourBranchContract.ts`、`.test.ts`：公开卡、condition/action/card-result trace、runner、失败与零惩罚。
- `src/engine/weekFourBranchPythonGrammar.ts`、`.test.ts`：draft envelope、四结构 grammar、source span、同步 trace/run。
- `src/engine/weekFourBranchPythonRunner.ts`、`.test.ts`：Worker 生命周期、request ID、timeout、cancel、late result 和 trace 对照。
- `src/workers/weekFourBranchPython.worker.ts`：Pyodide、AST 白名单、逐卡真实 exec。
- `src/progress/weekFourBranchSession.ts`、`weekFourBranchSessionSchema.ts`、`weekFourBranchSession.test.ts`：revision-10 session/work/evidence 与防伪。
- `src/components/WeekFourBranchPythonEditor.tsx`、`.test.tsx`：真实 CodeMirror 与 connector/indent 控件。
- `src/components/WeekFourBranchScene.tsx`、`.test.tsx`：两卡、老妇、路线状态与安全尾声。
- `src/components/WeekFourBranchExperience.tsx`、`.test.tsx`、`WeekFourBranchExperience.css`：保存优先状态机与响应式。
- `src/components/WeekFourBranchAccessNotice.tsx`、`.test.tsx`、`WeekFourBranchRoute.test.tsx`：历史只读/locked/lazy route。
- `scripts/check-week-four-branch-e2e-contract.mjs`、`.test.mjs`：防成功注入、helper 指纹、标签/项目/故障合同。
- `e2e/week-four-python-branch-structure.spec.ts`：五项目浏览器、安全、保存、迁移、作品和性能。
- `public/assets/week-four-branches/old-woman-visitor.webp`、`branch-route-states.webp`：正式透明素材。
- `docs/verification/week-four-python-branch-structure.md`：最终证据与 completion matrix。

### 修改

- 课程：`src/course/formalCourse.ts`、`courseOutline.ts`、`course.ts`、`course.test.ts`。
- Progress：`src/progress/executableMissionIds.ts`、`.test.ts`、`types.ts`、`session.ts`、`session.test.ts`、`schema.ts`、`schema.test.ts`、`progress.ts`、`progress.test.ts`。
- 保存：`src/context/ProgressContext.tsx`、`.test.tsx`、`src/progress/storageFaultAdapter.ts`、`.test.ts`、`e2e/support/storageFaultAdapter.ts`。
- 页面/家长：`src/components/MissionPageContent.tsx`、`MissionPageContent.css`、`ParentEquipmentReport.tsx`、`.test.tsx`。
- 门禁：`scripts/check-bundle-budget.mjs`、`.test.mjs`、`scripts/check-asset-manifest.mjs`、`.test.mjs`、`docs/assets/asset-manifest.md`、`playwright.config.ts`、`package.json`。

### 明确不修改

- W1～W3 领域语义、W4-M1 mapping、W4-M2 assignment/seal、W4-M4/M5 legacy 内容。
- Pyodide inventory/hash/license、既有预算上限、部署配置、主工作树和其它 worktree。

### Task 0: 现场、依赖与权限复核

**Files:** Read `AGENTS.md`、`xiyou-karpathy` 门禁及两个 reference、批准规格。

- [ ] **Step 1: 重验 Git 身份和远端**

```bash
pwd
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short --branch
git fetch origin codex/w3-m5-week-three-boss
git rev-parse origin/codex/w3-m5-week-three-boss
git worktree list --porcelain
```

Expected: cwd/top-level 是 `.../5806/少儿编程学习网页`；branch 为空；HEAD/remote 都是 `cd713bc...`；只有规格和计划未跟踪。

- [ ] **Step 2: 核对依赖但不安装**

```bash
test -d node_modules && echo node_modules=present || echo node_modules=missing
shasum -a 256 package-lock.json
node --version
npm --version
```

Expected: `node_modules=present`。缺失或 lockfile 漂移时停止，不安装。

- [ ] **Step 3: 记录完成边界**

执行更新必须写明：最高候选 W4-M3 `One-level playable`；未获授权不 commit/push/deploy；W4-M4/M5 及所有高等级声明 `not complete`。

### Task 1: Course、预算、资产与 E2E source contract RED

**Files:** Modify course/executable/bundle/asset tests、`package.json`、`playwright.config.ts`；Create W4-M3 source checker/test。

- [ ] **Step 1: 写 formal/executable RED**

```ts
it('registers w4-m3 as formal Python without legacy answers', () => {
  const mission = getMission('w4-m3');
  expect(isFormalMissionOutline(getMissionOutline('w4-m3'))).toBe(true);
  expect(isExecutableMissionId('w4-m3')).toBe(true);
  expect(mission?.mode).toBe('python');
  expect(mission).not.toHaveProperty('expectedSequence');
  expect(mission).not.toHaveProperty('expectedOutput');
  expect(mission).not.toHaveProperty('starterCode');
  expect(mission?.objective).toContain('else');
  expect(isFormalMissionOutline(getMissionOutline('w4-m4'))).toBe(false);
  expect(isExecutableMissionId('w4-m4')).toBe(false);
});
```

同时断言故事包含第二次变化，不含攻击、尸体、骷髅、逐走。

- [ ] **Step 2: 写预算与资产 RED**

```js
assert.equal(WEEK_FOUR_BRANCH_MAX_LAZY_BYTES, 3 * 1024 * 1024);
assert.equal(WEEK_FOUR_BRANCH_MAX_MEDIA_BYTES, 1.25 * 1024 * 1024);
assert.deepEqual(WEEK_FOUR_BRANCH_REQUIRED_ASSETS, [
  'assets/week-four-branches/old-woman-visitor.webp',
  'assets/week-four-branches/branch-route-states.webp',
]);
assert.equal(WEEK_FOUR_BRANCH_SCENE_SLOT, 'w4-m3 WeekFourBranchScene');
assert.equal(WEEK_FOUR_SHARED_BACKGROUND_SLOT,
  'w4-m1 WeekFourMappingScene; w4-m2 WeekFourVariableEvidenceScene; w4-m3 WeekFourBranchScene');
```

- [ ] **Step 3: 写 source contract RED**

`check-week-four-branch-e2e-contract.mjs` 导出禁用模式和必需标签：

```js
export const FORBIDDEN_W4_M3_PATTERNS = [
  /localStorage\\.setItem[\\s\\S]*w4-m3/,
  /missionCompletionEvidence[^\\n]*w4-m3/,
  /works[^\\n]*w4-m3-branch-structure-record/,
  /page\\.evaluate[\\s\\S]*branch-proven/,
  /expectedSequence|expectedOutput/,
];
export const REQUIRED_W4_M3_TAGS = [
  'full','keyboard','mouse','touch','accessibility','storage','corrupt','parent',
  'work','python-security','cold','runtime-fault','asset-fault','narrow','external','lazy',
];
```

正例要求唯一 W4-M2 formal helper 及固定 hash；反例逐个注入禁用写法并期望抛错。

- [ ] **Step 4: 接入 package/playwright 并运行 RED**

把 checker test 加入 `test:bundle-script`；五 project grep 加入规格标签。运行：

```bash
npm run test:unit -- src/course/course.test.ts src/progress/executableMissionIds.test.ts
node --test scripts/check-bundle-budget.test.mjs scripts/check-asset-manifest.test.mjs scripts/check-week-four-branch-e2e-contract.test.mjs
```

Expected: 只因 W4-M3 formal 注册、预算/资产导出和 checker 尚不存在而 FAIL。

### Task 2: typed trace 与 deterministic runner RED→GREEN

**Files:** Create `src/engine/weekFourBranchContract.ts`、`.test.ts`。

- [ ] **Step 1: 写主语义 RED**

```ts
expect(runWeekFourBranchTrace(defaultTrace()).state).toBe('branch-conflict');
expect(runWeekFourBranchTrace(nestedTrace()).cards).toEqual([
  expect.objectContaining({ cardId: 'canon-old-woman-disguise', result: 'branch-conflict' }),
  expect.objectContaining({ cardId: 'practice-herbalist-elder', result: 'branch-missing' }),
]);
expect(runWeekFourBranchTrace(solvedTrace())).toMatchObject({
  state: 'branch-proven', completed: true,
  penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
});
```

- [ ] **Step 2: 定义 exact types 和 cards**

```ts
export type WeekFourBranchCardId =
  | 'canon-old-woman-disguise' | 'practice-herbalist-elder';
export type WeekFourBranchAction = 'keep-observing' | 'polite-help';
export type WeekFourBranchState =
  | 'branch-ready' | 'branch-conflict' | 'branch-missing'
  | 'python-structure-invalid' | 'branch-proven';
export const WEEK_FOUR_BRANCH_CARDS = [
  { cardId: 'canon-old-woman-disguise', appearance: '老妇', identity: '白骨精', canon: true },
  { cardId: 'practice-herbalist-elder', appearance: '老妇', identity: '山中采药人', canon: false },
] as const;
```

trace union 固定 `condition`、`action`、`card-result`，每项带 card/source span/order；run 含两卡、state、failure snapshot、completed 和零惩罚。
failure snapshot ID 固定为 `w4-m3:branch-conflict:canon-old-woman-disguise` 与 `w4-m3:branch-missing:practice-herbalist-elder`；snapshot 绑定当次 code、trace、run 和 source span，观察不能引用已失效 snapshot。

- [ ] **Step 3: 实现 runner 并拒绝伪造**

```ts
const state = cards.some((item) => item.result === 'branch-conflict')
  ? 'branch-conflict'
  : cards.some((item) => item.result === 'branch-missing')
    ? 'branch-missing'
    : 'branch-proven';
```

拒绝卡缺失/重复/换序、appearance 参与条件、错误 identity/真假、额外动作、错误 span/result、非零惩罚和输入 mutation。

- [ ] **Step 4: 运行 GREEN**

```bash
npm run test:unit -- src/engine/weekFourBranchContract.test.ts
```

Expected: PASS；相同 trace 两次结果深相等，输入不变。候选提交：`feat: add W4-M3 branch semantics`（不执行）。

### Task 3: Draft envelope、grammar、Worker 与 runtime RED→GREEN

**Files:** Create grammar/runner tests and modules、`src/workers/weekFourBranchPython.worker.ts`。

- [ ] **Step 1: 固定四种 code 与 envelope RED**

```ts
export const DEFAULT_WEEK_FOUR_BRANCH_PYTHON =
  'if identity == "白骨精":\\n    keep_observing()\\npolite_help()';
export const NESTED_WEEK_FOUR_BRANCH_PYTHON =
  'if identity == "白骨精":\\n    keep_observing()\\n    polite_help()';
export const INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON =
  'if identity == "白骨精":\\n    keep_observing()\\nelse:\\npolite_help()';
export const SOLVED_WEEK_FOUR_BRANCH_PYTHON =
  'if identity == "白骨精":\\n    keep_observing()\\nelse:\\n    polite_help()';
```

`parseWeekFourBranchDraftEnvelope` 接受 `e`、`el`、缺冒号等受限未完成草稿并原样保存；拒绝固定行改写、控制字符、connector>32、总长越界、未知动作和越界插入。

- [ ] **Step 2: 实现双层 parser**

```ts
export type WeekFourBranchPythonParse =
  | { kind: 'runnable'; structure: 'fallthrough' | 'nested' | 'else';
      pythonCode: string; trace: WeekFourBranchTraceItem[]; run: WeekFourBranchRunResult }
  | { kind: 'invalid'; pythonCode: string; state: 'python-structure-invalid';
      line: number; reason: 'incomplete-connector' | 'indentation' | 'contract' };
```

default/nested/solved 派生 trace；invalid else 和 envelope 内其它草稿返回 invalid；envelope 外抛损坏错误。CRLF 仅运行派生时统一，保存保留原文。

- [ ] **Step 3: 写 FakeWorker 生命周期 RED**

API：

```ts
export interface WeekFourBranchPythonRuntime {
  ready(): Promise<void>;
  run(code: string): Promise<{ trace: WeekFourBranchTraceItem[]; run: WeekFourBranchRunResult }>;
  cancel(): void;
  dispose(): void;
}
```

覆盖 ready/load-error/load-timeout/validation/busy/warm-timeout/cancel/dispose/wrong requestId/late result/worker error/trace mismatch。

- [ ] **Step 4: 实现受限 Worker**

相对加载现有 Pyodide。harness 仅允许：

```python
allowed = (ast.Module, ast.If, ast.Compare, ast.Eq, ast.Name,
           ast.Constant, ast.Expr, ast.Call, ast.Load)
if any(type(node) not in allowed for node in ast.walk(tree)):
    raise ValueError("检测到未允许的 Python 语法")
```

严格验证固定 condition、两个零参数 action 和 body/orelse ownership。每卡新建空 builtins globals；Worker 只返回真实 trace，不返回 success。runner 重新 parse 当前 code 并逐字段对照。

- [ ] **Step 5: 运行 GREEN 与旧 runtime 回归**

```bash
npm run test:unit -- \
  src/engine/weekFourBranchContract.test.ts \
  src/engine/weekFourBranchPythonGrammar.test.ts \
  src/engine/weekFourBranchPythonRunner.test.ts \
  src/engine/weekFourPythonMappingRunner.test.ts \
  src/engine/weekFourVariablePythonRunner.test.ts
```

Expected: 全部 PASS。候选提交：`feat: run restricted W4-M3 Python branches`（不执行）。

### Task 4: Revision 10 session、work、proof 与 migration RED→GREEN

**Files:** Create `weekFourBranchSession.ts`、`weekFourBranchSessionSchema.ts`、`weekFourBranchSession.test.ts`；Modify Progress types/session/schema 及测试。

- [ ] **Step 1: 写 session 更新 RED**

```ts
export interface WeekFourBranchMissionSession {
  kind: 'python-branch-structure-v1';
  pythonCode: string;
  lastCanonicalTrace: WeekFourBranchTraceItem[];
  lastWorkerTrace: WeekFourBranchTraceItem[];
  lastRun: WeekFourBranchRunResult | null;
  failureSnapshot: WeekFourBranchFailureSnapshot | null;
  totalRuns: number;
  branchConflictFailures: number;
  branchMissingFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  conditionObservationUses: WeekFourBranchObservation[];
  hintsUsed: Array<'observe' | 'think' | 'partial'>;
  firstBlockingConcept: 'branch-ownership' | 'else-indentation' | 'python-structure' | null;
  lastRunAt: string | null;
  savedAt: string;
}
```

测试 `createWeekFourBranchSession`、`updateWeekFourBranchCode`、`recordWeekFourBranchValidationFailure`、`recordWeekFourBranchRun`、`recordWeekFourBranchInfrastructureFailure`、`recordWeekFourBranchObservation`、`recordWeekFourBranchHint`。编辑后旧 trace/run/failure/observation 失效；invalid draft 可保存但不能生成 run。

- [ ] **Step 2: 实现 immutable session 与计数**

run 校验 canonical/worker/run 同构；`totalRuns + 1`；每 run 的 conflict/missing 各最多加一。validation 不加 total；timeout 仅在 `executionStarted` 时加 total。所有输入 structuredClone，函数返回新 session。

- [ ] **Step 3: 扩展 revision 10 types**

```ts
export interface WeekFourBranchWorkV1 {
  kind: 'python-branch-structure-v1';
  workId: 'w4-m3-branch-structure-record';
  missionId: 'w4-m3';
  title: string;
  pythonCode: string;
  canonicalTrace: WeekFourBranchTraceItem[];
  workerTrace: WeekFourBranchTraceItem[];
  run: WeekFourBranchRunResult;
  createdAt: string;
  verifiedAt: string;
}
```

加入 `sessions['w4-m3']`、`works['w4-m3-branch-structure-record']`、`missionCompletionEvidence['w4-m3']`；current revision 设为 10，historical union 扩到 1～10。

`types.ts` 的 V3 revision union 必须精确加入 10，`schema.ts` 的 initial/current/clear 输出必须逐字使用 `schemaRevision: 10`；revision 1～9 只作为输入迁移来源，不能由任何新保存路径再次写出。

- [ ] **Step 4: 写 schema/migration RED**

覆盖 V1/V2/V3 revision 1～9。旧 W4-M3 completion 只生成精确 `legacy-replay-only` provenance；revision <10 携带 W4-M3 session/work/formal proof 拒绝；revision 9 的 W4-M1/M2 deepEqual 不变；revision 10 unknown keys、孤儿 work/proof、时间逆序、计数伪造、envelope 越界和 trace/run mismatch 拒绝。

- [ ] **Step 5: 实现 exact parsers**

`parseWeekFourBranchSession` 允许 envelope 内 invalid draft，但要求无成功 trace/run/work/proof。`parseWeekFourBranchWork`/`Evidence` 必须从 solved code 同步重建 trace/run，并绑定 W4-M2 formal 前置、当前 session、work ID 和时间。

`schema.ts` 的 observation capability 聚合必须加入 `sessions['w4-m3'].conditionObservationUses`；任何 W4-M3 observation 都要求既有火眼能力已稳定获得。导入、失败和 clear 不得伪造、撤销或重复授予该能力。

- [ ] **Step 6: 运行 migration/full schema GREEN**

```bash
npm run test:unit -- \
  src/progress/weekFourBranchSession.test.ts \
  src/progress/session.test.ts \
  src/progress/schema.test.ts \
  src/progress/weekFourMappingSession.test.ts \
  src/progress/weekFourVariableSession.test.ts
```

Expected: 全部 PASS，历史 fixture 不携带未来字段。候选提交：`feat: persist W4-M3 formal evidence`（不执行）。

### Task 5: Completion、access、parent、Context 与 fault adapter RED→GREEN

**Files:** Modify `progress.ts`/tests、`ProgressContext.tsx`/tests、fault adapters/tests、`ParentEquipmentReport.tsx`/tests。

- [ ] **Step 1: 写 formal access/completion RED**

```ts
type WeekFourBranchAccess =
  | { kind: 'formal' }
  | { kind: 'historical-read-only'; completed: boolean }
  | { kind: 'locked' };
```

只有 W4-M2 formal 且 work/proof 有效返回 formal。覆盖 bare/legacy M2、伪造 unlock、历史 M3 complete、legacy→formal upgrade 和 W4-M1/M2 deepEqual。

- [ ] **Step 2: 实现 atomic completion/work/proof**

`completeMission(progress, 'w4-m3', input)` 重新 parse solved session，要求 W4-M2 formal，原子写 mission、`formal-v3` evidence、`w4-m3-branch-structure-record` work。新正式完成解锁 W4-M4；历史 W4-M4 access 继续走 compatibility。

- [ ] **Step 3: 写周报与 clear RED→GREEN**

`getWeeklyReport(progress, 4).weekFourBranches` 只含 runs/conflicts/missing/validation/infrastructure/observations/workSaved/proof/completedAt。Parent 不渲染 code、`else:`、缩进答案、source span 或 raw IDs。backup-and-clear 删除 W4-M3 session/work/evidence/completion/new formal unlock，并保持现有 settings/privacy clear 合同。

- [ ] **Step 4: 扩展 Context typed API**

```ts
saveWeekFourBranchDraft(code: string): Promise<CoordinatedSaveResult>;
saveWeekFourBranchRun(value: {
  canonicalTrace: WeekFourBranchTraceItem[];
  workerTrace: WeekFourBranchTraceItem[];
  run: WeekFourBranchRunResult;
}): Promise<CoordinatedSaveResult>;
saveWeekFourBranchObservation(): Promise<CoordinatedSaveResult>;
saveWeekFourBranchValidationFailure(): Promise<CoordinatedSaveResult>;
saveWeekFourBranchInfrastructureFailure(
  input: { executionStarted: boolean },
): Promise<CoordinatedSaveResult>;
completeWeekFourBranch(input: CompletionInput): Promise<CoordinatedSaveResult>;
```

全部走 `updateMissionSessionAt('w4-m3', ...)` 和 CAS coordinator，不直接写 storage。

- [ ] **Step 5: 扩展 exact fault adapter**

加入 `fail-w4-m3-draft`、`fail-w4-m3-run`、`fail-w4-m3-observation`、`fail-w4-m3-work`、`fail-w4-m3-completion`。单元和 E2E adapter 分别实现 draft/run/observation/completion exact delta，任何 extra delta 拒绝。其它 ID 精确为 `fail-w4-m3-runtime-load`、`fail-w4-m3-runtime-timeout`、`fail-w4-m3-assets`、`fail-w4-m3-lazy`、`fail-w4-m3-cas-stale-writer`、`fail-w4-m3-corrupt-current`，不接受临时别名。

- [ ] **Step 6: 运行 GREEN**

```bash
npm run test:unit -- \
  src/progress/progress.test.ts \
  src/context/ProgressContext.test.tsx \
  src/progress/storageFaultAdapter.test.ts \
  src/components/ParentEquipmentReport.test.tsx
```

Expected: access/completion/report/clear/CAS/fault PASS，W4-M1/M2 无回归。

### Task 6: Formal course、Editor、Scene、AccessNotice 与 route RED→GREEN

**Files:** Modify course/executable/page；Create W4-M3 Editor/Scene/AccessNotice/Route 及测试。

- [ ] **Step 1: 正式注册 W4-M3**

```ts
formalPythonMission('w4-m3', {
  subtitle: '分支归位，只走一条路线',
  objective: '补出 else 并用缩进让每张卡只进入一个 Python 分支',
  canon: formalWeekFourCanon,
  storyBeats: [
    beat('变作老妇', '第二次变化来到白虎岭，老妇外形改变，公开核验身份不变。'),
    beat('再次核验', '程序依据身份事实只选择一条安全路线。'),
  ],
  hints: {
    observe: '看看每张卡实际亮起了几条路线。',
    think: 'if 结束后，没有归入其它分支的语句仍会继续执行。',
    partial: '检查礼貌帮助这一行属于条件内、条件外，还是应该属于另一条互斥路线。',
  },
})
```

删除 W4-M3 legacy 定义；加入 formal/executable allowlist；W4-M4/M5 保留。

- [ ] **Step 2: 实现真实 Editor**

```ts
interface WeekFourBranchPythonEditorProps {
  code: string;
  disabled: boolean;
  onCodeChange(code: string): void;
  onReady(): void;
  onError(message: string): void;
}
```

固定行只读，仅 connector 与末行 leading whitespace 可编辑。控件“无连接词/else”和“条件外/缩进4空格”dispatch 同一 CodeMirror transaction。测试逐字 `e→el→else:`、Tab/Shift+Tab、Enter/Space、touch、invalid draft 和越界拒绝。

- [ ] **Step 3: 实现 Scene**

props 接收 state/cards/events/muted/reducedMotion/showCanonEpilogue/asset callbacks。断言两卡 appearance 都为老妇、identity 来源可见、practice 非原著、Scene 只消费 events、sprite 精确裁切、无攻击/恐怖文本。

- [ ] **Step 4: 实现 AccessNotice**

historical-read-only 显示历史记录与 W4-M2 正式验证入口，无 editor/run/complete；locked 显示先完成前置。组件不得创建 session。

- [ ] **Step 5: 接入 lazy route**

`WeekFourBranchRouteBoundary` 只在 formal access lazy import Experience；historical/locked 返回 notice；W4-M3 不落入 legacy tools。lazy error 提供局部重试。

- [ ] **Step 6: 运行 GREEN**

```bash
npm run test:unit -- \
  src/course/course.test.ts \
  src/progress/executableMissionIds.test.ts \
  src/components/WeekFourBranchPythonEditor.test.tsx \
  src/components/WeekFourBranchScene.test.tsx \
  src/components/WeekFourBranchAccessNotice.test.tsx \
  src/components/WeekFourBranchRoute.test.tsx
```

Expected: 全部 PASS，W4-M4/M5 legacy 合同不变。

### Task 7: Experience 保存优先状态机与响应式 RED→GREEN

**Files:** Create `WeekFourBranchExperience.tsx`/test/CSS；Modify `MissionPageContent.css`。

- [ ] **Step 1: 写完整一局 RED**

路径：初始化保存 default → Worker conflict → 保存 snapshot → 火眼且 code 不变 → nested conflict+missing → invalid else validation → solved → Worker 两卡成功 → assets ready → atomic work/proof/completion → 尾声。断言唯一主按钮“运行分支”。

- [ ] **Step 2: 写五写入故障 RED**

分别模拟 draft/run/observation/work/completion failure，断言规格 exact delta、恢复焦点、单一重试和无半份 publication。

- [ ] **Step 3: 写异步/CAS/回放 RED**

覆盖双击、编辑取消 Worker、迟到 message/asset、unmount、external revision、显式载入、completed replay 不写计数、W4-M2 review 前后 Progress deepEqual。

- [ ] **Step 4: 实现保存优先编排**

```ts
const saved = await context.saveWeekFourBranchDraft(code);
const parsed = parseWeekFourBranchPython(savedSession.pythonCode);
if (parsed.kind === 'invalid') {
  return context.saveWeekFourBranchValidationFailure();
}
const worker = await runtime.run(savedSession.pythonCode);
await context.saveWeekFourBranchRun({
  canonicalTrace: parsed.trace,
  workerTrace: worker.trace,
  run: worker.run,
});
if (worker.run.completed && assetsReady) {
  await context.completeWeekFourBranch({ stars: 3, hintsUsed });
}
```

每步使用 generation/request ID/mounted guard；retry 不跨阶段重跑。

- [ ] **Step 5: 响应式与可访问性**

1440 双列；≤900px 为 scene→review→editor→preview→feedback；≤520px 素材纵排。status/alert/focus、touch target、reduced motion、mute、no overflow 和局部 retry 均有组件测试。

- [ ] **Step 6: 运行 GREEN**

```bash
npm run test:unit -- \
  src/components/WeekFourBranchExperience.test.tsx \
  src/components/WeekFourBranchPythonEditor.test.tsx \
  src/components/WeekFourBranchScene.test.tsx \
  src/components/WeekFourVariableEvidenceExperience.test.tsx
npm run typecheck
```

Expected: 全部 PASS，W4-M2 Experience 无回归。候选提交：`feat: add save-first W4-M3 experience`（不执行）。

### Task 8: 正式素材、manifest 与 visual QA

**Files:** Create 两张 `public/assets/week-four-branches/*.webp`；Modify asset manifest/checker/tests。

- [ ] **Step 1: 读取 imagegen skill**

实施回合完整读取 `/Users/macmini-zz/.codex/skills/.system/imagegen/SKILL.md`。只用内建 image generation/editing；不得用 CSS/SVG/代码绘图替代。

- [ ] **Step 2: 生成老妇 RGBA 源图**

```text
Use case: illustration-story
Asset type: W4-M3 第二次变化儿童 Python 分支关卡的透明人物素材
Primary request: 明亮温暖的中国神话 3D 儿童绘本角色，一位端庄慈祥的山中老妇，朴素整洁的传统衣着，站姿自然，双手可见，柔和日光，完整全身，透明背景，适合 8–12 岁儿童。
Composition: square 1:1 transparent canvas, centered full body, generous alpha padding, readable at mobile size.
Constraints: no text, pseudo-writing, logo, watermark, UI, weapon, attack, injury, corpse, skeleton, horror transformation, evil caricature, exaggerated aging, sexualized pose, child character or old man.
```

接受后仅 contain resize、透明画布和 WebP 编码为 1024×1024，≤512 KiB。

- [ ] **Step 3: 生成三格路线 RGBA 源图**

```text
Use case: illustration-story
Asset type: W4-M3 等待运行、双路线冲突、单一路线确认的透明横向 sprite
Primary request: exact 3:1 transparent strip in bright polished 3D Chinese children's storybook style. Three equal 512-square cells: waiting at a two-path forest fork; both mutually exclusive paths illuminated at once to show conflict; exactly one safe path illuminated to show confirmed branching.
Composition: identical camera and scale, non-overlapping cells, generous alpha padding, readable when cropped to one cell.
Constraints: no text, letters, Chinese characters, pseudo-writing, code, answer token, emoji, logo, watermark, weapon, attack, injury, corpse, skeleton, horror or frightening face.
```

接受后仅等比 resize/alpha-preserving WebP 编码为 1536×512，三格边界 0–511/512–1023/1024–1535，≤512 KiB。

- [ ] **Step 4: 原尺寸 QA 与 manifest**

用 `view_image` original 检查；失败则重新生成。manifest 新增 `W4M3-001/W4M3-002`，记录 accepted result、完整 prompt、技术处理、SHA-256、尺寸、alpha、provenance、slot `w4-m3 WeekFourBranchScene`。共享背景 slot 更新为三关精确字符串。

- [ ] **Step 5: 实现 asset gate**

```js
export const WEEK_FOUR_BRANCH_REQUIRED_ASSETS = Object.freeze([
  'assets/week-four-branches/old-woman-visitor.webp',
  'assets/week-four-branches/branch-route-states.webp',
]);
export const WEEK_FOUR_BRANCH_SCENE_SLOT = 'w4-m3 WeekFourBranchScene';
```

验证 exact inventory、尺寸、true alpha、每张≤512 KiB、共享背景+两图≤1.25 MiB、唯一 `assetUrl` live slot 和 manifest/source matching。

- [ ] **Step 6: 运行资产门禁**

```bash
file public/assets/week-four-branches/*.webp
du -b public/assets/week-four-branches/*.webp
shasum -a 256 public/assets/week-four-branches/*.webp
npm run check:assets
npm run test:assets
```

Expected: exact 2 新文件、尺寸/alpha/hash/slot/字节 PASS。五项目截图人工通过后才标记 `visual-qa-passed` 并运行 `npm run verify:assets`。

### Task 9: 五项目 E2E、安全、恢复与性能 RED→GREEN

**Files:** Create W4-M3 E2E/source checker；Modify bundle gate、playwright、package scripts。

- [ ] **Step 1: 写唯一 W4-M2 formal prerequisite helper**

helper 用真实 W4-M2 session/grammar/run/complete API 生成 formal prerequisite，函数体固定 SHA-256。checker 禁止 helper 出现 W4-M3 session/evidence/work/completion 或直接 storage success。

- [ ] **Step 2: 写孩子主路径**

`@w4-m3-full` 只用可见 UI：进入 → W4-M2 只读回看无副作用 → default conflict → 火眼且 code 不变 → nested conflict+missing → invalid else → direct CodeMirror/控件 solved → Worker 两卡成功 → work/proof/completion → 尾声 → refresh replay → 文件 chooser export/import → parent summary → W4-M4。

- [ ] **Step 3: 写输入与可访问性**

- `@w4-m3-mouse`：connector/indent 控件修改真实 text；
- `@w4-m3-touch`：touch tap 修改同一 text；
- `@w4-m3-keyboard`：逐字输入 `else:`、Tab 缩进；
- `@w4-m3-accessibility`：role/name/live region/focus/dialog、失败聚焦、纯键盘；
- `@w4-m3-narrow`：320/390/768/1440 无 overflow。

- [ ] **Step 4: 写 storage/CAS/corrupt/parent/work**

五种 `@w4-m3-storage` 使用上述精确 ID 并断言 exact delta；`external` 两 context 证明 stale writer；`corrupt` 下载 byte-identical 原文再恢复/replay；malformed import 必须拒绝且保留 current/snapshot；`parent/work` 验证 structured output、timestamps、无答案泄漏和 clear。每条路径前后既有 ability/equipment 与 W4-M1/M2 session/work/proof/attempts 深相等。

- [ ] **Step 5: 写 built Worker 安全 probe**

定位 built `weekFourBranchPython.worker-*`，发送 syntax/import/open/from js/attribute/subscript/eval/dunder/assignment/while/for/def/try/无限循环/未知 action，绑定 request ID，期望 error 或 timeout。probe 前后 current/revision bytes 深相等。

- [ ] **Step 6: 写 runtime/asset/lazy/cold**

load fault：infra=1,total=0；timeout：started 时 total=1,infra=1；asset/lazy：无 completion，retry 不重跑 Worker；desktop cold：local closure+Worker≤3MiB、runtime≤15MiB、10Mbps/4× cold≤20s、warm≤1s；404/page health/console/request failure fail closed。

- [ ] **Step 7: 运行 source contract 与 W4-M3 矩阵**

```bash
npm run test:bundle-script
npm run build:e2e
npm run test:e2e -- e2e/week-four-python-branch-structure.spec.ts
```

Expected: checker PASS；五项目全部映射 PASS，0 unexpected、0 flaky。记录真实数量。

- [ ] **Step 8: 运行 W4-M1/M2 和关键正式回归**

```bash
npm run test:e2e -- \
  e2e/week-four-blockly-python-mapping.spec.ts \
  e2e/week-four-python-variable-overwrite.spec.ts \
  e2e/week-one-system-loop.spec.ts \
  e2e/week-two-heavenly-signal-boss.spec.ts \
  e2e/week-three-manor-help-condition.spec.ts \
  e2e/week-three-cuilan-boolean.spec.ts \
  e2e/week-three-yunzhan-dialogue.spec.ts \
  e2e/week-three-bajie-joining.spec.ts \
  e2e/week-three-boss.spec.ts
```

Expected: 相关正式路径 PASS；失败按路径归属，不用历史数字替代。

### Task 10: 全量验证、视觉验收与证据文档

**Files:** Create `docs/verification/week-four-python-branch-structure.md`；仅新鲜证据齐全后更新 asset QA。

- [ ] **Step 1: 完整本地质量门禁**

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

Expected: 全部 PASS；记录实际 test files/tests/contracts、build、bundle、runtime、asset 数字。

- [ ] **Step 2: 全站 E2E 审计**

```bash
npm run test:e2e
```

记录 total/expected/unexpected/flaky。任何 W4/Progress/parent/storage/shared route 新回归阻断 `One-level playable`；既有失败逐项分类，不冒充全站绿。

- [ ] **Step 3: 五项目人工视觉复核**

保存 default/conflict/invalid/proven 截图，在 1440 Chromium、768 WebKit、390 Chromium、1440 Firefox、320 Chromium 检查老妇完整和尊重性、三格准确、同 appearance 两卡不混淆、焦点、overflow、mute/reduced motion。全部通过后才更新 `visual-qa-passed`。

- [ ] **Step 4: 写 verification**

必须记录 cwd/HEAD/remote/worktree、真实孩子路径、三类失败、Worker 安全、revision 10/works/migration、五写入故障/CAS/corrupt/clear、五项目数字、性能 bytes/timing、asset hashes/QA、W4-M1/M2/W1～W3 回归、全站分类、completion matrix、屏幕阅读器/部署未验证范围。

- [ ] **Step 5: 完成声明门禁**

只有 unit/type/build/bundle/assets、W4-M3 五项目、W4-M1/M2 防回归、refresh/export-import/recovery/parent/unlock 和 visual QA 全有新鲜证据，才报告 W4-M3 `One-level playable`；否则降级。W4-M4/M5、第四周 system loop、30 关、全站、公开部署和商业生产始终 `not complete`。

## 计划自检

- 默认贯穿 conflict、nested conflict+missing、invalid else、solved else/indent 和五状态均有 RED→GREEN。
- draft envelope 与 canonical grammar 分层，未完成 code 可恢复但不能生成 trace/work/proof。
- 条件 expression 固定；没有复刻 W4-M1 字段映射或 W4-M2 变量覆盖。
- Worker AST、同步 grammar、typed trace、request ID、timeout、late result 和 mismatch 职责完整，不使用 stdout/hidden answer。
- revision 10、legacy access/formal upgrade、session/work/proof、parent/clear、W4-M4 unlock、CAS/corrupt 和五 fault 名字一致。
- 资产 prompt、尺寸、alpha、预算、shared background 三 slot、manifest 和 visual QA 有明确任务，不预造 hash。
- 五项目、输入、可访问性、性能、安全、全站分类和 completion matrix 均有验证。
- 当前权限优先于模板提交建议；所有候选提交明确“不执行”。
