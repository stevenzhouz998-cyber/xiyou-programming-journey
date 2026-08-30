# W3-M5 第三周总试炼单图故事状态机 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 W3-M5 从 legacy `expectedSequence` 升级为一关由同一张真实 Blockly 图驱动、可失败恢复并生成正式证明的四阶段故事状态机，同时取得第三周统一审计所需的新鲜证据。

**Architecture:** 新增独立 `WeekThreeBoss*` Blockly 合同，固定公开证据流只提供场景输入，孩子保存的可见图决定条件值、分支连接、AND/OR 和四阶段状态转移。Progress V3 升级 revision 7，session、失败观察、完成证明、导入和恢复都从当前保存 workspace 重新编译并从头重放；React Scene 只消费 runtime events。W3-M1～M4 的现有实现保持隔离，第三周统一审计在 W3-M5 专项通过后单独运行。

**Tech Stack:** React 19、TypeScript 5.9、Blockly 13、Vitest、Testing Library、Vite、Playwright、Node test runner、Sharp、OpenAI 内建 image generation。

---

## 执行与授权总门禁

- 当前起点应为 worktree `/Users/macmini-zz/.codex/worktrees/dac2/少儿编程学习网页`、HEAD `021b5519092ade1a710d24fa9887b021779f9ef7` 或其明确后继、工作树只包含本规格和本计划的已知文档改动。
- 当前现场是 detached HEAD，且 `node_modules` 不存在。开始生产实现前必须重新核实；没有用户明确安装授权时不得运行 `npm install`、`npm ci` 或浏览器安装。
- 如果继续使用 `$model-squad`，需由用户在执行回合重新明确调用；Terra 是唯一代码写入负责人，其他代理只读，主代理独立复核真实文件和命令输出。任何代理都不得派生子代理。
- 本计划中的“提交检查点”当前全部是禁止执行的授权边界。只有用户在执行回合明确授权 commit 后，才可运行列出的 `git add`/`git commit`；无授权时保留聚焦、未提交改动。
- 不 push、PR、merge、deploy、删除、覆盖、重置、清理或修改主工作树。

## 文件职责

### 新建

- `src/blockly/weekThreeBossContract.ts`：阶段、公开卡、默认 draft、canonical instruction、runner、失败快照和零惩罚。
- `src/blockly/weekThreeBossContract.test.ts`：四错顺序、全证据流、结构/运行失败、防伪和确定性测试。
- `src/blockly/weekThreeBossBlocks.ts`：W3-M5 专用 Blockly 定义、儿童标签和字段合同。
- `src/blockly/weekThreeBossCompiler.ts`：真实 workspace 序列化、恢复、连接/ownership 校验和编译入口。
- `src/blockly/weekThreeBossCompiler.test.ts`：实体连接、字段修改、删除、恢复、坐标和诊断测试。
- `src/progress/weekThreeBossSessionSchema.ts`：W3-M5 session 的 exact-key parser 和重编译重放校验。
- `src/progress/weekThreeBossSession.test.ts`：revision 7、迁移、formal proof、保存审计和伪造拒绝。
- `src/components/WeekThreeBossBlocklyWorkspace.tsx`：单一可见 workspace、保存优先编辑、聚焦与整套运行。
- `src/components/WeekThreeBossBlocklyWorkspace.test.tsx`：鼠标/键盘、真实字段/连接、保存合并、恢复和聚焦。
- `src/components/WeekThreeBossExperience.tsx`：draft/run/observation/completion 状态机、CAS、故障恢复和 lazy 边界。
- `src/components/WeekThreeBossExperience.test.tsx`：四错顺序、观察不泄题、保存重试、过期回调和完成门禁。
- `src/components/WeekThreeBossScene.tsx`：只消费 runtime events 的公开卡与固定原著复盘。
- `src/components/WeekThreeBossScene.test.tsx`：资源、回放、mute、reduced motion 与成功回调测试。
- `src/components/WeekThreeBossExperience.css`：明亮 3D 绘本布局、四阶段纵向 workspace、响应式与焦点样式。
- `src/components/WeekThreeBossRoute.test.tsx`：Experience lazy route、错误隔离和重试。
- `scripts/check-week-three-boss-e2e-contract.mjs`：W3-M5 E2E AST 防注入、前置指纹、标签和健康证据门禁。
- `scripts/check-week-three-boss-e2e-contract.test.mjs`：source contract 正反例。
- `e2e/week-three-boss.spec.ts`：五项目真实浏览器完整路径。
- `public/assets/week-three-boss/week-three-boss-background.webp`：正式故事舞台。
- `public/assets/week-three-boss/week-three-boss-states.webp`：正式透明状态图。
- `docs/verification/week-three-boss-story-state-machine.md`：W3-M5 专项与第三周统一审计的最终证据记录。

### 修改

- `src/course/formalCourse.ts`、`src/course/course.ts`、`src/course/courseOutline.ts`、`src/course/course.test.ts`：W3-M5 正式注册并移除 legacy sequence。
- `src/progress/executableMissionIds.ts`、`src/progress/executableMissionIds.test.ts`：加入 W3-M5 运行时注册。
- `src/progress/types.ts`、`src/progress/session.ts`、`src/progress/session.test.ts`：专用 session/evidence 类型和更新函数。
- `src/progress/schema.ts`、`src/progress/schema.test.ts`：revision 7 与 revision 1～6 迁移。
- `src/progress/progress.ts`、`src/progress/progress.test.ts`：formal completion、W4-M1 解锁和家长周报。
- `src/context/ProgressContext.tsx`：W3-M5 session 更新 overload 与持久化入口。
- `src/progress/storageFaultAdapter.ts`、`src/progress/storageFaultAdapter.test.ts`、`e2e/support/storageFaultAdapter.ts`：四类 W3-M5 保存故障与损坏 current。
- `src/components/MissionPageContent.tsx`、`src/components/ParentEquipmentReport.tsx`、`src/components/ParentEquipmentReport.test.tsx`：专用 route 与不泄题家长摘要。
- `scripts/check-bundle-budget.mjs`、`scripts/check-bundle-budget.test.mjs`：3 MiB W3-M5 closure 与 entry 隔离。
- `scripts/check-asset-manifest.mjs`、`scripts/check-asset-manifest.test.mjs`、`docs/assets/asset-manifest.md`：W3-M5 exact inventory、预算与 provenance。
- `package.json`：把 W3-M5 E2E source-contract test 纳入 `test:bundle-script`。
- `docs/verification/week-three-bajie-joining.md`：修正已经过时的“未提交、未推送”时态，保留历史数字的历史属性。

### 不修改

- W3-M1～M4 的 `*Contract.ts`、compiler、Experience 和 Scene 生产逻辑。
- 既有 entry、homepage、Phaser、W1/W2/W3-M1～M4 预算上限。
- 主工作树和任何 public deployment 配置。

### Task 0: 执行现场、依赖与授权前置门禁

**Files:**
- Read: `AGENTS.md`
- Read: `docs/superpowers/specs/2026-08-30-week-three-boss-story-state-machine-design.md`
- Read: `.agents/skills/xiyou-karpathy/references/completion-matrix.md`
- Read: `.agents/skills/xiyou-karpathy/references/asset-provenance.md`

- [ ] **Step 1: 重验工作树身份和已知改动**

Run:

```bash
pwd
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short --branch
git worktree list --porcelain
```

Expected: cwd/top-level 均为 `.../dac2/少儿编程学习网页`；HEAD 为基线或明确后继；只出现已知的 `AGENTS.md`、规格、计划改动。出现未知改动立即停止并报告。

- [ ] **Step 2: 重验依赖但不安装**

Run:

```bash
test -d node_modules && echo present || echo absent
node --version
npm --version
```

Expected: 如仍为 `absent`，停止所有需要依赖的 RED/GREEN 命令并请求明确安装授权；不得用未批准的复制、软链接或全局包绕过。

- [ ] **Step 3: 记录唯一写入和完成边界**

在执行记录中写明：W3-M5 最高 `One-level playable`；第三周 `System loop complete` 取决于全部 relevant matrix 单元格；无部署证据时 UI/release persistence 单元格失败。该记录不修改代码。

- [ ] **Step 4: 提交授权检查点**

当前禁止 commit。若以后获得明确授权，先由主代理复核 `git diff --check` 和完整 diff，再决定是否创建分支及提交；本步骤不得自行执行 git 写操作。

### Task 1: 课程、预算和 E2E source contract 的 RED 门禁

**Files:**
- Modify: `src/course/course.test.ts`
- Modify: `src/progress/executableMissionIds.test.ts`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`
- Create: `scripts/check-week-three-boss-e2e-contract.mjs`
- Create: `scripts/check-week-three-boss-e2e-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: 写课程正式化失败测试**

在 `src/course/course.test.ts` 增加精确断言：

```ts
it('registers w3-m5 as a formal executable boss without a legacy sequence', () => {
  const boss = getMission('w3-m5');
  expect(boss).toBeDefined();
  expect(isFormalMissionOutline(getMissionOutline('w3-m5'))).toBe(true);
  expect(isExecutableMissionId('w3-m5')).toBe(true);
  expect('expectedSequence' in boss!).toBe(false);
  expect(boss?.mode).toBe('blockly');
  expect(boss?.canon.chapters).toEqual([18, 19]);
});
```

同时把 formal 数量从 4 改为 5，并断言 W4-M1 仍 legacy。

- [ ] **Step 2: 写预算和素材 inventory RED**

在 bundle tests 预期以下新常量和隔离根：

```js
const WEEK_THREE_BOSS_COLD_LOAD_MAX_BYTES = 3 * 1024 * 1024;
const root = 'src/components/WeekThreeBossExperience.tsx';
expect(COLD_LOAD_ROOTS[root]).toBe(WEEK_THREE_BOSS_COLD_LOAD_MAX_BYTES);
```

在 asset tests 要求 exact inventory：

```js
[
  'assets/week-three-boss/week-three-boss-background.webp',
  'assets/week-three-boss/week-three-boss-states.webp',
]
```

每张 raster 不高于 `512 * 1024` bytes，任务媒体总量不高于 `MAX_MISSION_MEDIA_BYTES`。

- [ ] **Step 3: 写 E2E source contract RED**

新脚本导出：

```js
export const W3_M5_TAGS = [
  '@w3-m5-full', '@w3-m5-keyboard', '@w3-m5-mouse', '@w3-m5-touch',
  '@w3-m5-storage', '@w3-m5-corrupt', '@w3-m5-parent', '@w3-m5-cold',
  '@w3-m5-asset-fault', '@w3-m5-narrow', '@w3-m5-external', '@w3-m5-lazy',
];
const forbidden = /expectedSequence|LegacyMissionBuilder|MissionTools|\beval\s*\(|\bnew Function\b/;
export function assertWeekThreeBossE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w3-m5 source contract: E2E source must be text.');
  for (const tag of W3_M5_TAGS) {
    if (!source.includes(tag)) throw new Error(`w3-m5 source contract: missing ${tag}.`);
  }
  if (forbidden.test(source)) throw new Error('w3-m5 source contract: legacy or dynamic shortcut is forbidden.');
  const file = ts.createSourceFile('w3m5.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length > 0) throw new Error('w3-m5 source contract: E2E source must parse.');
  const constants = constantStrings(file);
  assertHealth(source, file, constants);
  assertHealthImmutability(file, constants);
  assertBrowserCallbackSafety(file, constants);
  assertFormalW3M4PrerequisiteBody(file, constants);
}
```

`constantStrings`、`assertHealth`、`assertHealthImmutability` 与 `assertBrowserCallbackSafety` 从 W3-M4 contract 复制为 W3-M5 专用私有 helper；`assertFormalW3M4PrerequisiteBody` 以固定 SHA-256 校验唯一合法前置 helper，并扫描其 AST，禁止任何 W3-M5 写入。测试必须拒绝 `expectedSequence`、legacy tools、`eval`/`new Function`、直接写 `missions/sessions/missionCompletionEvidence['w3-m5']`、动态 storage key、health 数组清理、原型篡改和非内联 browser callback；只允许合法 W3-M4 formal prerequisite fixture 与测试专用 fault mode。

- [ ] **Step 4: 把 source contract test 加入 package script**

在 `test:bundle-script` 末尾加入：

```json
"scripts/check-week-three-boss-e2e-contract.test.mjs"
```

- [ ] **Step 5: 运行 RED**

Run:

```bash
npm run test:unit -- src/course/course.test.ts src/progress/executableMissionIds.test.ts
npm run test:bundle-script
npm run test:assets
```

Expected: 因 W3-M5 尚未 formal、预算根/素材/真实 E2E 尚不存在而失败；失败原因必须是预期缺口，不是语法错误或环境错误。

- [ ] **Step 6: 提交授权检查点**

当前禁止 commit。若后来获授权，本任务候选提交仅包含 RED contracts，建议消息：`test: lock W3-M5 formal boss contracts`。

### Task 2: 状态机领域合同与 deterministic runner RED→GREEN

**Files:**
- Create: `src/blockly/weekThreeBossContract.ts`
- Create: `src/blockly/weekThreeBossContract.test.ts`

- [ ] **Step 1: 定义完整类型合同**

使用以下稳定公开类型；实现中的名字不得在后续任务改写：

```ts
export type WeekThreeBossStage =
  | 'manor-request' | 'cuilan-disguise' | 'yunzhan-dialogue'
  | 'bajie-joining' | 'week-three-recap-complete';

export type WeekThreeBossConditionKind =
  | 'mentions-gao-manor' | 'explicit-demon-help'
  | 'appearance-matches-cuilan' | 'identity-is-cuilan'
  | 'pilgrimage-explicit' | 'guanyin-precepts' | 'willing-westward';

export type WeekThreeBossOperator = 'and' | 'or';
export type WeekThreeBossConcept =
  | 'program-structure' | 'condition-selection' | 'identity-vs-appearance'
  | 'branch-routing' | 'boolean-composition' | 'state-transition' | 'completeness';

export interface WeekThreeBossBlockDraftV1 {
  id: string;
  type: string;
  fields: Record<string, string>;
  inputs: Record<string, string | null>;
  previousId: string | null;
  nextId: string | null;
  parentBlockId: string | null;
  x: number;
  y: number;
}

export interface WeekThreeBossWorkspaceDraftV1 {
  version: 1;
  blocks: WeekThreeBossBlockDraftV1[];
}

export interface WeekThreeBossInstruction {
  instructionId: string;
  opcode: string;
  sourceBlockId: string;
  parentBlockId: string | null;
  stageId: WeekThreeBossStage;
  scenarioId: string;
  conditionKind?: WeekThreeBossConditionKind;
  observedValue?: boolean;
  operator?: WeekThreeBossOperator;
  atomicValues?: [boolean, boolean];
  combinedValue?: boolean;
  actualBranch?: 'then' | 'else';
  stateBefore: WeekThreeBossStage;
  stateAfter: WeekThreeBossStage;
}

export interface WeekThreeBossFailureSnapshot {
  snapshotId: string;
  concept: WeekThreeBossConcept;
  stageId: WeekThreeBossStage;
  scenarioId: string;
  sourceBlockId: string;
  instruction: WeekThreeBossInstruction;
}

export interface WeekThreeBossRunResult {
  completed: boolean;
  finalState: WeekThreeBossStage;
  events: WeekThreeBossInstruction[];
  scenarioResults: Array<{ scenarioId: string; passed: boolean }>;
  failureSnapshot: WeekThreeBossFailureSnapshot | null;
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

export interface WeekThreeBossScenario {
  id: string;
  stageId: Exclude<WeekThreeBossStage, 'week-three-recap-complete'>;
  practice: boolean;
  publicTextKey: string;
  facts: Partial<Record<WeekThreeBossConditionKind, boolean>>;
}

export interface WeekThreeBossDiagnostic {
  code: string;
  concept: WeekThreeBossConcept;
  sourceBlockId: string | null;
}
```

- [ ] **Step 2: 写四错确定性阻塞测试**

测试用以下显式 helper 逐步生成四个 draft，不使用隐藏 answer array：

```ts
function updateBlock(
  draft: WeekThreeBossWorkspaceDraftV1,
  id: string,
  update: (block: WeekThreeBossBlockDraftV1) => void,
) {
  const next = structuredClone(draft);
  const block = next.blocks.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`missing test block ${id}`);
  update(block);
  return next;
}

const replaceCondition = (
  draft: WeekThreeBossWorkspaceDraftV1,
  id: string,
  condition: WeekThreeBossConditionKind,
) => updateBlock(draft, id, (block) => { block.fields.CONDITION_KIND = condition; });

const setJoiningOperator = (
  draft: WeekThreeBossWorkspaceDraftV1,
  operator: WeekThreeBossOperator,
) => updateBlock(draft, 'joining-boolean-operation', (block) => { block.fields.OPERATOR = operator; });

const swapYunzhanBranches = (draft: WeekThreeBossWorkspaceDraftV1) =>
  updateBlock(draft, 'yunzhan-if', (block) => {
    [block.inputs.THEN, block.inputs.ELSE] = [block.inputs.ELSE, block.inputs.THEN];
  });

const initial = createDefaultWeekThreeBossDraft();
expect(runWeekThreeBossForDraft(initial).failureSnapshot?.concept).toBe('condition-selection');

const manorFixed = replaceCondition(initial, 'manor-condition', 'explicit-demon-help');
expect(runWeekThreeBossForDraft(manorFixed).failureSnapshot?.concept).toBe('identity-vs-appearance');

const identityFixed = replaceCondition(manorFixed, 'disguise-identity-condition', 'identity-is-cuilan');
expect(runWeekThreeBossForDraft(identityFixed).failureSnapshot?.concept).toBe('branch-routing');

const branchesFixed = swapYunzhanBranches(identityFixed);
expect(runWeekThreeBossForDraft(branchesFixed).failureSnapshot?.concept).toBe('boolean-composition');

const correct = setJoiningOperator(branchesFixed, 'and');
expect(runWeekThreeBossForDraft(correct)).toMatchObject({
  completed: true,
  finalState: 'week-three-recap-complete',
  failureSnapshot: null,
  penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
});
```

helper 只在 unit test 中通过复制 draft 后修改真实字段/连接；生产代码不导出“一键修复”。

- [ ] **Step 3: 写公开卡与状态转移测试**

精确断言证据流：练习问路不推进、原著求助推进；伪装两闸分别 true/false；两轮对话分别 false/ELSE 与 true/THEN；归队练习 TF/FT 不推进，原著 TT 推进。练习卡必须带 `practice: true`，原著卡带 `practice: false`。

- [ ] **Step 4: 写结构、防伪和确定性 RED**

覆盖空图、多根、断线、缺条件、缺分支、未知块/字段/operator、孤儿、重复必需块、共享 condition、跨阶段 ownership、非互惠连接、环、错误 action 位置、遗漏阶段、非法坐标、伪造 trace；同一 draft 两次 compile/run 深相等，有限大坐标不改变语义。

- [ ] **Step 5: 实现最小领域合同**

导出且只导出生产需要的入口：

```ts
export const WEEK_THREE_BOSS_SCENARIOS: readonly WeekThreeBossScenario[];
export function createDefaultWeekThreeBossDraft(): WeekThreeBossWorkspaceDraftV1;
export function compileWeekThreeBossDraft(draft: WeekThreeBossWorkspaceDraftV1): WeekThreeBossInstruction[];
export function runWeekThreeBoss(trace: WeekThreeBossInstruction[]): WeekThreeBossRunResult;
export function runWeekThreeBossForDraft(
  draft: WeekThreeBossWorkspaceDraftV1,
  suppliedTrace?: WeekThreeBossInstruction[],
): WeekThreeBossRunResult;
```

`runWeekThreeBossForDraft` 必须重新编译并逐项比对 supplied trace；不匹配立即拒绝。runner 只读取 compiler 输出和公开 scenarios，不读取课程、React、坐标或 legacy sequence。

- [ ] **Step 6: 运行 GREEN**

Run:

```bash
npm run test:unit -- src/blockly/weekThreeBossContract.test.ts
```

Expected: 新合同测试全部 PASS；W3-M1～M4 现有合同测试不受影响。

- [ ] **Step 7: 提交授权检查点**

当前禁止 commit。若后来获授权，候选消息：`feat: add W3-M5 story state machine contract`。

### Task 3: 真实 Blockly blocks、compiler 与单一 workspace RED→GREEN

**Files:**
- Create: `src/blockly/weekThreeBossBlocks.ts`
- Create: `src/blockly/weekThreeBossCompiler.ts`
- Create: `src/blockly/weekThreeBossCompiler.test.ts`
- Create: `src/components/WeekThreeBossBlocklyWorkspace.tsx`
- Create: `src/components/WeekThreeBossBlocklyWorkspace.test.tsx`
- Create: `src/components/WeekThreeBossExperience.css`

- [ ] **Step 1: 写真实 Blockly compile RED**

在无 UI Blockly workspace 中注册块、恢复默认 draft，再断言：

```ts
const workspace = new Blockly.Workspace();
registerWeekThreeBossBlocks();
restoreWeekThreeBossWorkspace(workspace, createDefaultWeekThreeBossDraft());
const compiled = compileWeekThreeBossWorkspace(workspace);
expect(compiled.ok).toBe(true);
expect(compiled.draft).toEqual(createDefaultWeekThreeBossDraft());
expect(compiled.trace).toEqual(compileWeekThreeBossDraft(compiled.draft!));
```

通过真实 FieldDropdown 改求助/身份条件和 operator，通过 Blockly connection API 交换云栈分支；每次重新编译的 trace 必须改变。

- [ ] **Step 2: 写实体结构诊断与恢复 RED**

删除条件、断开分支、跨容器连接、制造 non-reciprocal parent、加入孤儿、重复 stage、非法 field、环和极端坐标；诊断返回 `{ code, concept, sourceBlockId }`，能够聚焦真实块。恢复对有限坐标 clamp，对无限/NaN 拒绝。

- [ ] **Step 3: 定义儿童可见块并实现 compiler**

`weekThreeBossBlocks.ts` 只注册 W3-M5 块，标签使用儿童可读中文，不显示内部 ID。`weekThreeBossCompiler.ts` 导出：

```ts
export type WeekThreeBossCompileResult =
  | { ok: true; draft: WeekThreeBossWorkspaceDraftV1; trace: WeekThreeBossInstruction[]; diagnostics: [] }
  | { ok: false; draft: WeekThreeBossWorkspaceDraftV1 | null; trace: []; diagnostics: WeekThreeBossDiagnostic[] };

export function compileWeekThreeBossWorkspace(workspace: Blockly.Workspace): WeekThreeBossCompileResult;
export function restoreWeekThreeBossWorkspace(
  workspace: Blockly.Workspace,
  draft: WeekThreeBossWorkspaceDraftV1,
): void;
```

serializer 只读取真实连接、字段和 ownership；严禁根据坐标、随机 Blockly ID 或显示顺序推断语义。

- [ ] **Step 4: 写 Workspace 保存与输入 RED**

组件 props 固定为：

```ts
export interface WeekThreeBossBlocklyWorkspaceProps {
  draft: WeekThreeBossWorkspaceDraftV1;
  locked: boolean;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onDraftChange: (draft: WeekThreeBossWorkspaceDraftV1) => Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>;
  onRun: (result: WeekThreeBossCompileResult) => void;
}
```

测试鼠标/触控和 Enter/Space 操作同一 Blockly field/connection；同一 draft 的 in-flight 保存合并，晚到保存不能擦除新版本；运行前保存当前 immutable snapshot。阶段导航只 pan/focus，不改图、不运行、不跳过。

- [ ] **Step 5: 实现单一 Workspace 与响应式 CSS**

仅创建一个 Blockly workspace 和一个“运行整套试炼”按钮。四阶段在同图纵向布局；320/390 下不得用横向滚动作为完成操作前提。CSS 增加可见焦点、最小触控目标、错误聚焦、reduced-motion 和无横向溢出规则。

- [ ] **Step 6: 运行 GREEN**

Run:

```bash
npm run test:unit -- src/blockly/weekThreeBossCompiler.test.ts src/components/WeekThreeBossBlocklyWorkspace.test.tsx
```

Expected: 全部 PASS；测试证明真实连接/字段而非 React state 改变 trace。

- [ ] **Step 7: 提交授权检查点**

当前禁止 commit。若后来获授权，候选消息：`feat: add W3-M5 visible Blockly workspace`。

### Task 4: Progress revision 7、session、formal proof 与迁移 RED→GREEN

**Files:**
- Create: `src/progress/weekThreeBossSessionSchema.ts`
- Create: `src/progress/weekThreeBossSession.test.ts`
- Modify: `src/progress/types.ts`
- Modify: `src/progress/session.ts`
- Modify: `src/progress/session.test.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/schema.test.ts`
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`
- Modify: `src/context/ProgressContext.tsx`

- [ ] **Step 1: 写 session 类型和更新 RED**

新增：

```ts
export interface WeekThreeBossMissionSession extends Omit<MissionSessionData<
  WeekThreeBossWorkspaceDraftV1,
  WeekThreeBossInstruction,
  WeekThreeBossRunResult
>, 'conceptFailures'> {
  conceptFailures: Record<WeekThreeBossConcept, number>;
  scenarioResults: WeekThreeBossRunResult['scenarioResults'];
  failureSnapshot: WeekThreeBossFailureSnapshot | null;
  conditionObservationUses: Array<{
    snapshotId: string;
    usedAt: string;
    workspace: WeekThreeBossWorkspaceDraftV1;
  }>;
}

export type WeekThreeBossCompletionEvidence =
  | BajieLegacyReplayEvidence
  | { kind: 'formal-v3'; completedAt: string; verifiedAt: string; workspace: WeekThreeBossWorkspaceDraftV1; trace: WeekThreeBossInstruction[]; run: WeekThreeBossRunResult };
```

`MissionSessionById` 与 `MissionCompletionEvidenceV1['w3-m5']` 使用这些类型。

- [ ] **Step 2: 写 revision 1～6 迁移矩阵 RED**

逐个 fixture 验证：

- revision 1～5 的历史 W3-M5 marker 保留为 `legacy-replay-only`；
- revision 6 有 marker 的完成保留；
- revision 6 在 W3-M4 formal 后完成 W3-M5、但 marker 缺失的合法当前 legacy 记录，迁移为 `legacy-replay-only`，`sourceSchemaRevision: 6`；
- 上述任何迁移都没有 W3-M5 session/trace/run/formal proof；
- 未完成 W3-M5 却有 marker 拒绝；未知 revision/额外 key/伪时间拒绝；
- 输出统一为 `schemaRevision: 7`。

扩展 `BajieLegacyReplayEvidence` 允许精确来源 `{ sourceVersion: 3, sourceSchemaRevision: 6 }`。

- [ ] **Step 3: 写 formal proof 与历史升级 RED**

```ts
let session = createMissionSession('w3-m5', NOW);
session = updateWorkspaceDraft(session, correctBossDraft, NOW);
const trace = compileWeekThreeBossDraft(session.workspace);
session = recordRun(session, runWeekThreeBossForDraft(session.workspace, trace), trace, LATER);
progress.sessions['w3-m5'] = session;
progress = completeMission(progress, 'w3-m5', { stars: 3, hintsUsed: 0 });
expect(progress.missionCompletionEvidence['w3-m5']).toMatchObject({
  kind: 'formal-v3',
  run: { completed: true, finalState: 'week-three-recap-complete' },
});
```

没有 W3-M4 formal、使用过期图、伪 trace/run、部分 scenario、非零 penalty、Scene 尚未完成或 completion save 失败均不能产生 proof。历史 marker 正式重玩后保留旧 `completedAt`，更新 `verifiedAt`。

- [ ] **Step 4: 实现 session creator/update/parser**

`createMissionSession('w3-m5')` 返回默认四错 draft 和空证据；`updateWorkspaceDraft` 清空当前 trace/run/scenario/failure，保留累计计数；`recordRun` 重新编译并比对；`recordConditionObservationUse` 保存 immutable workspace 且 snapshot 去重。parser 使用 exact keys 并从所有观察历史图重放对应失败。

- [ ] **Step 5: 实现 revision 7 与 completeMission**

`schema.ts` 接受 revision 1～7，只输出 7；W3-M5 formal evidence 必须绑定当前 session。`progress.ts` 新增 `formalWeekThreeBossCompletionEvidence`，完成时再次重编译重放并检查 `week-three-recap-complete`、全部 scenarios passed、零惩罚。

- [ ] **Step 6: 实现 ProgressContext overload**

让 `updateMissionSession('w3-m5', updater)` 保持专用类型，不允许回退到 W1 session。所有持久化继续走 coordinator/CAS，不在组件直接写 localStorage。

- [ ] **Step 7: 运行 GREEN**

Run:

```bash
npm run test:unit -- src/progress/weekThreeBossSession.test.ts src/progress/session.test.ts src/progress/schema.test.ts src/progress/progress.test.ts
npm run typecheck
```

Expected: 全部 PASS；revision 1～6 兼容，revision 7 防伪通过。

- [ ] **Step 8: 提交授权检查点**

当前禁止 commit。若后来获授权，候选消息：`feat: add W3-M5 revision 7 formal proof`。

### Task 5: 正式课程、专用 route、W4 解锁与家长摘要 RED→GREEN

**Files:**
- Modify: `src/course/formalCourse.ts`
- Modify: `src/course/course.ts`
- Modify: `src/course/courseOutline.ts`
- Modify: `src/course/course.test.ts`
- Modify: `src/progress/executableMissionIds.ts`
- Modify: `src/progress/executableMissionIds.test.ts`
- Modify: `src/components/MissionPageContent.tsx`
- Create: `src/components/WeekThreeBossRoute.test.tsx`
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`
- Modify: `src/components/ParentEquipmentReport.tsx`
- Modify: `src/components/ParentEquipmentReport.test.tsx`

- [ ] **Step 1: 正式课程 GREEN**

在 `formalWeekThreeMissions` 追加：

```ts
formalMission('w3-m5', {
  subtitle: '修复四类条件与分支错误',
  objective: '用同一张故事状态机完成第三周总试炼',
  canon: formalWeekThreeCanon,
  storyBeats: [
    beat('由庄口求助到云栈洞', '条件判断推动悟空进入高老庄、识别伪装并追到云栈洞。'),
    beat('由西行使命到八戒归队', '分支与多条件核验完成观音安排、另名八戒和挑担西行的复盘。'),
  ],
}),
```

从 `course.ts` 删除 W3-M5 legacy `mission(... expectedSequence ...)`；`courseOutline.ts` formal predicate 和 executable registry 加 W3-M5。

- [ ] **Step 2: 写并实现专用 lazy route**

`MissionPageContent.tsx` 加 `WeekThreeBossExperienceProps` type-only import、独立 dynamic loader 和 `WeekThreeBossRouteBoundary`；render chain 在 W3-M4 后显式处理 W3-M5。route test 覆盖 loading、正常、chunk 503 后页面级 retry；不得落入 `renderLegacyMissionTools()`。

- [ ] **Step 3: 写 W4-M1 解锁 RED→GREEN**

新玩家：只有 W3-M5 `formal-v3` 解锁 W4-M1。历史用户：已有 W4 完成或 W3-M5 `legacy-replay-only` 保留兼容访问，但不能显示正式第三周掌握。bare W3-M5 completion 无 marker/proof 必须在 revision 7 parser 阶段拒绝。

- [ ] **Step 4: 写不泄题家长摘要 RED→GREEN**

`getWeeklyReport(progress, 3)` 增加：整套运行、四概念失败、首次阻塞、成功 full run、观察次数、formal/legacy 和时间。`ParentEquipmentReport` 只显示儿童可理解摘要；测试断言没有 `blockId`、`instructionId`、scenario internal ID、正确条件名列表、正确连接或完整 trace。

- [ ] **Step 5: 运行 GREEN**

Run:

```bash
npm run test:unit -- src/course/course.test.ts src/progress/executableMissionIds.test.ts src/progress/progress.test.ts src/components/WeekThreeBossRoute.test.tsx src/components/ParentEquipmentReport.test.tsx
npm run typecheck
```

Expected: 全部 PASS；W3-M5 formal/executable，W4 仍 legacy，家长摘要不泄题。

- [ ] **Step 6: 提交授权检查点**

当前禁止 commit。若后来获授权，候选消息：`feat: register formal W3-M5 and parent summary`。

### Task 6: 保存优先 Experience、Scene、火眼金睛与故障恢复 RED→GREEN

**Files:**
- Create: `src/components/WeekThreeBossExperience.tsx`
- Create: `src/components/WeekThreeBossExperience.test.tsx`
- Create: `src/components/WeekThreeBossScene.tsx`
- Create: `src/components/WeekThreeBossScene.test.tsx`
- Modify: `src/components/WeekThreeBossExperience.css`
- Modify: `src/progress/storageFaultAdapter.ts`
- Modify: `src/progress/storageFaultAdapter.test.ts`
- Modify: `e2e/support/storageFaultAdapter.ts`

- [ ] **Step 1: 写保存顺序和四错 Experience RED**

mock Workspace 依次提交默认、修复一、修复二、修复三、全修 draft；断言每次流程严格为：

```text
save draft -> compile current snapshot -> save run/failure -> publish feedback
```

只有全修成功且 Scene resources ready、visible playback complete 后才调用 `onComplete`。禁止 per-stage completion、accepted hidden prefix 或旧 run 复用。

- [ ] **Step 2: 写火眼金睛不变性 RED**

有效失败保存后显示主动按钮。打开后只显示当前 stage、公开卡、条件真值、可见 operator、实际分支/动作；断言不出现“改成 AND”“交换”“明确请求降妖”“真实身份”等直接答案提示。观察前后除 audit 外深相等，编辑图后旧观察消失。

- [ ] **Step 3: 写四类 fault 与过期回调 RED**

新增精确 fault modes：

```ts
'fail-week-three-boss-draft'
'fail-week-three-boss-run'
'fail-week-three-boss-observation'
'fail-week-three-boss-completion'
'corrupt-week-three-boss-current'
```

每类均 fail closed、显示精确重试、保持待保存 immutable target。覆盖双击运行、运行中编辑、晚到 asset/Scene callback、CAS conflict、下载备份和显式载入外部进度。

- [ ] **Step 4: 实现 Experience**

使用 W3-M4 既有 coordinator 模式，但专用状态和类型；不得复制 localStorage 写入。Workspace、Scene 各自 lazy load；失败 boundary 只影响本关。完成前再次从已保存 session.workspace compile/run。

- [ ] **Step 5: 写并实现 Scene RED→GREEN**

Scene props：

```ts
export interface WeekThreeBossSceneProps {
  events: WeekThreeBossInstruction[];
  replayToken: number;
  reducedMotion: boolean;
  muted: boolean;
  onResourceStateChange: (state: 'loading' | 'ready' | 'error') => void;
  onPlaybackComplete: () => void;
}
```

Scene 只渲染公开卡与 runtime events；正确终局固定为悟能/八戒/挑担西行摘要。资源未 ready、错误或 replayToken 过期不能回调完成。mute/reduced motion 不改变 events 或完成语义。

- [ ] **Step 6: 运行 GREEN**

Run:

```bash
npm run test:unit -- src/components/WeekThreeBossExperience.test.tsx src/components/WeekThreeBossScene.test.tsx src/progress/storageFaultAdapter.test.ts
npm run typecheck
```

Expected: 全部 PASS；四类保存故障和过期回调 fail closed。

- [ ] **Step 7: 提交授权检查点**

当前禁止 commit。若后来获授权，候选消息：`feat: add recoverable W3-M5 experience`。

### Task 7: 正式素材、manifest 与包体预算 RED→GREEN

**Files:**
- Create: `public/assets/week-three-boss/week-three-boss-background.webp`
- Create: `public/assets/week-three-boss/week-three-boss-states.webp`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`
- Modify: `scripts/check-bundle-budget.mjs`
- Modify: `scripts/check-bundle-budget.test.mjs`
- Modify: `src/utils/assets.test.ts`

- [ ] **Step 1: 生成背景图**

必须使用环境内建 image generation。Prompt 固定包含：明亮 3D 中国儿童绘本、高老庄庭院自然过渡到云栈洞远景和西行道路、开阔舞台、无文字/伪字/水印、无攻击命中、无捆绑揪耳、无成人婚姻或羞辱、为 UI 留出安全区域。保存原始生成依据和技术处理记录。

- [ ] **Step 2: 生成状态图并处理透明背景**

状态图包含四个非暴力状态：高才求助、悟空调查、云栈洞对话、八戒挑担西行。若透明通道不可靠，使用不与人物服装冲突的色键做技术性去背；不得重绘人物。检查每格边界、alpha edge、手脚道具完整性和无伪字。

- [ ] **Step 3: 登记完整 manifest**

每行填写 stable asset path、SHA-256、用途、`OpenAI built-in image_gen`、完整 prompt anchor、尺寸、provenance、实际 `WeekThreeBossScene` slot 和 `visual-qa-passed`。记录 rejected 版本但不进入 build inventory。

- [ ] **Step 4: 实现资产与 bundle gate**

批准 `assets/week-three-boss/` 目录和 exact 两文件；W3-M5 Experience closure 为 3 MiB，Workspace/Scene 与 Blockly 保持 dynamic；entry 不得静态包含三者。既有所有预算常量原值不变。

- [ ] **Step 5: 运行资产/预算 GREEN**

Run:

```bash
npm run test:assets
npm run verify:assets
npm run test:bundle-script
npm run build
npm run verify:bundle
```

Expected: exact inventory、hash、尺寸、QA、媒体总量、3 MiB closure 和所有既有预算 PASS。

- [ ] **Step 6: 主代理原尺寸视觉复核**

使用本地图片查看工具检查两张源图，不只看缩略图。记录角色完整、背景安全区、无伪字/水印/攻击/捆绑/揪耳/成人暗示、移动裁切可用和透明边缘结果。

- [ ] **Step 7: 提交授权检查点**

当前禁止 commit。若后来获授权，候选消息：`feat: add verified W3-M5 storybook assets`。

### Task 8: E2E 防伪合同与五项目真实浏览器闭环

**Files:**
- Create: `e2e/week-three-boss.spec.ts`
- Create: `scripts/check-week-three-boss-e2e-contract.mjs`
- Create: `scripts/check-week-three-boss-e2e-contract.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: 建立唯一合法前置 fixture**

fixture 只可创建 W3-M4 `formal-v3`，其 helper 源码 SHA-256 固定进入 source contract。AST 扫描 helper，禁止任何 `w3-m5` literal/computed key、WeekThreeBoss 标识、session/evidence 写入或 completeMission('w3-m5')。

- [ ] **Step 2: 写完整孩子路径**

每个项目使用页面可见操作：默认运行并失败 → 保存 snapshot → 打开火眼金睛并断言图不变 → 真实替换求助条件 → 重跑 → 替换身份条件 → 重跑 → 交换云栈分支 → 重跑 → 改 AND → 整套成功 → 等待正式场景 → completion save → 刷新重播。禁止 `page.evaluate` 修改 W3-M5 图、mission、session、proof 或健康证据。

- [ ] **Step 3: 覆盖输入和响应式**

desktop Chromium 真实 mouse；desktop Firefox 或 Chromium 真实 keyboard；390 与 320 使用 Playwright `tap()` 验证触控目标。所有项目断言单一 workspace、全部阶段可导航、无横向溢出、focus 可见、公开卡/练习标识可读。

- [ ] **Step 4: 覆盖持久化、恢复和跨系统**

desktop 覆盖四类 save fault、CAS 双标签、损坏 current 原文下载与 snapshot 恢复、真实文件控件 export/import、parent report、W4-M1 解锁、legacy revision 6 迁移和正式重玩升级。刷新后从保存图重新编译重放，而不是只恢复外观。

- [ ] **Step 5: 覆盖资源与页面健康**

覆盖 background/states 503、Experience/Workspace/Scene chunk 503、cold closure、真实 404、mute/reduced motion。每个 page 使用 `attachHealth(page)`，在 `finally` 关闭；`afterEach` 精确断言 raw console/page/request/response health 为空，source contract 禁止清理证据数组。

- [ ] **Step 6: 运行 source contract 与专项矩阵**

Run:

```bash
node --test scripts/check-week-three-boss-e2e-contract.test.mjs
npx playwright test e2e/week-three-boss.spec.ts --reporter=line
```

Expected: source contract PASS；desktop Chromium、tablet WebKit、mobile Chromium、desktop Firefox、narrow Chromium 全部 PASS，无 unexpected/flaky。

- [ ] **Step 7: 主代理目视检查截图**

每项目至少检查 default、四类 failure 的代表状态和 success；重点查看 320/390 的纵向 workspace、阶段导航、焦点、观察面板、练习标识和成功画面。自动断言不能替代视觉检查。

- [ ] **Step 8: 提交授权检查点**

当前禁止 commit。若后来获授权，候选消息：`test: verify W3-M5 five-project browser loop`。

### Task 9: 新鲜全量验证、第三周统一审计与文档修正

**Files:**
- Modify: `docs/verification/week-three-bajie-joining.md`
- Create: `docs/verification/week-three-boss-story-state-machine.md`

- [ ] **Step 1: 修正 W3-M4 历史时态**

把“本任务实现与本记录均保持未提交、未推送”改为明确历史说明：W3-M4 后续已提交并推送为 `021b5519092ade1a710d24fa9887b021779f9ef7`；原表中的命令数字是提交前历史证据，不是当前 W3-M5 HEAD 的新鲜运行。不得改写历史数字本身。

- [ ] **Step 2: 运行 W3-M5 与基础门禁**

Run:

```bash
npm test
npm run typecheck
npm run build
npm run verify:bundle
npm run verify:assets
git diff --check
```

Expected: 全部 exit 0。记录 files/tests/contracts、bundle closure、entry、资产字节和 hash 的实际输出，不预填数字。

- [ ] **Step 3: 运行第三周统一五关矩阵**

Run:

```bash
npx playwright test \
  e2e/week-three-manor-help-condition.spec.ts \
  e2e/week-three-cuilan-boolean.spec.ts \
  e2e/week-three-yunzhan-dialogue.spec.ts \
  e2e/week-three-bajie-joining.spec.ts \
  e2e/week-three-boss.spec.ts \
  --reporter=json
```

Expected: 五个正式关在五项目中全部 expected pass、0 flaky。若失败，逐项归类后修复当前任务引入的回归；不得用单关专项绿灯替代统一矩阵。

- [ ] **Step 4: 运行全站审计**

Run:

```bash
npm run test:e2e -- --reporter=json
```

Expected: 记录完整 total/expected/unexpected/flaky。任何历史 shared/W1 失败继续阻断全站、Full-content 和商业完成；先分析是否影响第三周相关 matrix，不能自动忽略或自动归因。

- [ ] **Step 5: 审计 completion matrix**

逐格记录 Course、Blockly、Parent/saves、UI/release 的 required behavior、persistence/cross-system、failure/browser 证据。公开部署未获授权且未验证时，UI/release persistence 单元格明确失败，第三周正式 `System loop complete: not complete`。可以另行描述“本地五关统一课程闭环已验证”，但不得用它替代正式等级。

- [ ] **Step 6: 写验证记录**

`docs/verification/week-three-boss-story-state-machine.md` 必须包含：执行现场、授权边界、玩家可见四错、唯一事实源、迁移和防伪、保存恢复、家长/W4 效果、自动命令实际结果、五项目浏览器与截图审计、资产 hash/尺寸/QA、统一第三周矩阵、全站失败、completion matrix 和残余风险。

- [ ] **Step 7: 最终独立验收**

主代理不接受子代理“已完成”陈述，必须打开真实文件、复核关键测试输出、查看浏览器截图/行为并重新检查 `git status`。最高声明：若全部单关证据成立，W3-M5 `One-level playable`；第三周等级严格按 matrix 结果。

- [ ] **Step 8: 提交授权检查点**

当前禁止 commit/push。只有用户明确授权并且所有必要验证通过后，才能提出聚焦提交方案；即使 commit 获批，也不代表 push、PR、merge 或 deploy 获批。

## 计划自检

- 规格中的四个默认错误、单一 full-run、公开练习/原著卡、状态推进、第一阻塞、火眼金睛、零惩罚、保存优先、revision 7、旧 marker、W4 解锁、家长摘要、正式素材、预算和五项目浏览器路径均有对应任务。
- `WeekThreeBoss*`、`w3-m5`、`formal-v3`、`legacy-replay-only`、`schemaRevision: 7`、`week-three-recap-complete` 和五类 fault mode 在各任务中一致。
- W3-M1～M4 生产逻辑明确不修改；第三周统一审计和 W3-M4 历史时态修正位于最终任务。
- 没有把固定 evidence queue、Scene、React state、坐标、legacy sequence、测试 fixture 或历史 completion 当作答案/成功源。
- 没有未授权的依赖安装、commit、push、PR、merge、deploy、删除、覆盖、重置或主工作树修改步骤。
- 计划只覆盖 W3-M5 及第三周相关审计；30 关、全站、商业生产和 public deployment 均不外推。
