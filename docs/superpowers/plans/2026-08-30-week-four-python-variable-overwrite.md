# W4-M2 Python 变量覆盖取证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 W4-M2 从 legacy 输出比较升级为一关由真实 CodeMirror Python、受限 Pyodide Worker、变量覆盖 trace、revision-9 作品/证明和真实浏览器闭环共同驱动的正式变量任务。

**Architecture:** 新增独立 `WeekFourVariable*` 合同、同步 exact grammar、真实 Python Worker、session/schema 和 Experience；W4-M2 只复用 W4-M1 的同源 Pyodide 文件与生命周期模式，不复用其 `if/else` grammar、mapping trace 或 proof。Progress V3 升到 revision 9，formal completion 原子绑定当前 code、canonical/Worker trace、run 和作品，并以独立历史兼容规则解锁 W4-M3。

**Tech Stack:** React 19、TypeScript 5.9、CodeMirror 6、Pyodide 314.0.2 / CPython 3.14.0 同源 runtime、Web Worker、Vitest、Testing Library、Vite、Playwright、Node test runner、Sharp、OpenAI 内建 image generation。

---

## 执行与授权门禁

- 预期 worktree：`/Users/macmini-zz/.codex/worktrees/b3d1/少儿编程学习网页`。
- 预期起点：detached HEAD `5fcdc3ac3f9b7de7ac31fd1aa0d54abf80c53c3a`；`origin/codex/w3-m5-week-three-boss` 指向同一提交。
- 已知未提交内容只能是：
  - `docs/superpowers/specs/2026-08-30-week-four-python-variable-overwrite-design.md`
  - 本计划文件。
- 实施前若分支、HEAD、远端或工作树出现其他漂移，停止并重新盘点；不得把另一个 worktree 的分支所有权当成本 worktree 已附着分支。
- 不新增 npm/pip 依赖，不复制 `public/runtime/pyodide-314.0.2/`，不访问 CDN runtime。
- 当前权限禁止 commit、push、PR、merge、deploy、安装、删除、覆盖、重置或清理。下文提交步骤只记录候选检查点；只有未来明确授权后才能执行。
- 本次 `$model-squad` 未自动激活。若未来执行请求没有再次明确调用，不启动模型小队。
- 最高完成声明为 W4-M2 `One-level playable`；W4-M3～M5、第四周系统闭环、30 关、全站、商业完成和公开部署保持 `not complete`。

## 文件职责

### 新建

- `src/engine/weekFourVariableContract.ts`：公开证据、assignment/seal trace、NameError 学习失败、runner 与零惩罚。
- `src/engine/weekFourVariableContract.test.ts`：默认覆盖、正确封存、伪造/顺序/来源拒绝与确定性。
- `src/engine/weekFourVariablePythonGrammar.ts`：三行 exact grammar、source span、同步 canonical trace/run。
- `src/engine/weekFourVariablePythonGrammar.test.ts`：默认/正确 code、逐行同构、CRLF 和恶意输入拒绝。
- `src/engine/weekFourVariablePythonRunner.ts`：Worker 预热、request ID、20 秒 cold/1 秒 warm timeout、cancel/late result 与 grammar/Worker 对照。
- `src/engine/weekFourVariablePythonRunner.test.ts`：FakeWorker 生命周期与 contract mismatch。
- `src/workers/weekFourVariablePython.worker.ts`：Pyodide 加载、逐行 AST 白名单、真实 exec、traceback/globals failure trace。
- `src/progress/weekFourVariableSession.ts`：W4-M2 session 创建、code、run、验证/基础设施、观察与 hint 更新。
- `src/progress/weekFourVariableSessionSchema.ts`：session/work/evidence exact parser 和离线复算。
- `src/progress/weekFourVariableSession.test.ts`：revision 9、历史 provenance、作品/证明、防伪与计数。
- `src/components/WeekFourVariableEvidencePythonEditor.tsx`：真实 CodeMirror 与第二行目标变量的可访问编辑。
- `src/components/WeekFourVariableEvidencePythonEditor.test.tsx`：同一文本 transaction、source span、键盘/触控语义和锁定范围。
- `src/components/WeekFourVariableEvidenceScene.tsx`：白虎岭证据卡、女子素材、两匣三态和固定安全尾声。
- `src/components/WeekFourVariableEvidenceScene.test.tsx`：公开事实、资源、mute/reduced motion、已保存事件与失败恢复。
- `src/components/WeekFourVariableEvidenceExperience.tsx`：draft/run/observation/completion 保存优先状态机。
- `src/components/WeekFourVariableEvidenceExperience.test.tsx`：完整孩子循环、五写入故障、runtime/asset/lazy、过期结果与历史入口。
- `src/components/WeekFourVariableEvidenceExperience.css`：响应式、焦点、状态区和无横向溢出。
- `src/components/WeekFourVariableAccessNotice.tsx`：locked 与历史只读访问提示，不创建 session 或运行入口。
- `src/components/WeekFourVariableAccessNotice.test.tsx`：历史/locked 文案、W4-M1 返回入口和无副作用控件。
- `src/components/WeekFourVariableEvidenceRoute.test.tsx`：正式 lazy route、历史只读分支与错误边界。
- `scripts/check-week-four-variable-e2e-contract.mjs`：E2E AST 防注入、W4-M1 formal 前置指纹、标签/五项目/健康/故障断言。
- `scripts/check-week-four-variable-e2e-contract.test.mjs`：source-contract 正反例。
- `e2e/week-four-python-variable-overwrite.spec.ts`：五项目可见主路径、安全、存储、迁移、作品、性能和故障证据。
- `public/assets/week-four-variables/woman-with-offering.webp`：1024×1024 透明送斋女子正式素材。
- `public/assets/week-four-variables/variable-record-states.webp`：1536×512 三格变量证据状态素材。
- `docs/verification/week-four-python-variable-overwrite.md`：最终证据与 completion matrix。

### 修改

- `src/course/formalCourse.ts`：新增显式 Python formal helper 和 W4-M2 正式课程。
- `src/course/courseOutline.ts`：W4-M2 formal allowlist 与显式 hints 支持。
- `src/course/course.ts`：移除 W4-M2 legacy 定义；W4-M3～M5 原样保留。
- `src/course/course.test.ts`：formal mode、故事、hints 和 legacy 排除合同。
- `src/progress/executableMissionIds.ts`、`src/progress/executableMissionIds.test.ts`：加入 W4-M2。
- `src/progress/types.ts`：revision 9、W4-M2 session/work/evidence exact 类型。
- `src/progress/session.ts`、`src/progress/session.test.ts`：创建/提示 API 路由到独立 session 模块。
- `src/progress/schema.ts`、`src/progress/schema.test.ts`：revision 1～9、works/evidence/session、observation ability 聚合。
- `src/progress/progress.ts`、`src/progress/progress.test.ts`：formal completion、历史升级、W4-M3 unlock、周报和 clear 断言。
- `src/context/ProgressContext.tsx`、`src/context/ProgressContext.test.tsx`：W4-M2 typed CAS 写入和原子完成。
- `src/progress/storageFaultAdapter.ts`、`src/progress/storageFaultAdapter.test.ts`、`e2e/support/storageFaultAdapter.ts`：W4-M2 exact delta 与故障 ID。
- `src/components/MissionPageContent.tsx`、`src/components/MissionPageContent.css`：正式/历史 lazy route；保留 W4-M1 work review。
- `src/components/ParentEquipmentReport.tsx`、`src/components/ParentEquipmentReport.test.tsx`：W4-M2 不泄题摘要。
- `scripts/check-bundle-budget.mjs`、`scripts/check-bundle-budget.test.mjs`：W4-M2 3 MiB closure 与既有预算隔离。
- `scripts/check-asset-manifest.mjs`、`scripts/check-asset-manifest.test.mjs`、`docs/assets/asset-manifest.md`：新资产 exact inventory、共享背景双 slot、hash/alpha/QA。
- `playwright.config.ts`：五项目收集 W4-M2 标签。
- `package.json`：把 W4-M2 source contract test 纳入 `test:bundle-script`。

### 明确不修改

- W1～W3 领域合同、compiler、runner、Experience 和 Scene 的生产行为。
- W4-M1 的 Blockly draft/compiler、mapping grammar/Worker/trace/proof 和作品语义。
- W4-M3～M5 的 legacy 配置内容、generic 交互兼容和历史访问；只改变正式解锁判断的分支。
- `public/runtime/pyodide-314.0.2/` 文件、hash、MPL-2.0 `LICENSE` 与 `SOURCE.md`。
- 既有预算上限、部署配置和主工作树。

### Task 0: 现场、依赖与权限复核

**Files:**
- Read: `AGENTS.md`
- Read: `.agents/skills/xiyou-karpathy/SKILL.md`
- Read: `.agents/skills/xiyou-karpathy/references/completion-matrix.md`
- Read: `.agents/skills/xiyou-karpathy/references/asset-provenance.md`
- Read: `docs/superpowers/specs/2026-08-30-week-four-python-variable-overwrite-design.md`

- [ ] **Step 1: 核对 Git 身份、远端和已知文件**

Run:

```bash
pwd
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short --branch
git branch -avv --contains HEAD
git ls-remote origin refs/heads/codex/w3-m5-week-three-boss
git worktree list --porcelain
```

Expected: cwd/top-level 为 `.../b3d1/少儿编程学习网页`；HEAD 与远端均为 `5fcdc3ac...`；branch 为空；只出现规格和计划两个未跟踪文件。未知生产改动立即停止。

- [ ] **Step 2: 核对依赖但不安装**

Run:

```bash
test -d node_modules && echo node_modules=present || echo node_modules=missing
shasum -a 256 package-lock.json
node --version
npm --version
```

Expected: `node_modules=present`；lockfile hash 与 W4-M1 验证现场一致。缺失或漂移时停止，不执行安装。

- [ ] **Step 3: 记录完成和授权边界**

执行更新必须明确：目标最高 W4-M2 `One-level playable`；未获授权不 commit/push/deploy；W4-M3～M5 和所有周级/全站/商业/部署声明 `not complete`。

### Task 1: Course、预算、资产与 E2E source contract RED

**Files:**
- Modify: `src/course/course.test.ts`
- Modify: `src/progress/executableMissionIds.test.ts`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`
- Create: `scripts/check-week-four-variable-e2e-contract.mjs`
- Create: `scripts/check-week-four-variable-e2e-contract.test.mjs`
- Modify: `package.json`
- Modify: `playwright.config.ts`

- [ ] **Step 1: 写 formal/executable RED**

在 `src/course/course.test.ts` 增加：

```ts
it('registers W4-M2 as a formal Python variable task without legacy answers', () => {
  const mission = getMission('w4-m2');
  expect(mission).toBeDefined();
  expect(isFormalMissionOutline(getMissionOutline('w4-m2'))).toBe(true);
  expect(isExecutableMissionId('w4-m2')).toBe(true);
  expect(mission?.mode).toBe('python');
  expect(mission?.canon).toEqual(formalWeekFourCanon);
  expect(mission?.storyBeats.map((beat) => beat.summary).join('\n')).toContain('送斋女子');
  expect(mission?.storyBeats.map((beat) => beat.summary).join('\n')).not.toMatch(/老妇|老翁|骷髅|贬书/);
  expect(mission?.hints).toEqual({
    observe: '看看两次核验分别写进了哪只证据匣，哪一只后来没有留下记录。',
    think: '同一个变量再次赋值会覆盖旧值；两种事实需要各自保存。',
    partial: '检查第二行写入的目标变量，是否和这次火眼核验的事实类型相符。',
  });
  expect(mission).not.toHaveProperty('expectedSequence');
  expect(mission).not.toHaveProperty('expectedOutput');
  expect(mission).not.toHaveProperty('starterCode');
  for (const id of ['w4-m3', 'w4-m4', 'w4-m5']) {
    expect(isFormalMissionOutline(getMissionOutline(id))).toBe(false);
    expect(isExecutableMissionId(id)).toBe(false);
  }
});
```

在 `src/progress/executableMissionIds.test.ts` 把 `w4-m2` 加入 true 列表，并把 legacy false 列表改为 `w4-m3`～`w4-m5`。

- [ ] **Step 2: 写 bundle 与 asset RED**

在 bundle test 固定：

```js
assert.equal(bundleBudget.WEEK_FOUR_VARIABLE_COLD_LOAD_MAX_BYTES, 3 * 1024 * 1024);
assert.equal(
  bundleBudget.COLD_LOAD_ROUTE_CLOSURE_BUDGETS['src/components/WeekFourVariableEvidenceExperience.tsx'],
  3 * 1024 * 1024,
);
assert.equal(bundleBudget.PYTHON_RUNTIME_TRANSFER_MAX_BYTES, 15 * 1024 * 1024);
```

在 asset test 固定：

```js
const required = [
  'assets/week-four-variables/woman-with-offering.webp',
  'assets/week-four-variables/variable-record-states.webp',
];
assert.deepEqual(WEEK_FOUR_VARIABLE_REQUIRED_ASSETS, required);
assert.equal(WEEK_FOUR_VARIABLE_SCENE_SLOT, 'w4-m2 WeekFourVariableEvidenceScene');
assert.equal(WEEK_FOUR_SHARED_BACKGROUND_SLOT, 'w4-m1 WeekFourMappingScene; w4-m2 WeekFourVariableEvidenceScene');
```

测试必须要求 woman 1024×1024 + alpha、states 1536×512 + alpha、每张 ≤512 KiB、共享背景加两新图总量 ≤1.25 MiB、extra/missing/wrong-hash/wrong-slot 均失败。

- [ ] **Step 3: 写 E2E source contract RED**

新脚本导出 exact tags：

```js
export const W4_M2_TAGS = Object.freeze([
  '@w4-m2-full', '@w4-m2-keyboard', '@w4-m2-mouse', '@w4-m2-touch',
  '@w4-m2-accessibility', '@w4-m2-storage', '@w4-m2-corrupt',
  '@w4-m2-parent', '@w4-m2-work', '@w4-m2-python-security',
  '@w4-m2-cold', '@w4-m2-runtime-fault', '@w4-m2-asset-fault',
  '@w4-m2-narrow', '@w4-m2-external', '@w4-m2-lazy',
]);
```

`assertWeekFourVariableE2ESourceContract(source)` 必须用 TypeScript AST：

```js
const FORBIDDEN = /expectedSequence|expectedOutput|LegacyMissionBuilder|MissionTools|test\.skip|\.skip\s*\(/;
const DIRECT_W4_M2_WRITE = /(?:progress|next|state)\s*\.\s*(?:missions|sessions|missionCompletionEvidence|works)\s*\[\s*['"](?:w4-m2|w4-m2-variable-evidence-record)['"]\s*\]\s*=/;
```

并断言：

- 固定 SHA-256 的 `formalW4M1Prerequisite()` 只创建合法 W4-M1 formal state，不写 W4-M2；
- `@w4-m2-python-security` 启动 built module Worker、绑定 request ID、终止 Worker并证明 current/revision bytes 不变；
- cold probe 汇总 local closure 与五个同源 Pyodide response bytes，检查 3 MiB/15 MiB/20 秒/1 秒；
- 五类 storage、runtime、asset、lazy、CAS/corrupt 都包含精确 post-retry 断言；
- health array 不清空、不筛选、不跳过；browser evaluate callback 全部内联；
- `playwright.config.ts` 五项目包含规格中的 W4-M2 tags。

- [ ] **Step 4: 纳入 package script 与五项目 grep**

在 `package.json` 的 `test:bundle-script` 末尾加入：

```json
"scripts/check-week-four-variable-e2e-contract.test.mjs"
```

在 `playwright.config.ts` 精确加入：

```text
desktop-chromium-1440x1024: @w4-m2-(?:full|keyboard|mouse|touch|accessibility|storage|corrupt|parent|work|python-security|cold|runtime-fault|asset-fault|narrow|external|lazy)
tablet-webkit-768x1024: @w4-m2-full
mobile-chromium-390x844: @w4-m2-full | @w4-m2-touch
desktop-firefox-1440x1024: @w4-m2-full | @w4-m2-keyboard
narrow-chromium-320x844: @w4-m2-full | @w4-m2-touch | @w4-m2-narrow
```

- [ ] **Step 5: 运行 RED**

Run:

```bash
npm run test:unit -- src/course/course.test.ts src/progress/executableMissionIds.test.ts
npm run test:bundle-script
npm run test:assets
```

Expected: 只因 W4-M2 尚未 formal、预算 root/资产/E2E 文件不存在而失败；现有 W4-M1 和更早合同不得新增失败。

- [ ] **Step 6: 候选提交检查点（不执行）**

未来获授权后的候选消息：`test: lock W4-M2 variable evidence contracts`。

### Task 2: 变量 assignment/seal 合同 RED→GREEN

**Files:**
- Create: `src/engine/weekFourVariableContract.ts`
- Create: `src/engine/weekFourVariableContract.test.ts`

- [ ] **Step 1: 写默认覆盖与正确封存 RED**

```ts
import {
  runWeekFourVariableEvidence,
  type WeekFourVariableTraceItem,
} from './weekFourVariableContract';

it('turns the real missing identity NameError into a saved learning failure', () => {
  const trace: WeekFourVariableTraceItem[] = [
    { kind: 'assign', line: 1, target: 'appearance', source: 'ordinary-eyes', value: '送斋女子', previousValue: null, overwrote: false, span: { line: 1, from: 0, to: 10 } },
    { kind: 'assign', line: 2, target: 'appearance', source: 'fiery-eye-check', value: '白骨精', previousValue: '送斋女子', overwrote: true, span: { line: 2, from: 0, to: 10 } },
    { kind: 'seal', line: 3, executed: false, appearance: '白骨精', identity: null, missingVariable: 'identity', span: { line: 3, from: 0, to: 33 } },
  ];
  expect(runWeekFourVariableEvidence(trace)).toEqual({
    completed: false,
    finalState: 'evidence-unsealed',
    trace,
    sealedRecord: null,
    failureSnapshot: expect.objectContaining({ overwrittenVariable: 'appearance', missingVariable: 'identity' }),
    penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
  });
});

it('seals the two public facts only when both variables were really assigned', () => {
  const trace: WeekFourVariableTraceItem[] = [
    { kind: 'assign', line: 1, target: 'appearance', source: 'ordinary-eyes', value: '送斋女子', previousValue: null, overwrote: false, span: { line: 1, from: 0, to: 10 } },
    { kind: 'assign', line: 2, target: 'identity', source: 'fiery-eye-check', value: '白骨精', previousValue: null, overwrote: false, span: { line: 2, from: 0, to: 8 } },
    { kind: 'seal', line: 3, executed: true, appearance: '送斋女子', identity: '白骨精', missingVariable: null, span: { line: 3, from: 0, to: 33 } },
  ];
  expect(runWeekFourVariableEvidence(trace)).toMatchObject({
    completed: true,
    finalState: 'evidence-sealed',
    sealedRecord: { appearance: '送斋女子', identity: '白骨精' },
    failureSnapshot: null,
  });
});
```

- [ ] **Step 2: 实现公开类型和 runner**

`weekFourVariableContract.ts` 必须导出：

```ts
export type WeekFourVariableName = 'appearance' | 'identity';
export type WeekFourVariableEvidenceSource = 'ordinary-eyes' | 'fiery-eye-check';
export type WeekFourVariableValue = '送斋女子' | '白骨精';
export type WeekFourVariableState = 'evidence-ready' | 'evidence-unsealed' | 'evidence-sealed';

export const WEEK_FOUR_VARIABLE_EVIDENCE = Object.freeze({
  ordinaryEyes: { id: 'ordinary-eyes', value: '送斋女子' },
  fieryEyeCheck: { id: 'fiery-eye-check', value: '白骨精' },
} as const);

export type WeekFourVariableTraceItem =
  | { kind: 'assign'; line: 1 | 2; target: WeekFourVariableName; source: WeekFourVariableEvidenceSource; value: WeekFourVariableValue; previousValue: WeekFourVariableValue | null; overwrote: boolean; span: { line: 1 | 2; from: number; to: number } }
  | { kind: 'seal'; line: 3; executed: boolean; appearance: WeekFourVariableValue | null; identity: WeekFourVariableValue | null; missingVariable: 'identity' | null; span: { line: 3; from: 0; to: 33 } };

export interface WeekFourVariableFailureSnapshot {
  snapshotId: 'w4-m2:appearance-overwritten:identity-missing';
  overwrittenVariable: 'appearance';
  missingVariable: 'identity';
  firstValue: '送斋女子';
  overwrittenBy: '白骨精';
  causeLine: 2;
  sealLine: 3;
}

export interface WeekFourVariableRunResult {
  completed: boolean;
  finalState: 'evidence-unsealed' | 'evidence-sealed';
  trace: WeekFourVariableTraceItem[];
  sealedRecord: { appearance: '送斋女子'; identity: '白骨精' } | null;
  failureSnapshot: WeekFourVariableFailureSnapshot | null;
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

export function runWeekFourVariableEvidence(trace: WeekFourVariableTraceItem[]): WeekFourVariableRunResult;
```

runner 只接受精确三事件顺序、公开 source/value、真实 previous/overwrite、第三行 span 和零惩罚。当前唯一有效学习失败的 snapshot ID 精确为 `w4-m2:appearance-overwritten:identity-missing`，不含时间、随机数或运行环境 hash。

- [ ] **Step 3: 增加防伪与确定性测试**

`it.each` 覆盖：缺 assign、调换两行、错误 source/value、错误 previousValue、伪造 overwrote、成功时 `executed:false`、失败时 `executed:true`、缺失字段错误、额外事件、非零惩罚输入、重复运行不深相等。

- [ ] **Step 4: 运行 GREEN**

Run:

```bash
npm run test:unit -- src/engine/weekFourVariableContract.test.ts
```

Expected: PASS；默认精确为 `evidence-unsealed`，正确精确为 `evidence-sealed`。

- [ ] **Step 5: 候选提交检查点（不执行）**

候选消息：`feat: add W4-M2 variable evidence contract`。

### Task 3: 同步 grammar、真实 Worker 与 runner RED→GREEN

**Files:**
- Create: `src/engine/weekFourVariablePythonGrammar.ts`
- Create: `src/engine/weekFourVariablePythonGrammar.test.ts`
- Create: `src/engine/weekFourVariablePythonRunner.ts`
- Create: `src/engine/weekFourVariablePythonRunner.test.ts`
- Create: `src/workers/weekFourVariablePython.worker.ts`

- [ ] **Step 1: 写 exact grammar RED**

```ts
export const DEFAULT_WEEK_FOUR_VARIABLE_PYTHON = [
  'appearance = ordinary_eyes()',
  'appearance = fiery_eye_check()',
  'seal_record(appearance, identity)',
].join('\n');
export const SOLVED_WEEK_FOUR_VARIABLE_PYTHON = DEFAULT_WEEK_FOUR_VARIABLE_PYTHON.replace(
  'appearance = fiery_eye_check()',
  'identity = fiery_eye_check()',
);

it('derives the editable second-line span and real NameError semantics', () => {
  expect(parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON)).toMatchObject({
    target: 'appearance', sourceSpan: { line: 2, from: 0, to: 10 },
    run: { completed: false, finalState: 'evidence-unsealed' },
  });
});

it('derives the sealed canonical trace after the one allowed edit', () => {
  expect(parseWeekFourVariablePython(SOLVED_WEEK_FOUR_VARIABLE_PYTHON)).toMatchObject({
    target: 'identity', sourceSpan: { line: 2, from: 0, to: 8 },
    run: { completed: true, finalState: 'evidence-sealed' },
  });
});
```

拒绝表必须包含：`identity = ordinary_eyes()`、交换两行、错误 callback、错误 seal 参数、额外/缺少行、空行、缩进、import、attribute、subscript、dunder、print、if、while、def、CRLF 以外的语义漂移。CRLF 只规范化成 LF 后接受。

- [ ] **Step 2: 实现同步 exact grammar**

导出：

```ts
export interface ParsedWeekFourVariablePython {
  target: 'appearance' | 'identity';
  sourceSpan: { line: 2; from: 0; to: 10 | 8 };
  trace: WeekFourVariableTraceItem[];
  run: WeekFourVariableRunResult;
}
export function parseWeekFourVariablePython(code: string): ParsedWeekFourVariablePython;
```

实现只用三条 anchored regex/精确行比较，不用关键词黑名单；默认 trace 明确含真实 `NameError` 的 `seal.executed=false`，正确 trace 含 callback `executed=true`。

- [ ] **Step 3: 写 Worker/runner RED**

FakeWorker 测试覆盖：ready、load-error、request ID、默认 failure、correct success、cold timeout、warm timeout、cancel、dispose、late result、并发拒绝、grammar/Worker trace mismatch。

```ts
const runtime = createWeekFourVariablePythonRuntime({ coldTimeoutMs: 20_000, warmTimeoutMs: 1_000 });
await runtime.ready();
const result = await runtime.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);
expect(result.run.finalState).toBe('evidence-sealed');
runtime.cancel();
runtime.dispose();
```

- [ ] **Step 4: 实现逐行 AST 白名单和真实 exec**

Worker 从自身 `import.meta.url` 相对解析 `../runtime/pyodide-314.0.2/`。trusted Python harness 接收 `candidate_code` 参数，不把代码字符串插入 harness：

```python
tree = ast.parse(candidate_code, mode="exec")
validate_exact_three_statements(tree)
safe_globals = {
    "__builtins__": {},
    "ordinary_eyes": ordinary_eyes,
    "fiery_eye_check": fiery_eye_check,
    "seal_record": seal_record,
}
for index, statement in enumerate(tree.body):
    try:
        exec(compile(ast.Module(body=[statement], type_ignores=[]), "<w4-m2>", "exec"), safe_globals, safe_globals)
        record_actual_statement(index, statement, safe_globals)
    except NameError as error:
        if index != 2 or error.name != "identity":
            raise
        record_missing_identity_from_traceback(statement, safe_globals)
```

`validate_exact_three_statements` 必须逐行同构：第一行 `appearance=ordinary_eyes()`；第二行 target only appearance/identity + `fiery_eye_check()`；第三行 exact seal args。trusted callbacks 记录实际调用和值；不向 child code 暴露 `ast`、Pyodide、JS、文件或网络。

- [ ] **Step 5: 实现 runtime 对照和 timeout**

runner 在 postMessage 前调用 grammar；收到 Worker trace 后：

```ts
const canonical = parseWeekFourVariablePython(code);
if (!deeplyEqual(workerTrace, canonical.trace)) throw new WeekFourVariableRuntimeError('worker-contract-mismatch');
return { trace: structuredClone(workerTrace), run: structuredClone(canonical.run) };
```

同文件定义：

```ts
export type WeekFourVariableRuntimeErrorCode = 'load-error' | 'timeout' | 'cancelled' | 'worker-error' | 'worker-contract-mismatch';
export class WeekFourVariableRuntimeError extends Error {
  constructor(readonly code: WeekFourVariableRuntimeErrorCode, message = code) {
    super(message);
    this.name = 'WeekFourVariableRuntimeError';
  }
}
```

cold ready 20 秒，ready 后 run 1 秒。timeout/cancel/dispose 终止 Worker并标记需重建；迟到 request ID 忽略。

- [ ] **Step 6: 运行 GREEN 与 W4-M1 runtime 回归**

Run:

```bash
npm run test:unit -- \
  src/engine/weekFourVariableContract.test.ts \
  src/engine/weekFourVariablePythonGrammar.test.ts \
  src/engine/weekFourVariablePythonRunner.test.ts \
  src/engine/weekFourPythonMappingGrammar.test.ts \
  src/engine/weekFourPythonMappingRunner.test.ts
```

Expected: PASS；W4-M1 grammar/runner 行为不变。

- [ ] **Step 7: 候选提交检查点（不执行）**

候选消息：`feat: add restricted W4-M2 Python runtime`。

### Task 4: Revision 9 session、work、proof 与 migration RED→GREEN

**Files:**
- Modify: `src/progress/types.ts`
- Create: `src/progress/weekFourVariableSession.ts`
- Create: `src/progress/weekFourVariableSessionSchema.ts`
- Create: `src/progress/weekFourVariableSession.test.ts`
- Modify: `src/progress/session.ts`
- Modify: `src/progress/session.test.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/schema.test.ts`

- [ ] **Step 1: 写 session 更新 RED**

```ts
const session = createWeekFourVariableSession(NOW);
expect(session).toMatchObject({
  pythonCode: DEFAULT_WEEK_FOUR_VARIABLE_PYTHON,
  lastRun: null,
  totalRuns: 0,
  overwriteFailures: 0,
});

const canonical = parseWeekFourVariablePython(session.pythonCode);
const failed = recordWeekFourVariableRun(session, {
  canonicalTrace: canonical.trace,
  workerTrace: canonical.trace,
  run: canonical.run,
}, LATER);
expect(failed).toMatchObject({
  totalRuns: 1,
  overwriteFailures: 1,
  lastRun: { finalState: 'evidence-unsealed' },
});
```

再测试：edit 清旧证据；validation +1 不加 total；load infra +1 不加 total；timeout executionStarted=true 同时 total+1/infra+1；观察 snapshot 去重；hint 去重；safe integer 和 ISO 拒绝。

- [ ] **Step 2: 增加 exact revision-9 类型**

`src/progress/types.ts` 增加：

```ts
export interface WeekFourVariableMissionSession {
  lastTrace: [];
  runtimeFailures: 0;
  compileFailures: 0;
  pythonCode: string;
  pythonSourceSpan: { line: 2; from: 0; to: 8 | 10 };
  lastCanonicalTrace: WeekFourVariableTraceItem[];
  lastWorkerTrace: WeekFourVariableTraceItem[];
  lastRun: WeekFourVariableRunResult | null;
  failureSnapshot: WeekFourVariableFailureSnapshot | null;
  conditionObservationUses: Array<{ snapshotId: string; usedAt: string; pythonCode: string }>;
  totalRuns: number;
  overwriteFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  conceptFailures: { variableOverwrite: number; programStructure: number; safeExecution: number; completeness: number };
  lastRunAt: string | null;
  savedAt: string;
}

export type WeekFourVariableCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }
  | { kind: 'formal-v3'; completedAt: string; verifiedAt: string; pythonCode: string; canonicalTrace: WeekFourVariableTraceItem[]; workerTrace: WeekFourVariableTraceItem[]; run: WeekFourVariableRunResult; workId: 'w4-m2-variable-evidence-record' };

export interface WeekFourVariableWorkV1 {
  kind: 'python-variable-evidence-v1';
  workId: 'w4-m2-variable-evidence-record';
  missionId: 'w4-m2';
  title: '第一次变化变量取证记录';
  pythonCode: string;
  canonicalTrace: WeekFourVariableTraceItem[];
  workerTrace: WeekFourVariableTraceItem[];
  run: WeekFourVariableRunResult;
  createdAt: string;
  verifiedAt: string;
}
```

`ProgressV3.schemaRevision` 改为 `3 | 4 | 5 | 6 | 7 | 8 | 9`；`MissionSessionById`、`MissionCompletionEvidenceV1`、`works` 和 `ExecutableMissionId` 加入 exact W4-M2 keys。

- [ ] **Step 3: 实现独立 session API**

导出：

```ts
createWeekFourVariableSession(now)
updateWeekFourVariableCode(session, code, now)
recordWeekFourVariableRun(session, value, now)
recordWeekFourVariableValidationFailure(session, now)
recordWeekFourVariableInfrastructureFailure(session, { executionStarted }, now)
recordWeekFourVariableObservation(session, now)
recordWeekFourVariableHint(session, tier, now)
```

`recordWeekFourVariableRun` 必须从 session code 重跑 grammar，逐字段比对 canonical/Worker trace/run；失败 run 增加 `overwriteFailures` 和 `conceptFailures.variableOverwrite`。`updateCode` 使用 grammar 并清除 last trace/run/failure/time，不清累计计数和历史 observation。

- [ ] **Step 4: 写 exact parser 与 migration RED**

测试必须覆盖：

```ts
expect(migrateProgress(revision8WithFormalW4M1AndLegacyW4M2())).toMatchObject({
  schemaRevision: 9,
  missionCompletionEvidence: {
    'w4-m1': { kind: 'formal-v3' },
    'w4-m2': { kind: 'legacy-replay-only', sourceVersion: 3, sourceSchemaRevision: 8 },
  },
});
```

并覆盖 V1、V2、V3 r1～r8；旧 W4-M2 不造 session/work；pre-r9 W4-M2 session/work 拒绝；未知 keys、伪造 code/span/trace/run/work/time/proof、orphan work 拒绝；migrate twice 幂等。

- [ ] **Step 5: 实现 parser 与 schema revision 9**

`weekFourVariableSessionSchema.ts` exact sets：

```ts
const sessionKeys = new Set([
  'lastTrace', 'runtimeFailures', 'compileFailures', 'pythonCode', 'pythonSourceSpan',
  'lastCanonicalTrace', 'lastWorkerTrace', 'lastRun', 'failureSnapshot',
  'conditionObservationUses', 'totalRuns', 'overwriteFailures', 'validationFailures',
  'runnerInfrastructureFailures', 'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt',
]);
const workKeys = new Set(['kind', 'workId', 'missionId', 'title', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'createdAt', 'verifiedAt']);
const formalEvidenceKeys = new Set(['kind', 'completedAt', 'verifiedAt', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'workId']);
```

从 code 调 grammar，重建 trace/run，逐字段比对。`schema.ts`：

- 接受 revision 1～9，统一输出 9；
- revision <9 禁止 W4-M2 session/work/formal proof；
- revision9 `works` 只允许两个 exact IDs；
- observation ability 聚合加入 W4-M1 + W4-M2 audits；
- W4-M1 parser 和 work 语义保持不变。

- [ ] **Step 6: 运行 GREEN 与全部 migration 回归**

Run:

```bash
npm run test:unit -- \
  src/progress/weekFourVariableSession.test.ts \
  src/progress/weekFourMappingSessionSchema.test.ts \
  src/progress/session.test.ts \
  src/progress/schema.test.ts
```

Expected: PASS；revision 1～9 幂等迁移，W4-M1 formal work/proof 不漂移。

- [ ] **Step 7: 候选提交检查点（不执行）**

候选消息：`feat: add revision 9 W4-M2 sessions and works`。

### Task 5: Completion、unlock、parent、Context 与 fault adapter RED→GREEN

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

- [ ] **Step 1: 写 formal completion 与历史 unlock RED**

测试 fixture 只能用真实 API 构造 W4-M1 formal 前置和成功 W4-M2 session：

```ts
const completed = completeMission(withSuccessfulW4M2(withFormalW4M1()), 'w4-m2', { stars: 3, hintsUsed: 0 });
expect(completed.missionCompletionEvidence['w4-m2']).toMatchObject({
  kind: 'formal-v3', workId: 'w4-m2-variable-evidence-record',
});
expect(completed.works['w4-m2-variable-evidence-record']).toMatchObject({
  kind: 'python-variable-evidence-v1', missionId: 'w4-m2',
});
expect(isMissionUnlocked(completed, 'w4-m3')).toBe(true);
```

再断言：bare/legacy W4-M1 不进入正式 M2；M2 legacy marker 保留历史页和 M3 legacy access；M2 formal 才是新 M3 前置；历史 formal upgrade 保留 completedAt、增加 verifiedAt、不重复 attempts/work；错误/默认 code、缺 work、伪造 trace/run 不能 complete。

- [ ] **Step 2: 实现 formal evidence/work 事务**

`formalWeekFourVariableCompletion(progress, completedAt, verifiedAt)` 必须：

1. 读取 `sessions['w4-m2']`；
2. 从 code 同步 grammar 重建 canonical；
3. 要求 lastCanonical/lastWorker/lastRun 与 canonical 完全相等且 `evidence-sealed`；
4. 构造 exact work 和 formal evidence；
5. `completeMission` 在同一返回对象写 mission/evidence/work，不授予奖励；
6. legacy upgrade 保留原 completedAt 和更高 stars。

- [ ] **Step 3: 实现 unlock 与历史页面判定 helper**

新增纯函数：

```ts
export function getWeekFourVariableAccess(progress: ProgressV3):
  | { kind: 'locked' }
  | { kind: 'historical-read-only' }
  | { kind: 'formal'; upgradingLegacy: boolean };
```

规则：W4-M1 formal → formal；仅 W4-M2 legacy → historical-read-only；否则 locked。`isMissionUnlocked('w4-m2')` 接受 formal 或 historical；`isMissionUnlocked('w4-m3')` 接受 W4-M2 formal 或 legacy compatibility marker，不接受 bare completion。

- [ ] **Step 4: 增加 Context typed CAS 写入口**

`ProgressContextValue` 增加：

```ts
saveWeekFourVariableDraft(code): Promise<SaveResult>
saveWeekFourVariableRun(update): Promise<SaveResult>
saveWeekFourVariableObservation(): Promise<SaveResult>
saveWeekFourVariableInfrastructureFailure(input): Promise<SaveResult>
completeWeekFourVariable(): Promise<SaveResult>
```

每个入口基于 `updateProgressWithCas` 和返回 revision；过期结果不能覆盖新 code。work+proof+completion 只通过 `completeMission` 一次写入。

- [ ] **Step 5: 实现 exact fault deltas**

fault union 加入：

```ts
type WeekFourVariableFaultMode =
  | 'fail-w4-m2-draft' | 'fail-w4-m2-run' | 'fail-w4-m2-observation'
  | 'fail-w4-m2-work' | 'fail-w4-m2-completion';
```

adapter 分别验证：draft only code；run only last trace/run/counters；observation only audit；completion exact mission+evidence+work、ability/equipment 不变。任何 extra delta 拒绝。E2E adapter 同步相同逻辑。

E2E test-only setup IDs 另用冻结对象，不能进入正常 UI：

```ts
export const W4_M2_TEST_FAULT_IDS = Object.freeze({
  runtimeLoad: 'fail-w4-m2-runtime-load',
  runtimeTimeout: 'fail-w4-m2-runtime-timeout',
  assets: 'fail-w4-m2-assets',
  lazy: 'fail-w4-m2-lazy',
  staleWriter: 'fail-w4-m2-cas-stale-writer',
  corruptCurrent: 'fail-w4-m2-corrupt-current',
} as const);
```

source contract 必须证明这些 ID 只用于构造对应失败，不能直接写 mission/session/evidence/work 或返回 synthetic success。

- [ ] **Step 6: 增加 parent summary 与 clear 测试**

`WeeklyReport.weekFourVariables`：

```ts
{
  runs: number;
  overwriteFailures: number;
  validationFailures: number;
  infrastructureFailures: number;
  observations: number;
  workSaved: boolean;
  proof: 'formal-v3' | 'legacy-replay-only' | 'none';
  completedAt: string | null;
}
```

Parent UI 不渲染完整 code、`appearance`、`identity`、source line、trace、work ID 或答案值。clear 测试要求删除 W4-M2 session/work/evidence/mission/unlock，但保留现有 privacy/settings 合同字段。

- [ ] **Step 7: 运行 GREEN**

Run:

```bash
npm run test:unit -- \
  src/progress/progress.test.ts \
  src/context/ProgressContext.test.tsx \
  src/progress/storageFaultAdapter.test.ts \
  src/components/ParentEquipmentReport.test.tsx
```

Expected: PASS；历史/正式路径、五写入故障、parent 与 clear 全部精确。

- [ ] **Step 8: 候选提交检查点（不执行）**

候选消息：`feat: persist W4-M2 variable proof and parent summary`。

### Task 6: Formal course、Editor、Scene 与历史 route RED→GREEN

**Files:**
- Modify: `src/course/formalCourse.ts`
- Modify: `src/course/courseOutline.ts`
- Modify: `src/course/course.ts`
- Modify: `src/progress/executableMissionIds.ts`
- Create: `src/components/WeekFourVariableEvidencePythonEditor.tsx`
- Create: `src/components/WeekFourVariableEvidencePythonEditor.test.tsx`
- Create: `src/components/WeekFourVariableEvidenceScene.tsx`
- Create: `src/components/WeekFourVariableEvidenceScene.test.tsx`
- Create: `src/components/WeekFourVariableAccessNotice.tsx`
- Create: `src/components/WeekFourVariableAccessNotice.test.tsx`
- Create: `src/components/WeekFourVariableEvidenceRoute.test.tsx`
- Modify: `src/components/MissionPageContent.tsx`

- [ ] **Step 1: 写 Editor/Scene/route RED**

Editor test：

```tsx
render(<WeekFourVariableEvidencePythonEditor
  code={DEFAULT_WEEK_FOUR_VARIABLE_PYTHON}
  sourceSpan={{ line: 2, from: 0, to: 10 }}
  disabled={false}
  onCodeChange={onCodeChange}
  onReady={() => {}}
  onError={() => {}}
/>);
fireEvent.change(screen.getByRole('combobox', { name: '第二次核验写入哪个变量' }), { target: { value: 'identity' } });
expect(onCodeChange).toHaveBeenCalledWith(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);
expect(screen.getByLabelText('W4-M2 Python 代码')).toHaveTextContent('identity = fiery_eye_check()');
```

还要断言 Enter/Space 走同一 transaction；第一/第三行不可编辑；code/span 不匹配显示恢复错误；disabled 锁定所有输入。

Scene test 断言：两项公开证据、三个 `data-state-cell`、共享背景和两新资产 exact path、失败/成功只来自 props events、固定安全尾声无老妇/老翁/攻击/骷髅、mute/reduced motion 不改变 events。

Route test 断言：locked、historical-read-only、formal-upgrade 三分支；历史只读不 mount Worker/Experience；W4-M1 review 仍无按钮/回调。

AccessNotice test 断言 locked 文案要求先完成 W4-M1，historical 文案为“历史记录已保留”，两者只有返回 W4-M1 的链接，没有运行、编辑、复制、自动填入或完成按钮。

- [ ] **Step 2: 正式化课程与显式 hints**

在 `courseOutline.ts`：

```ts
export type FormalMissionExtension = MissionPresentationExtension & { hints?: HintSet };

export function deriveFormalMissionFromOutline(id: string, extension: FormalMissionExtension): FormalMissionSpec {
  const outline = getMissionOutline(id);
  if (!outline || !isFormalMissionOutline(outline)) throw new Error(`Unknown formal course outline mission: ${id}`);
  return { ...outline, ...extension, hints: extension.hints ?? deriveHints(extension, extension.storyBeats.length) };
}
```

`isFormalMissionOutline` 加 `w4-m2`。在 `formalCourse.ts` 保留现有 `formalMission`，新增：

```ts
const formalPythonMission = (id: string, extension: Omit<FormalMissionExtension, 'mode'>): FormalMissionSpec =>
  deriveFormalMissionFromOutline(id, { ...extension, mode: 'python' });
```

W4-M2：

```ts
formalPythonMission('w4-m2', {
  subtitle: '两只证据匣，别让变量被覆盖',
  objective: '让外形和身份分别保存在正确的 Python 变量中',
  canon: formalWeekFourCanon,
  storyBeats: [
    beat('送斋女子来到白虎岭', '白骨精第一次变作送斋女子，携香米饭与炒面筋接近师徒。'),
    beat('悟空识破第一次变化', '悟空以火眼金睛识破；变化者借法脱身，山岭疑云仍未散去。'),
  ],
  hints: {
    observe: '看看两次核验分别写进了哪只证据匣，哪一只后来没有留下记录。',
    think: '同一个变量再次赋值会覆盖旧值；两种事实需要各自保存。',
    partial: '检查第二行写入的目标变量，是否和这次火眼核验的事实类型相符。',
  },
});
```

从 `course.ts` 删除唯一 W4-M2 legacy `mission(...)` 行；W4-M3～M5 字节语义不变。`executableMissionIds.ts` 加 W4-M2。

- [ ] **Step 3: 实现真实 CodeMirror Editor**

复用 W4-M1 CodeMirror 依赖但创建独立组件。mount 时 parse code；document 只允许 sourceSpan transaction。combobox `appearance|identity` 调用：

```ts
const replacement = target;
view.dispatch({ changes: { from: lineTwo.from, to: lineTwo.to, insert: replacement } });
onCodeChange(view.state.doc.toString());
```

CodeMirror `transactionFilter` 拒绝任何越过第二行 span 的变化；普通 UI 不维护另一个 target state。onReady/onError 只报告资源状态，不改 Progress。

- [ ] **Step 4: 实现 Scene**

props 固定：

```ts
interface WeekFourVariableEvidenceSceneProps {
  state: 'ready' | 'unsealed' | 'sealed';
  events: WeekFourVariableTraceItem[];
  muted: boolean;
  reducedMotion: boolean;
  showCanonEpilogue: boolean;
  onAssetsReady(): void;
  onAssetsError(message: string): void;
}
```

Scene 使用 `assetUrl` 加载：

```ts
const BACKGROUND = 'assets/week-four-mapping/white-tiger-ridge-background.webp';
const WOMAN = 'assets/week-four-variables/woman-with-offering.webp';
const STATES = 'assets/week-four-variables/variable-record-states.webp';
```

`sealed`、尾声和状态 cell 只来自已保存 run/events props；Scene 无 completion callback、无正确 target、无 hidden state。

- [ ] **Step 5: 实现 MissionPage route 三分支**

新增 lazy imports 和局部 boundary。W4-M2 分支：

```tsx
const access = getWeekFourVariableAccess(progress);
if (access.kind !== 'formal') return <WeekFourVariableAccessNotice kind={access.kind} />;
return <WeekFourVariableEvidenceExperience upgradingLegacy={access.upgradingLegacy} />;
```

在正式 Experience 上方保留：

```tsx
<WeekFourMappingWorkReview work={progress.works['w4-m1-first-python-mapping']} />
```

历史只读页不创建 session、不显示运行按钮，提供返回 W4-M1 的链接。

`WeekFourVariableAccessNotice` 只接收 `kind: 'locked' | 'historical-read-only'`，渲染固定说明和 `#/mission/w4-m1` 链接；不接收 progress、work 或 callback。

- [ ] **Step 6: 运行 GREEN**

Run:

```bash
npm run test:unit -- \
  src/course/course.test.ts \
  src/progress/executableMissionIds.test.ts \
  src/components/WeekFourVariableEvidencePythonEditor.test.tsx \
  src/components/WeekFourVariableEvidenceScene.test.tsx \
  src/components/WeekFourVariableAccessNotice.test.tsx \
  src/components/WeekFourVariableEvidenceRoute.test.tsx \
  src/components/WeekFourMappingWorkReview.test.tsx
npm run typecheck
```

Expected: PASS；W4-M1 和 W4-M3～M5 无回归。

- [ ] **Step 7: 候选提交检查点（不执行）**

候选消息：`feat: add W4-M2 formal Python evidence UI`。

### Task 7: Experience 保存优先状态机与响应式 RED→GREEN

**Files:**
- Create: `src/components/WeekFourVariableEvidenceExperience.tsx`
- Create: `src/components/WeekFourVariableEvidenceExperience.test.tsx`
- Create: `src/components/WeekFourVariableEvidenceExperience.css`
- Modify: `src/components/MissionPageContent.css`

- [ ] **Step 1: 写完整一局 RED**

Testing Library 顺序：创建/保存默认 session → Worker 默认 run → 保存 `evidence-unsealed` → 显示覆盖反馈 → 保存 observation 且 code/run 深相等 → selector 改 `identity` → 保存新 code并清旧证据 → Worker 成功 → 保存 run → assets ready → atomic work/proof/completion → 尾声/成功 dialog。

核心断言：

```ts
expect(savedFailure.sessions['w4-m2']?.lastRun?.finalState).toBe('evidence-unsealed');
expect(savedFailure.sessions['w4-m2']?.overwriteFailures).toBe(1);
expect(savedFailure.missions['w4-m2']).toBeUndefined();
expect(savedSuccess.works['w4-m2-variable-evidence-record']?.run.finalState).toBe('evidence-sealed');
expect(savedSuccess.missionCompletionEvidence['w4-m2']?.kind).toBe('formal-v3');
expect(isMissionUnlocked(savedSuccess, 'w4-m3')).toBe(true);
```

- [ ] **Step 2: 写五写入故障和异步 RED**

每个 fault 精确断言规格中的不变/变更字段。另覆盖：double click 一个 request；编辑 cancel 旧 Worker；late result 忽略；runtime load totalRuns=0/infra=1；timeout started totalRuns=1/infra=1；asset/lazy 不完成；资源恢复不重跑 Worker；completion retry 只发布一次；reload 恢复 code/run/work。

- [ ] **Step 3: 实现保存优先状态机**

Experience 只保存 pending UI，不把 React state 当成功事实：

```ts
const draft = await saveWeekFourVariableDraft(code);
if (draft.status !== 'saved') return showRetry('draft');
const savedCode = draft.progress.sessions['w4-m2']!.pythonCode;
const runtimeResult = await runtime.run(savedCode);
const runSave = await saveWeekFourVariableRun(runtimeResult);
if (runSave.status !== 'saved') return showRetry('run');
if (!runtimeResult.run.completed) return showSavedFailure(runtimeResult.run);
if (!assetsReadyRef.current) return showRetry('assets');
const completion = await completeWeekFourVariable();
if (completion.status !== 'saved') return showRetry('completion');
showSavedSuccess(completion.progress);
```

`show*` 只改本地 UI；所有 Progress 写入经 Context CAS API。

- [ ] **Step 4: 实现火眼金睛和 retry**

观察只读当前已保存 failure snapshot；显示两次目标、实际值、覆盖、缺失变量和来源行，不出现“改成 identity”。observation save 成功才打开；编辑后关闭。runtime/asset/lazy retry 使用保存 code/run，不重新构造成功或写计数。

- [ ] **Step 5: 实现响应式 CSS 与语义**

1440：scene/editor 两列；≤900：scene → evidence → review → editor → boxes → feedback；320/390 无 min-width/overflow。添加 `:focus-visible`、`role=status/alert/dialog`、非颜色标签、`prefers-reduced-motion`。运行中/保存中禁用 selector、hint、run；取消保持可访问。

- [ ] **Step 6: 运行 GREEN**

Run:

```bash
npm run test:unit -- \
  src/components/WeekFourVariableEvidenceExperience.test.tsx \
  src/components/WeekFourVariableEvidenceRoute.test.tsx \
  src/responsive.test.tsx
npm run typecheck
```

Expected: PASS；五写入故障和异步边界无半发布。

- [ ] **Step 7: 候选提交检查点（不执行）**

候选消息：`feat: add save-first W4-M2 variable experience`。

### Task 8: 正式素材、manifest 与 visual QA

**Files:**
- Create: `public/assets/week-four-variables/woman-with-offering.webp`
- Create: `public/assets/week-four-variables/variable-record-states.webp`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`

- [ ] **Step 1: 读取 imagegen skill**

实施回合先完整读取 `/Users/macmini-zz/.codex/skills/.system/imagegen/SKILL.md`。生成动作由内建 image generation 执行；不得用 CSS/SVG/代码绘图补艺术内容。

- [ ] **Step 2: 生成送斋女子 RGBA 源图**

使用 exact prompt：

```text
Use case: illustration-story
Asset type: W4-M2 第一次变化儿童 Python 变量关卡的透明人物素材
Primary request: 明亮精致的3D中国儿童绘本风格，一位端庄成年的山中女子，双手携带绿色食物器皿和素斋篮，作为白虎岭公开“普通观察”证据。
Subject: 全身或接近全身的三分之四视角，衣着完整朴素、神情平和，器皿清楚但没有可读文字；不表现妖怪本相。
Style/medium: polished bright 3D Chinese children's storybook game character, jade green, warm ivory, soft gold, restrained cinnabar accents, rounded readable forms.
Composition/framing: square 1:1 transparent canvas, centered subject, generous transparent padding, readable at mobile size.
Lighting/mood: gentle daylight, curious but safe, never seductive or frightening.
Constraints: RGBA transparent background, no text, no letters, no pseudo-writing, no logo, no watermark, no UI, no weapon, no attack, no injury, no corpse, no skeleton, no horror, no sexualized pose, no exposed chest, no child character, no old woman, no old man.
```

接受源图后仅技术转换成 1024×1024 alpha WebP，≤512 KiB。

- [ ] **Step 3: 生成三格变量匣 RGBA 源图**

```text
Use case: illustration-story
Asset type: W4-M2 等待记录、覆盖失败、分别封存三态透明横向 sprite
Primary request: 明亮精致的3D中国儿童绘本风格，一张精确3:1透明横向三格状态图，左中右各一个互不重叠的方形单元：两只空的证据匣等待记录；同一只外形匣被两束光连续写入而另一只匣为空；两只匣分别封存一束证据光并形成完整记录。
Subject: 使用两只造型不同但无文字的玉石证据匣、普通观察暖金光和火眼核验朱金光；不能出现代码、变量名或答案文字。
Style/medium: polished bright 3D Chinese children's storybook game props, jade green, warm ivory, soft gold, restrained cinnabar.
Composition/framing: exact 3:1 transparent strip, three equal non-overlapping cells, identical camera and scale, generous alpha padding, readable when CSS crops one cell on mobile.
Lighting/mood: patient learning, clear mistake, confident completion.
Constraints: RGBA transparent background, no text, no letters, no Chinese characters, no pseudo-writing, no emoji, no logo, no watermark, no character, no weapon, no attack, no injury, no corpse, no skeleton, no horror.
```

接受后仅 resize/alpha-preserving WebP 编码为 1536×512；三格边界 0–511、512–1023、1024–1535；≤512 KiB。

- [ ] **Step 4: 原尺寸检查与 manifest**

用 `view_image` 原尺寸检查，不通过则重新生成，不用代码改艺术。manifest 新增两个 prompt IDs `W4M2-001`、`W4M2-002`，记录生成 tool/result reference、完整 prompt、处理、SHA-256、尺寸、alpha、license/provenance、slot `w4-m2 WeekFourVariableEvidenceScene`。共享背景行 slot 更新为：

```text
w4-m1 WeekFourMappingScene; w4-m2 WeekFourVariableEvidenceScene
```

`scripts/check-asset-manifest.mjs` 导出并使用：

```js
export const WEEK_FOUR_VARIABLE_REQUIRED_ASSETS = Object.freeze([
  'assets/week-four-variables/woman-with-offering.webp',
  'assets/week-four-variables/variable-record-states.webp',
]);
export const WEEK_FOUR_VARIABLE_SCENE_SLOT = 'w4-m2 WeekFourVariableEvidenceScene';
export const WEEK_FOUR_SHARED_BACKGROUND_SLOT = 'w4-m1 WeekFourMappingScene; w4-m2 WeekFourVariableEvidenceScene';
```

- [ ] **Step 5: 运行资产门禁**

Run:

```bash
file public/assets/week-four-variables/*.webp
du -b public/assets/week-four-variables/*.webp
shasum -a 256 public/assets/week-four-variables/*.webp
npm run check:assets
npm run test:assets
```

Expected: exact 2 新文件、尺寸/alpha/hash/slot/字节通过；共享背景唯一文件、双 live slot。五项目截图人工通过后才把 QA 改 `visual-qa-passed` 并运行 `npm run verify:assets`。

- [ ] **Step 6: 候选提交检查点（不执行）**

候选消息：`feat: add verified W4-M2 story assets`。

### Task 9: 五项目 E2E、安全、恢复与性能 RED→GREEN

**Files:**
- Create: `e2e/week-four-python-variable-overwrite.spec.ts`
- Modify: `scripts/check-week-four-variable-e2e-contract.mjs`
- Modify: `scripts/check-week-four-variable-e2e-contract.test.mjs`
- Modify: `scripts/check-bundle-budget.mjs`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `playwright.config.ts`
- Modify: `package.json`

- [ ] **Step 1: 写唯一合法 W4-M1 formal prerequisite helper**

helper 用真实 W4-M1 session/grammar/run/complete API 生成 formal prerequisite，函数体固定 SHA-256。source contract 禁止 helper 出现 W4-M2 session/evidence/work/completion 或直接 storage 写入。

- [ ] **Step 2: 写五项目孩子主路径**

`@w4-m2-full` 只用可见 UI：进入 → 可选打开 W4-M1 只读作品并证明无按钮/副作用 → 默认运行 → 保存 `evidence-unsealed` → 火眼观察且 code/run 输入不变 → selector 改 identity → Worker 完整成功 → work/proof/completion → 安全尾声 → refresh 只读 replay → 文件 chooser export/import → parent summary → W4-M3 入口。

禁止 `page.evaluate` 写 W4-M2 success；setup 只允许固定 W4-M1 formal helper。

- [ ] **Step 3: 写输入和可访问性路径**

- `@w4-m2-mouse`：真实 select/click 修改 CodeMirror text；
- `@w4-m2-touch`：touchscreen tap 修改同一 text；
- `@w4-m2-keyboard`：Tab + Enter/Space 完整成功；
- `@w4-m2-accessibility`：role/name/live-region/focus/dialog、失败后 focus 和纯键盘；
- `@w4-m2-narrow`：320/390/768/1440 无 overflow，scene/editor/boxes/feedback 可读。

- [ ] **Step 4: 写五类 storage、CAS、corrupt、parent/work**

每类测试名称包含 `@w4-m2-storage <mode>` 并断言 spec exact delta。`@w4-m2-external` 使用两个 page context 证明 stale writer 失败和显式载入；`@w4-m2-corrupt` 下载 byte-identical 损坏 current，再恢复 snapshot/replay；`@w4-m2-parent @w4-m2-work` 验证 structured output、timestamps、无答案泄漏、clear 删除全部 W4-M2 数据。

测试精确使用 `fail-w4-m2-cas-stale-writer` 与 `fail-w4-m2-corrupt-current`，禁止临时别名。

- [ ] **Step 5: 写 built Worker 安全 probe**

`@w4-m2-python-security` 从 performance resources 找 built `weekFourVariablePython.worker-*`，逐个发送 syntax/import/open/from js/attribute/subscript/eval/dunder/if/while/def/无限循环/错序 code，绑定 request ID，期望 error 或 timeout，终止 Worker。probe 前后 current/revision bytes 深相等。

- [ ] **Step 6: 写 runtime/asset/lazy fault 与 cold probe**

- `fail-w4-m2-runtime-load` 503：infra=1,total=0，无 work/proof；retry 默认学习失败 total=1；
- `fail-w4-m2-runtime-timeout`：started total=1,infra=1，无 overwrite/attempts；
- `fail-w4-m2-assets` / `fail-w4-m2-lazy`：无 completion；retry 读保存 run，不重跑 Worker；
- cold desktop：汇总 W4-M2 local closure≤3MiB、五 runtime response≤15MiB、10Mbps/4× cold≤20s、warm≤1s，附 named metrics；
- 404/page health/console/request failures 全部 fail closed。

- [ ] **Step 7: 运行 source contract 与 W4-M2 矩阵**

Run:

```bash
npm run test:bundle-script
npm run build:e2e
npm run test:e2e -- e2e/week-four-python-variable-overwrite.spec.ts
```

Expected: source contract PASS；五项目所有映射 PASS，0 flaky、0 允许的 runtime/network failure。记录实际测试/项目映射数量，不预写数字。

- [ ] **Step 8: 运行 W4-M1 与 W1～W3 关键正式回归**

Run:

```bash
npm run test:e2e -- \
  e2e/week-four-blockly-python-mapping.spec.ts \
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

Expected: W4-M1 与全部相关正式路径 PASS；任何失败先按路径归属，不用历史数字代替新结果。

- [ ] **Step 9: 候选提交检查点（不执行）**

候选消息：`test: verify W4-M2 browser and security loop`。

### Task 10: 全量验证、视觉验收和证据文档

**Files:**
- Create: `docs/verification/week-four-python-variable-overwrite.md`
- Modify: `docs/assets/asset-manifest.md`（仅新鲜视觉证据齐全后更新 QA）

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

Expected: 全部 PASS；记录真实 test files/tests/source contracts、build、bundle、runtime 和 asset 数字。

- [ ] **Step 2: 运行全站 E2E 审计**

Run:

```bash
npm run test:e2e
```

Expected: 记录 total/expected/unexpected/flaky。任何 W4、Progress、parent、storage、shared route 新回归阻断 W4-M2 `One-level playable`；既有失败逐项分类，不能静默忽略。

- [ ] **Step 3: 完成五项目视觉验收**

在 1440 Chromium、768 WebKit、390 mobile Chromium、1440 Firefox、320 narrow 检查：共享背景、女子裁切、三态 alpha、CodeMirror/selector、失败/成功、焦点、对比度、无 overflow、mute/reduced motion。原尺寸确认无伪字、性化、攻击、老妇/老翁/骷髅后，manifest 两新行改 `visual-qa-passed` 并重跑 `verify:assets`。

- [ ] **Step 4: 写 verification 文档**

必须包含：cwd/HEAD/remote/worktree、实现范围、真实孩子路径、NameError 学习失败、Worker 安全、revision 9/works/migration、五写入故障/CAS/corrupt/clear、五项目数字、性能 bytes/timing、asset hashes/QA、W4-M1/W1～W3 回归、全站失败分类、completion matrix 逐格、残余风险和未验证的真实屏幕阅读器/部署。

- [ ] **Step 5: 主代理独立审查 diff**

逐文件核对：无 expectedOutput/sequence、stdout 成功、React/DOM/Scene 第二真源、直接 storage 完成、W4-M1 污染、W4-M3～M5 意外 formal、历史访问丢失、runtime 复制、资产捷径或 test injection。

只有全部 mandatory evidence 齐全才报告 W4-M2 `One-level playable`；否则报告 `not complete` 和下一阻塞。

- [ ] **Step 6: 授权边界收尾**

Run:

```bash
git status --short --branch
git diff --stat
git diff --check
```

Expected: 只有规格、计划和 W4-M2 聚焦改动；不 commit、不 push、不 deploy。未来若用户明确授权提交，再重新检查 author、diff 和测试证据。

## 计划自检

- 规格中的三行默认代码、真实 NameError、`evidence-unsealed`、identity 修正、structured trace 和 `evidence-sealed` 均有 RED→GREEN 任务。
- Worker AST 与同步 grammar 逐行同构；导入防伪与玩家真实运行职责分离。
- revision 9、V1/V2/V3-r1～r8 provenance、W4-M1 formal 前置、历史只读、W4-M3 compatibility、work/proof/parent/clear 全部有 exact 类型和测试。
- draft/run/observation/work/completion、runtime load/timeout、asset/lazy、CAS/corrupt 的不变/变更断言都映射到 unit 或 E2E。
- formal Python course、专属 hints、真实 CodeMirror、五项目/输入/语义可访问性、素材 provenance、3 MiB/1.25 MiB/15 MiB/20s/1s 预算均在实现前锁定。
- 没有未决项目、模糊接口、跨任务省略写法或要求执行者临时发明的核心规则。
- 当前权限不允许 commit/push/deploy；所有提交只作为未来授权后的候选检查点。
