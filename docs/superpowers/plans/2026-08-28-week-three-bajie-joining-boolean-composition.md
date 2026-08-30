# W3-M4 八戒归队多条件组合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended when the user explicitly reactivates model-squad/delegation) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The project `xiyou-karpathy` gate remains mandatory.

**Goal:** 把 W3-M4「八戒归队」升级为由真实可见 Blockly `AND/OR` 组合图驱动、可失败恢复并保存正式证明的单关完整体验。

**Architecture:** 新增独立 `BajieJoining` Blockly 合同，把两个公开故事传感器和可编辑运算符编译为三情境 canonical trace；runner 以原著 `TT`、练习 `TF`、练习 `FT` 验证组合逻辑。Progress V3 升级 revision 6，session、观察、完成证明、导入和恢复都从保存的 workspace 重编译重放；React Scene 只消费 runtime events。

**Tech Stack:** React 19、TypeScript、Blockly、Vitest、Testing Library、Playwright、Progress V3、WebP 项目素材。

**Authorization boundary:** 当前只授权本地规划与后续获批后的实现；不得 commit、push、创建 PR、merge 或 deploy。计划故意不含 commit 步骤。当前 worktree 没有 `node_modules`，未经用户再次明确许可不得运行 `npm ci`、`npm install` 或任何会自动下载包的 `npx` 命令。

---

## 文件职责

- `src/blockly/weekThreeBajieJoiningContract.ts`：图结构、三张公开卡、AND/OR 真值、canonical trace、runner、失败快照和零惩罚。
- `src/blockly/weekThreeBajieJoiningBlocks.ts`：真实 Blockly 块、儿童文案、operator 字段与输入形状。
- `src/blockly/weekThreeBajieJoiningCompiler.ts`：可见 workspace 的序列化、恢复、连接校验和编译入口。
- `src/components/WeekThreeBajieJoiningBlocklyWorkspace.tsx`：唯一 workspace、鼠标/触控/键盘 operator 编辑、左右条件交换和保存队列。
- `src/components/WeekThreeBajieJoiningExperience.tsx`：保存优先 draft/run/observation/completion 状态机、CAS、故障恢复和 lazy 边界。
- `src/components/WeekThreeBajieJoiningScene.tsx`：只消费 runtime events 的三卡与原著成功场景。
- `src/progress/bajieJoiningSessionSchema.ts`：W3-M4 exact-key session parser、重编译、重放和观察快照校验。
- `src/progress/{types,session,schema,progress}.ts`：revision 6、W3-M4 session/proof、历史迁移、W3-M5 解锁和报告。
- `src/course/{course,formalCourse,courseOutline}.ts`、`src/components/MissionPageContent.tsx`：正式课程、独立 lazy route 与 legacy 隔离。
- `public/assets/week-three-bajie-joining/*.webp`：正式背景与状态图，不参与答案或成功判定。
- `e2e/week-three-bajie-joining.spec.ts`：五项目真实浏览器失败、观察、修复、恢复、导入和故障路径。

### Task 0: 执行现场与依赖前置门禁

**Files:**
- Read: `AGENTS.md`
- Read: `.agents/skills/xiyou-karpathy/SKILL.md`
- Read: `docs/superpowers/specs/2026-08-28-week-three-bajie-joining-boolean-composition-design.md`

- [ ] **Step 1: 重验 worktree 与正确起点**

Run:

```bash
pwd
git rev-parse HEAD
git status --short --branch
git rev-list --left-right --count HEAD...origin/codex/week-two-formal
git stash list
```

Expected: cwd 为当前 `4ac1` worktree；HEAD 为 `fb623c4bcfd4c56891ed9eb34c032e30defae647` 或经用户确认的明确后继；与 origin 起点无未解释偏差；规格文件是唯一已有未跟踪文件。不得修改主工作树或旧 `3abe` worktree。

- [ ] **Step 2: 在开始生产写入前解决 detached HEAD**

Run only after the user approves implementation:

```bash
git switch -c codex/w3-m4-bajie-joining
git status --short --branch
```

Expected: 当前 worktree 进入独立本地分支；不创建提交、不推送。若同名分支已存在，停止并只读核对归属，不覆盖或强制切换。

- [ ] **Step 3: 检查依赖，不自动安装**

Run:

```bash
test -x node_modules/.bin/vitest
test -x node_modules/.bin/playwright
```

Expected now: 两项均缺失。停止执行测试并向用户请求一次明确的依赖安装授权；不得调用裸 `npx`。获批后只使用项目锁文件对应的确定性安装命令，并在安装前再次检查 `package-lock.json` 未漂移。

- [ ] **Step 4: 记录实施前目标**

在计划执行记录中固定：Chromium/WebKit/Firefox；1440/768/390/320；鼠标/触控/键盘；W3-M4 cold closure 3 MiB；单图 512 KiB；任务媒体 1.25 MiB。不得事后提高预算。

### Task 1: Blockly 合同、三情境 runner 与编译器 RED→GREEN

**Files:**
- Create: `src/blockly/weekThreeBajieJoiningContract.test.ts`
- Create: `src/blockly/weekThreeBajieJoiningCompiler.test.ts`
- Create: `src/blockly/weekThreeBajieJoiningContract.ts`
- Create: `src/blockly/weekThreeBajieJoiningBlocks.ts`
- Create: `src/blockly/weekThreeBajieJoiningCompiler.ts`

- [ ] **Step 1: 先写默认 OR 失败与 AND 成功测试**

Test shape:

```ts
const draft = createDefaultBajieJoiningDraft();
expect(runBajieJoining(compileBajieJoiningDraft(draft))).toMatchObject({
  completed: false,
  failureSnapshot: {
    scenarioId: 'practice-precepts-only',
    operator: 'or',
    leftValue: true,
    rightValue: false,
    combinedValue: true,
    actualBranch: 'then',
  },
  penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
});

const corrected = structuredClone(draft);
const operation = corrected.blocks.find((block) => block.id === 'bajie-boolean-operation');
if (!operation) throw new Error('missing bajie boolean operation');
operation.operator = 'and';
expect(runBajieJoining(compileBajieJoiningDraft(corrected))).toMatchObject({
  completed: true,
  finalState: 'westward-team-departed',
  scenarioResults: [
    { scenarioId: 'canon-bajie-joins', combinedValue: true, passed: true },
    { scenarioId: 'practice-precepts-only', combinedValue: false, passed: true },
    { scenarioId: 'practice-willing-only', combinedValue: false, passed: true },
  ],
});
```

- [ ] **Step 2: 写图防伪和 AND 可交换测试**

覆盖缺根、缺任一输入、未知 operator、未知块、孤儿、重复块、跨容器、非互惠连接、错误 parent、环、伪造 trace、非法坐标；交换两个传感器的 `LEFT/RIGHT` 连接后运行结果仍成功，坐标变化不改变逻辑结果。

- [ ] **Step 3: 运行窄测试确认 RED**

Run after dependencies are explicitly authorized and installed:

```bash
./node_modules/.bin/vitest run src/blockly/weekThreeBajieJoiningContract.test.ts src/blockly/weekThreeBajieJoiningCompiler.test.ts --reporter=dot
```

Expected: FAIL because the new modules and exports do not exist. 保存 RED 输出摘要。

- [ ] **Step 4: 实现最小合同类型和固定公开输入**

Define and keep consistent:

```ts
export type BajieJoiningOperator = 'and' | 'or';
export type BajieJoiningScenarioId =
  | 'canon-bajie-joins'
  | 'practice-precepts-only'
  | 'practice-willing-only';
export type BajieJoiningBranch = 'then' | 'else';
export interface BajieJoiningWorkspaceBlock {
  id: string;
  type: string;
  previousId: string | null;
  nextId: string | null;
  parentBlockId: string | null;
  leftInputId: string | null;
  rightInputId: string | null;
  branch: BajieJoiningBranch | null;
  operator: BajieJoiningOperator | null;
  x: number;
  y: number;
}
export type BajieJoiningOpcode =
  | 'receive-statement'
  | 'check-guanyin-precepts'
  | 'check-willing-westward'
  | 'combine-conditions'
  | 'formally-join-team'
  | 'continue-verification';
```

`BAJIE_JOINING_SCENARIOS` 必须精确为 `TT/TF/FT`，两张练习卡带 `practice: true` 和儿童可见“不改变原著”标记。默认 draft 的 operator 为 `or`。

- [ ] **Step 5: 实现严格 draft 校验、编译和 runner**

`compileBajieJoiningDraft(draft)` 只能读取互惠连接、输入槽、block type 和 operator 字段；输出每情境五条真实来源指令。`runBajieJoining(trace)` 在第一个不匹配情境停止并生成不可变失败快照；不得读取课程配置、坐标、React 状态或 `expectedSequence`。

- [ ] **Step 6: 注册 Blockly 块和 serializer/restore**

operator 字段只允许儿童可见 `同时满足（AND）` 与 `满足一个即可（OR）`。两个故事传感器可交换左右输入但不可删除；顶层和分支动作固定。恢复时对有限坐标安全夹紧，编译语义仍来自连接。

- [ ] **Step 7: 重跑窄测试到 GREEN**

Run:

```bash
./node_modules/.bin/vitest run src/blockly/weekThreeBajieJoiningContract.test.ts src/blockly/weekThreeBajieJoiningCompiler.test.ts --reporter=dot
```

Expected: both test files PASS；默认 OR、正确 AND、左右交换、结构攻击和坐标防伪均有断言。

### Task 2: Progress revision 6、session、formal proof 与迁移 RED→GREEN

**Files:**
- Create: `src/progress/bajieJoiningSessionSchema.ts`
- Create: `src/progress/weekThreeBajieJoiningSession.test.ts`
- Modify: `src/progress/types.ts:248-316`
- Modify: `src/progress/session.ts`
- Modify: `src/progress/schema.ts:1599-1987`
- Modify: `src/progress/schema.test.ts`
- Modify: `src/progress/progress.ts:155-250`
- Modify: `src/progress/progress.test.ts`
- Modify: `src/components/ParentEquipmentReport.tsx:29-71`

- [ ] **Step 1: 写 revision 5→6 与历史兼容 RED**

测试必须证明：旧 W3-M4 completion 迁移为 `legacy-preformal`；它不生成 session/proof，也不新解锁 W3-M5；若旧存档的 W3-M5 本身已经完成，则生成独立 `legacy-replay-only` 来源标记并保留重播，即使旧档没有 W3-M4。revision 1～5 全部迁移为 6，未知 revision 和额外 key fail closed。

- [ ] **Step 2: 写 session 重放和编辑失效 RED**

```ts
const session = createMissionSession('w3-m4', NOW);
const trace = compileBajieJoiningDraft(session.workspace);
const failed = recordRun(session, runBajieJoining(trace), trace, NOW);
expect(failed.failureSnapshot?.scenarioId).toBe('practice-precepts-only');

const corrected = structuredClone(failed.workspace);
const operation = corrected.blocks.find((block) => block.id === 'bajie-boolean-operation');
if (!operation) throw new Error('missing bajie boolean operation');
operation.operator = 'and';
const edited = updateWorkspaceDraft(failed, corrected, NOW);
expect(edited).toMatchObject({ lastRun: null, lastTrace: [], scenarioResults: [], failureSnapshot: null });
expect(edited.totalRuns).toBe(1);
```

结构错误只增加 compile failure；有效失败才增加 total/runtime failure 并产生快照。观察记录保存不可变 workspace，snapshot ID 去重；parser 必须重编译重放并拒绝伪 trace/run/snapshot。

- [ ] **Step 3: 写 proof、前置和 W3-M5 解锁 RED**

W3-M4 入口只接受已完成的 W3-M3 `formal-v3`；W3-M4 bare completion/legacy evidence 不足。当前 W3-M4 AND 图三情境成功后，`completeMission` 才能原子生成 `formal-v3` evidence，并只开放 W3-M5 入口；W3-M5 仍不进入 executable registry。

- [ ] **Step 4: 运行 progress 窄测试确认 RED**

```bash
./node_modules/.bin/vitest run src/progress/weekThreeBajieJoiningSession.test.ts src/progress/schema.test.ts src/progress/progress.test.ts --reporter=dot
```

Expected: FAIL on missing W3-M4 session/evidence and schema revision 6.

- [ ] **Step 5: 添加精确类型和 parser**

新增 `BajieJoiningMissionSession`、`BajieJoiningCompletionEvidence`、`sessions['w3-m4']` 与 `missionCompletionEvidence['w3-m4']`。parser exact keys；`formal-v3` evidence 精确为 `{ kind, completedAt, verifiedAt, workspace, trace, run }`，并从 workspace 重编译重放到 `westward-team-departed`。

- [ ] **Step 6: 升级 revision 6 和迁移规则**

顶层输出 revision 6；保留 revision 1～5 parser。旧 W3-M4 completion 只能生成 `{ kind: 'legacy-preformal', completedAt, sourceVersion, sourceSchemaRevision }`。旧 W3-M5 自身已完成时生成独立、无 session/trace/run 的 `legacy-replay-only` marker；bare W3-M5 且没有 marker 或 formal W3-M4 时拒绝。当前 formal W3-M4 后完成 legacy W3-M5 不生成历史 marker，并须通过 JSON roundtrip。

- [ ] **Step 7: 扩展 session 写入、proof、unlock 和家长摘要**

`createMissionSession`、`updateWorkspaceDraft`、`recordRun`、`recordCompileFailure`、`recordConditionObservationUse` 添加 W3-M4 overload。报告只显示组合错误、运行/观察次数与 formal/legacy 摘要，不显示 raw ID、完整 trace 或答案图。

- [ ] **Step 8: 重跑 progress 窄测试到 GREEN**

```bash
./node_modules/.bin/vitest run src/progress/weekThreeBajieJoiningSession.test.ts src/progress/schema.test.ts src/progress/progress.test.ts --reporter=dot
```

Expected: PASS；迁移、严格 parser、proof replay、unlock 和历史访问均有明确断言。

### Task 3: 正式课程、唯一 workspace 与 lazy route RED→GREEN

**Files:**
- Create: `src/components/WeekThreeBajieJoiningBlocklyWorkspace.test.tsx`
- Create: `src/components/WeekThreeBajieJoiningBlocklyWorkspace.tsx`
- Create: `src/components/WeekThreeBajieJoiningRoute.test.tsx`
- Modify: `src/course/course.test.ts:108-125`
- Modify: `src/course/course.ts:56-60`
- Modify: `src/course/formalCourse.ts:85-113`
- Modify: `src/course/courseOutline.ts:64`
- Modify: `src/progress/executableMissionIds.ts:3-17`
- Modify: `src/progress/executableMissionIds.test.ts`
- Modify: `src/progress/types.ts`
- Modify: `src/components/MissionPageContent.tsx:95-101,306-308,919-945`

- [ ] **Step 1: 写课程和 route RED**

断言 W3-M4 formal、canon 指向第十九回、文案为“观音此前授戒/唐僧另名八戒”、无 `expectedSequence`、不进入 `LegacyMissionBuilder`/`MissionTools`；W3-M5 仍 legacy 且不可 executable。独立 lazy route 失败时只重试 W3-M4 Experience。

- [ ] **Step 2: 写 workspace RED**

测试默认 operator 真实为 OR；鼠标、触控、Enter/Space 操作同一 Blockly 字段切换 AND；左右传感器交换后保存 draft 并仍可成功；缺输入给出结构错误并聚焦真实组合块；恢复只恢复已保存图。

- [ ] **Step 3: 运行课程、route、workspace 测试确认 RED**

```bash
./node_modules/.bin/vitest run src/course/course.test.ts src/progress/executableMissionIds.test.ts src/components/WeekThreeBajieJoiningRoute.test.tsx src/components/WeekThreeBajieJoiningBlocklyWorkspace.test.tsx --reporter=dot
```

Expected: FAIL because W3-M4 is still legacy and the route/workspace do not exist.

- [ ] **Step 4: 正式注册 W3-M4 并纠正原著文案**

`formalWeekThreeMissions` 新增 W3-M4；从 `course.ts` 删除且只删除 W3-M4 legacy entry。`courseOutline.isFormalMissionOutline`、`ExecutableMissionId` 和 registry 新增 W3-M4；W3-M5 不变。

- [ ] **Step 5: 实现唯一 Blockly workspace 和独立 lazy route**

运行按钮只能提交从当前 workspace 序列化的 draft/trace。operator 辅助操作必须调用同一个 Blockly 字段 API，不维护 React 答案状态。route 传递 reduced motion、mute、lock、completion 和 persistence callbacks。

- [ ] **Step 6: 重跑课程、route、workspace 测试到 GREEN**

使用 Step 3 同一命令。Expected: PASS，并证明 W3-M5 未被意外正式化。

### Task 4: 保存优先 Experience、火眼金睛、Scene 与故障恢复 RED→GREEN

**Files:**
- Create: `src/components/WeekThreeBajieJoiningExperience.test.tsx`
- Create: `src/components/WeekThreeBajieJoiningExperience.tsx`
- Create: `src/components/WeekThreeBajieJoiningExperience.css`
- Create: `src/components/WeekThreeBajieJoiningScene.test.tsx`
- Create: `src/components/WeekThreeBajieJoiningScene.tsx`
- Modify: `src/components/MissionPageContent.tsx`

- [ ] **Step 1: 写默认失败与帮助边界 RED**

默认 OR 在原著卡通过、第一练习卡失败；失败 run 保存成功后才显示火眼金睛。观察只显示两个原子真值、当前 OR、组合结果、实际分支和公开依据；不得出现“AND”“改成”“正确运算符”等答案文案，不得改变 workspace 或重跑。

- [ ] **Step 2: 写四类保存故障和 CAS RED**

draft/run/observation/completion 任一 `unsaved` 都保留精确 payload 与可见重试，不播放未保存结果。`conflict` 显示下载当前积木备份和显式载入其他标签页进度；不得静默覆盖。

- [ ] **Step 3: 写 Scene 资源与播放 RED**

两张正式素材都 load 前不能发布 playback complete。失败状态只显示三卡判断；成功状态按 runtime events 显示“悟能说明 → 得名八戒 → 挑担西行”。reduced motion/mute 只改呈现，replay token 相同不得重复 completion。

- [ ] **Step 4: 运行 Experience/Scene 测试确认 RED**

```bash
./node_modules/.bin/vitest run src/components/WeekThreeBajieJoiningExperience.test.tsx src/components/WeekThreeBajieJoiningScene.test.tsx --reporter=dot
```

Expected: FAIL because components do not exist.

- [ ] **Step 5: 实现保存优先状态机和火眼金睛**

严格按 `save draft → compile/run → save run → play → save observation/completion` 顺序。编辑图立即清空旧结果和快照。结构错误记录 compile failure，不开放观察。completion 重新编译/重放当前保存图，并等待资源就绪和可见成功播放完成。

- [ ] **Step 6: 实现儿童安全 Scene 与局部 lazy recovery**

Scene 只读 runtime events；不读取 operator 作为隐藏答案，不决定成功。workspace chunk、scene chunk、背景和状态图各自有可见重试；页面其余区域保持可用。

- [ ] **Step 7: 重跑 Experience/Scene 及邻接 W3 测试到 GREEN**

```bash
./node_modules/.bin/vitest run src/components/WeekThreeBajieJoiningExperience.test.tsx src/components/WeekThreeBajieJoiningScene.test.tsx src/components/WeekThreeYunzhanDialogueExperience.test.tsx src/components/WeekThreeYunzhanDialogueScene.test.tsx --reporter=dot
```

Expected: PASS；W3-M3 无回归。

### Task 5: 正式素材、asset provenance 与包体预算 RED→GREEN

**Files:**
- Create: `public/assets/week-three-bajie-joining/bajie-joining-background.webp`
- Create: `public/assets/week-three-bajie-joining/bajie-joining-states.webp`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`
- Modify: `scripts/budget-limits.mjs`
- Modify: `scripts/budget-limits.d.mts`
- Modify: `scripts/check-bundle-budget.mjs`
- Modify: `scripts/check-bundle-budget.test.mjs`

- [ ] **Step 1: 先写 exact inventory、Scene slot 和 3 MiB 预算 RED**

新增 `WEEK_THREE_BAJIE_JOINING_COLD_LOAD_MAX_BYTES = 3 * 1024 * 1024`；asset verifier 要求目录中恰好两张指定 WebP、Scene 精确引用、状态图有有效 alpha、单图和总媒体预算不超限、入口闭包不静态引入 Blockly/Scene。

- [ ] **Step 2: 运行 asset/bundle contract 确认 RED**

```bash
node --test scripts/check-asset-manifest.test.mjs scripts/check-bundle-budget.test.mjs
```

Expected: FAIL on missing W3-M4 inventory and budget constant.

- [ ] **Step 3: 使用内建 image generation 生成正式素材**

生成前调用项目允许的 `imagegen` skill。背景 prompt 必须描述明亮 3D 中国儿童绘本高老庄厅堂/庭院、无文字、无捆绑、揪耳、攻击或婚姻暗示。状态图 prompt 必须描述一致角色的“说明观音安排、得名八戒、挑担西行”透明分格、无生成文字和攻击姿态。

- [ ] **Step 4: 原尺寸目视检查并记录 provenance**

使用原尺寸图像检查；拒绝伪字、错误肢体、棋盘格、角色不一致、裁切和攻击导向。记录完整 prompt、生成/编辑过程、尺寸、字节、SHA-256、alpha、slot 和 `visual-qa-passed`。单张 ≤512 KiB，总和 ≤1.25 MiB。

- [ ] **Step 5: 扩展 asset 和 bundle verifier**

新增独立 `verifyRequiredWeekThreeBajieJoiningInventory`，不复制 W3-M3 ID/slot。build manifest 中定位 W3-M4 Experience lazy closure；保留所有旧预算常量原值。

- [ ] **Step 6: 重跑资产、构建和包体门禁到 GREEN**

```bash
npm run test:assets
npm run verify:assets
npm run build
npm run verify:bundle
```

Expected: all exit 0；记录 W3-M4 两图实际字节与 lazy closure raw/gzip 数值。

### Task 6: E2E 防伪合同与五项目真实浏览器闭环

**Files:**
- Create: `scripts/check-week-three-bajie-joining-e2e-contract.mjs`
- Create: `scripts/check-week-three-bajie-joining-e2e-contract.test.mjs`
- Create: `e2e/week-three-bajie-joining.spec.ts`
- Modify: `e2e/support/storageFaultAdapter.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`

- [ ] **Step 1: 写 E2E source contract RED**

要求标签：`@w3-m4-full`、`keyboard`、`storage`、`corrupt`、`parent`、`cold`、`asset-fault`、`narrow`、`external`、`lazy`。禁止 `expectedSequence`、legacy tools、dynamic code、直接 localStorage W3-M4 session/proof、health 数组篡改、monkeypatch 和页面内注入成功。

- [ ] **Step 2: 运行 source contract 确认 RED**

```bash
node --test scripts/check-week-three-bajie-joining-e2e-contract.test.mjs
```

Expected: FAIL because the E2E file and tags do not exist.

- [ ] **Step 3: 扩展精确故障适配器**

新增 `fail-bajie-draft`、`fail-bajie-run`、`fail-bajie-observation`、`fail-bajie-completion` 和 `corrupt-bajie-current`；每个只拦截预期的 W3-M4 delta，不影响 W3-M1～M3 或其他进度字段。

- [ ] **Step 4: 写可见完整路径**

合法预置只到 W3-M3 formal prerequisite。进入 W3-M4 后必须通过可见 Blockly 操作：默认 OR 失败、保存快照、打开火眼金睛、断言图不变、键盘/触控改 AND、三卡成功、资源播放、刷新重播、parent export-import 和 W3-M5 入口开放。禁止注入 W3-M4 成功。

- [ ] **Step 5: 覆盖恢复、响应式和页面健康**

覆盖四类保存重试、CAS、损坏原文下载/恢复、workspace/scene/asset lazy retry、cold/404、mute/reduced motion、320/390/768/1440、Chromium/WebKit/Firefox。每个新 page 调用 `attachHealth`，在 `finally` 关闭，`afterEach` 精确断言 raw console/page/request/response health 为空。

- [ ] **Step 6: 运行 source contract 与五项目专项到 GREEN**

```bash
node --test scripts/check-week-three-bajie-joining-e2e-contract.test.mjs
./node_modules/.bin/playwright test e2e/week-three-bajie-joining.spec.ts --reporter=line
```

Expected: source contract PASS；五项目所有映射 PASS。记录实际通过数量，不预先假定 24/24。

### Task 7: 新鲜全量验证、视觉复核与完成矩阵

**Files:**
- Create: `docs/verification/week-three-bajie-joining.md`

- [ ] **Step 1: 运行 unit、source、asset、type 和 build 全量验证**

```bash
npm test
npm run typecheck
npm run build
npm run verify:bundle
npm run verify:assets
git diff --check
```

Expected: commands exit 0 except any independently verified pre-existing full-suite failure, which must be listed by exact test and shown unrelated to W3-M4. 记录真实文件/断言数量，不能沿用历史数字。

- [ ] **Step 2: 运行 W2/W3 正式关统一浏览器回归**

```bash
./node_modules/.bin/playwright test \
  e2e/week-two-horse-care.spec.ts \
  e2e/week-two-monkey-king-events.spec.ts \
  e2e/week-two-peach-elixir-debug.spec.ts \
  e2e/week-two-furnace-condition.spec.ts \
  e2e/week-two-heavenly-signal-boss.spec.ts \
  e2e/week-three-manor-help-condition.spec.ts \
  e2e/week-three-cuilan-boolean.spec.ts \
  e2e/week-three-yunzhan-dialogue.spec.ts \
  e2e/week-three-bajie-joining.spec.ts \
  --reporter=line
```

Expected: all selected formal mission tests PASS；记录实际项目映射总数。

- [ ] **Step 3: 运行全站 E2E 审计**

```bash
npm run test:e2e -- --reporter=line
```

Expected: 记录完整 pass/fail。任何 W1/shared 历史失败继续阻断全站完成声明；不得因 W3-M4 专项通过而省略。

- [ ] **Step 4: 主代理逐张视觉和交互复核**

检查 desktop/tablet/mobile/Firefox/narrow 的默认、失败、观察、正确和成功截图；确认无横向溢出、遮挡、伪字、捆绑/攻击、练习卡冒充原著、错误授戒者或错误角色顺序。键盘、触控、mute、reduced motion 与焦点必须实际操作验证。

- [ ] **Step 5: 写完成验证记录**

`docs/verification/week-three-bajie-joining.md` 必须包含：现场和授权、玩家可见行为、防伪/持久化、自动命令实际结果、资产 hash/尺寸/QA、五项目截图审计、全站失败边界、completion matrix 和残余风险。

- [ ] **Step 6: 最终状态检查并保持未提交**

```bash
git status --short --branch
git diff --check
git diff --stat
```

Expected: 仅 W3-M4 范围的本地未提交修改；无 commit、push、PR、merge 或 deploy。最高声明 W3-M4 `One-level playable`；W3-M5、第三周系统闭环、30 关、全站、商业生产和部署均为 `not complete`。

## 计划自检

- 规格中的玩家输入、三张卡、默认 OR、正确 AND、左右可交换、原著终局、结构错误、有效失败、火眼金睛、零惩罚、保存优先、CAS、损坏恢复、revision 6、历史兼容、proof、W3-M5 解锁、正式素材、预算和五项目浏览器路径均有对应任务。
- `BajieJoining*`、`w3-m4`、`formal-v3`、`schemaRevision: 6`、`westward-team-departed`、三个 scenario ID 和五类 storage fault 名称在所有任务中一致。
- 没有占位符、跨任务模糊引用或未定义函数；每个测试命令都有预期 RED/GREEN 结果。
- 没有 commit/push/PR/merge/deploy 步骤；依赖缺失会在 Task 0 停止并请求用户授权，不再触发自动下载。
- 计划只覆盖 W3-M4 及其必要 Progress/课程/报告/素材/测试接口；W3-M5 仍 legacy，不把单关完成外推到第三周或全站。
