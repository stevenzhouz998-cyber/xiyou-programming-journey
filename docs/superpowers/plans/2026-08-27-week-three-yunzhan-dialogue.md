# W3-M3 云栈洞双轮对话分支 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven-development task-by-task. The user subsequently activated `model-squad`: Terra is the single production-code writer, Luna is read-only, and the primary agent owns product decisions, assets, independent verification, and final acceptance. No Git commit is authorized.

**Goal:** 把 W3-M3「云栈洞交锋」升级为由同一张可见 Blockly 图驱动、可失败恢复并保存正式证明的双轮对话条件分支关卡。

**Architecture:** 新增独立 `YunzhanDialogue` Blockly 合同，把固定条件和两枚可移动动作块编译为 canonical trace；runner 用两轮公开话语分别产生 false/ELSE 与 true/THEN。Progress V3 升级 revision 5，session、完成证明、导入恢复都必须从保存的 workspace 重编译并重放，React 场景只消费 runtime events。

**Tech Stack:** React 19、TypeScript、Blockly、Vitest、Testing Library、Playwright、Progress V3、WebP 项目素材。

**Model-squad split:** Terra implements Tasks 1–4 and production/test integration as the only code writer; Luna performs a read-only inventory of Progress/asset/bundle/E2E gate touchpoints; the primary agent generates and inspects art, checks Terra's diff, runs all fresh verification, fixes only after Terra has stopped writing, and reports the evidence level.

---

## 文件职责

- `src/blockly/weekThreeYunzhanDialogueContract.ts`：图结构、两轮公开输入、canonical trace、runner、失败快照和零惩罚。
- `src/blockly/weekThreeYunzhanDialogueBlocks.ts`：固定条件和两枚可移动动作块的 Blockly 注册与儿童文案。
- `src/blockly/weekThreeYunzhanDialogueCompiler.ts`：从可见 Blockly 连接序列化、恢复和编译；坐标不参与判定。
- `src/components/WeekThreeYunzhanDialogueBlocklyWorkspace.tsx`：唯一 workspace、拖动/触摸/键盘交换、保存队列、结构错误反馈。
- `src/components/WeekThreeYunzhanDialogueExperience.tsx`：保存优先的 draft/run/observation/completion 状态机、CAS 和故障恢复。
- `src/components/WeekThreeYunzhanDialogueScene.tsx`：只消费 runtime events 的儿童安全双轮对话场景。
- `src/progress/yunzhanDialogueSessionSchema.ts`：严格 session parser；重编译、重放和观察快照校验。
- `src/progress/{types,session,schema,progress}.ts`：revision 5、W3-M3 session/proof、W3-M4 解锁和家长摘要集成。
- `src/course/{course,formalCourse}.ts`、`src/components/MissionPageContent.tsx`：正式课程和独立 lazy route。
- `public/assets/week-three-yunzhan-dialogue/*.webp`：正式云栈洞场景素材；不参与成功判定。
- `e2e/week-three-yunzhan-dialogue.spec.ts`：真实浏览器默认失败、观察、交换成功、刷新、存档故障、损坏隔离、CAS、导入导出、键盘、响应式和资源失败。

### Task 1: Blockly 合同与编译器 RED→GREEN

**Files:**
- Create: `src/blockly/weekThreeYunzhanDialogueContract.test.ts`
- Create: `src/blockly/weekThreeYunzhanDialogueCompiler.test.ts`
- Create: `src/blockly/weekThreeYunzhanDialogueContract.ts`
- Create: `src/blockly/weekThreeYunzhanDialogueBlocks.ts`
- Create: `src/blockly/weekThreeYunzhanDialogueCompiler.ts`

- [ ] 先写测试：默认图 THEN=守洞、ELSE=说明来历，编译成功但 runner 在第一轮失败；交换后 canonical trace 精确为第一轮 false/ELSE/守洞、第二轮 true/THEN/说明来历并成功。
- [ ] 写防伪测试：缺条件、缺分支、重复动作、孤儿块、非互惠连接、跨容器连接、循环、未知类型、伪造 trace、坐标变化均分别拒绝或不改变 trace。
- [ ] 运行 `npx vitest run src/blockly/weekThreeYunzhanDialogueContract.test.ts src/blockly/weekThreeYunzhanDialogueCompiler.test.ts`，确认因模块不存在而 RED。
- [ ] 实现最小合同：固定 `pilgrimage-explicit` 条件、`guard-cave`/`explain-guanyin-origin` 动作、两个公开 round、失败 snapshot 和零惩罚。
- [ ] 实现真实 Blockly serializer/compiler/restore；只读 `CONDITION`、`THEN`、`ELSE` 连接，禁止坐标驱动成功。
- [ ] 重跑同一命令到 GREEN。

### Task 2: Progress revision 5、session 与正式证明 RED→GREEN

**Files:**
- Create: `src/progress/yunzhanDialogueSessionSchema.ts`
- Create: `src/progress/weekThreeYunzhanDialogueSession.test.ts`
- Modify: `src/progress/types.ts`
- Modify: `src/progress/session.ts`
- Modify: `src/progress/schema.ts`
- Modify: `src/progress/schema.test.ts`
- Modify: `src/progress/progress.ts`
- Modify: `src/progress/progress.test.ts`

- [ ] 先写测试：revision 4 迁移到 5 时保留历史 W3-M3 完成但只标 `legacy-preformal`；新玩家必须持有当前 W3-M2 formal proof 才能进入 W3-M3。
- [ ] 写测试：结构错误只增加 compile failure，不增加有效 run，也不解锁火眼金睛；有效失败保存 snapshot；草稿变更清空旧 run/snapshot；观察使用保存不可变 workspace 且不修改图。
- [ ] 写测试：W3-M3 完成必须由当前 session workspace 重编译重放成功才生成 `formal-v3`；导入伪造 trace/run、过期 proof 或不完整 session 都拒绝；成功 proof 解锁 W3-M4，但不正式化 W3-M4。
- [ ] 运行窄 progress 测试确认 RED。
- [ ] 添加 `YunzhanDialogueMissionSession`、`YunzhanDialogueCompletionEvidence`、session overload、严格 parser、revision 5 migration 和 proof replay。
- [ ] 重跑窄 progress 测试到 GREEN。

### Task 3: 正式课程、唯一 workspace 与 route RED→GREEN

**Files:**
- Create: `src/components/WeekThreeYunzhanDialogueBlocklyWorkspace.test.tsx`
- Create: `src/components/WeekThreeYunzhanDialogueBlocklyWorkspace.tsx`
- Create: `src/components/WeekThreeYunzhanDialogueRoute.test.tsx`
- Modify: `src/course/course.test.ts`
- Modify: `src/course/course.ts`
- Modify: `src/course/formalCourse.ts`
- Modify: `src/progress/executableMissionIds.test.ts`
- Modify: `src/progress/executableMissionIds.ts`
- Modify: `src/components/MissionPageContent.tsx`

- [ ] 先写 RED：W3-M3 formal 且无 `expectedSequence`，W3-M4/M5 保持 legacy；独立 lazy route 不进入 legacy 工具。
- [ ] 先写 workspace RED：默认真实连接接反；点击、Enter、Space 都交换同一 Blockly 连接并保存；删除分支产生 compile error；恢复只恢复已保存图。
- [ ] 实现 formal course、executable registry、route boundary 和 workspace 保存队列；运行按钮只能编译当前 workspace。
- [ ] 运行课程、route、workspace、compiler 测试到 GREEN。

### Task 4: Experience、火眼金睛、Scene 与故障恢复 RED→GREEN

**Files:**
- Create: `src/components/WeekThreeYunzhanDialogueExperience.test.tsx`
- Create: `src/components/WeekThreeYunzhanDialogueExperience.tsx`
- Create: `src/components/WeekThreeYunzhanDialogueExperience.css`
- Create: `src/components/WeekThreeYunzhanDialogueScene.test.tsx`
- Create: `src/components/WeekThreeYunzhanDialogueScene.tsx`
- Modify: `src/components/MissionPageContent.tsx`

- [ ] 先写 RED：默认有效失败保存后才显示火眼金睛；结构错误没有 snapshot/按钮；观察只显示条件、真假、文字依据、实际分支和实际动作，不出现正确动作或“交换”提示。
- [ ] 写四类写入故障 RED：draft/run/observation/completion 任何保存失败都 fail-closed、保持可见重试，不播放未保存成功结果；外部 CAS 不覆盖当前图。
- [ ] 写 Scene RED：两张素材加载前不能完成；资源失败可重试；reduced-motion/mute 只改变呈现，不改变 trace 或 facts。
- [ ] 实现保存优先状态机、replay、backup/reload、Scene runtime-event 播放和儿童安全文案。
- [ ] 重跑 Experience/Scene/邻接 W3 测试到 GREEN。

### Task 5: 正式素材、资产门禁与包体预算 RED→GREEN

**Files:**
- Create: `public/assets/week-three-yunzhan-dialogue/yunzhan-dialogue-background.webp`
- Create: `public/assets/week-three-yunzhan-dialogue/yunzhan-dialogue-states.webp`
- Modify: `docs/assets/asset-manifest.md`
- Modify: `scripts/check-asset-manifest.mjs`
- Modify: `scripts/check-asset-manifest.test.mjs`
- Modify: `scripts/budget-limits.mjs`
- Modify: `scripts/budget-limits.d.mts`
- Modify: `scripts/check-bundle-budget.mjs`
- Modify: `scripts/check-bundle-budget.test.mjs`

- [ ] 先写 exact inventory 和 3 MiB lazy closure 预算 RED。
- [ ] 用内置 image generation 生成明亮 3D 儿童绘本云栈洞洞口背景，以及两轮对话/守洞/放下钉耙说明来历状态图；禁止文字、伪字、命中攻击和拜师画面。
- [ ] 原尺寸目视检查后记录 prompt、用途、尺寸、hash、alpha、字节和 `visual-qa-passed`；每张不超过 512 KiB、组合不超过 1.25 MiB。
- [ ] 扩展 verifier，要求 Scene 精确引用两张资源、状态图 alpha 有效、lazy closure 不污染入口。
- [ ] 运行 `npm run test:assets && npm run verify:assets && npm run build && npm run verify:bundle` 到 GREEN。

### Task 6: 浏览器合同与五项目真实路径

**Files:**
- Create: `scripts/check-week-three-yunzhan-dialogue-e2e-contract.mjs`
- Create: `scripts/check-week-three-yunzhan-dialogue-e2e-contract.test.mjs`
- Create: `e2e/week-three-yunzhan-dialogue.spec.ts`
- Modify: `e2e/support/storageFaultAdapter.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`

- [ ] 先写 source-contract RED：要求 full/keyboard/storage/corrupt/parent/cold/asset-fault/narrow/external/lazy tags，禁止 legacy 与直接注入 W3-M3 成功数据。
- [ ] 扩展故障适配器：`fail-yunzhan-draft/run/observation/completion` 与 `corrupt-yunzhan-current` 只拦截预期差量。
- [ ] 写真实浏览器路径：默认失败→保存 snapshot→火眼金睛→交换动作→成功；刷新恢复、重播、W3-M4 解锁、键盘、触控尺寸、reduced motion、CAS、损坏隔离、导出导入、冷加载、404、素材和 lazy failure。
- [ ] 运行 source contract 与 `npx playwright test e2e/week-three-yunzhan-dialogue.spec.ts --reporter=line`；以实际项目映射数量记录结果。

### Task 7: 新鲜全量验证与完成矩阵

**Files:**
- Create: `docs/verification/week-three-yunzhan-dialogue.md`

- [ ] 运行 `npm test`、`npm run typecheck`、`npm run build`、`npm run verify:bundle`、`npm run verify:assets`、`git diff --check`，记录实际数量和 exit code。
- [ ] 运行 W2/W3 已正式关统一 Playwright 回归；再运行全站 `npm run test:e2e`，如有历史失败逐项披露，不能用专项绿灯代替全站结论。
- [ ] 目视检查 desktop/tablet/mobile/Firefox/narrow 的默认图、失败、观察、成功和恢复截图；确认无横向溢出、遮挡、伪字或攻击导向。
- [ ] 对照 completion matrix 审计 Blockly、Course、Parent/saves、UI/release 相关行，最高只报告 W3-M3 `One-level playable`；W3-M4/M5、第三周、全站和部署均为 `not complete`。
- [ ] 最终运行 `git status --short --branch && git diff --check && git diff --stat`；保持未提交、未推送、未创建 PR、未部署。

## 计划自检

- 规格中的两轮公开输入、固定条件、默认接反、同 workspace 交换、canonical trace、结构错误边界、失败快照保存后观察、零惩罚、恢复/CAS/导入导出、W3-M2 proof 门槛、W3-M4 解锁和原著边界均有对应测试与实现任务。
- `YunzhanDialogue*`、`pilgrimage-explicit`、`guard-cave`、`explain-guanyin-origin`、revision 5 和 `formal-v3` 在所有任务中一致。
- 没有把 W3-M4/M5、第三周、全站遗留或部署混入完成声明；没有任何 Git 外发步骤。

## Luna 只读审计映射（2026-08-27 补充）

这是一份审计证据，不替代主代理本轮现场复核。若行号或历史数量漂移，以当前代码与新鲜命令输出为准。

- [ ] **课程边界：** 从 `src/course/course.ts` 删除且仅删除 W3-M3 legacy `expectedSequence`；把 M3 加入 `formalCourse.ts`、`courseOutline.isFormalMissionOutline` 与 executable registry；W3-M4/M5 保持 legacy。
- [ ] **Revision 5 兼容：** schema 从 4 升 5，同时保留 v1-v4 解析、迁移与既有恢复路径；历史 W3-M3 completion 只能迁移为 `legacy-preformal`，不能伪造 session 或 formal proof。
- [ ] **前置与升级：** 新玩家进入 W3-M3 必须有当前 W3-M2 `formal-v3` proof；历史兼容沿用既有迁移规则。旧 W3-M3 legacy completion 在玩家用当前图重新完成后允许原子升级为 formal proof。
- [ ] **严格 session/evidence：** M3 session、completion evidence 与观察历史使用 exact-keys、all-or-nothing parser；workspace、canonical trace、run、failure snapshot 和 formal proof 全部重编译重放核对。完成 mission 与 proof 同次原子写入，伪造或过期字段 fail closed。
- [ ] **解锁与报告：** formal W3-M3 proof 解锁 W3-M4；weekly/parent report 只显示已保存正式证明、运行/观察摘要，不显示 raw block ID、trace、正确动作、答案图或交换提示。
- [ ] **唯一事实源：** 复用 W3-M2 的 visible workspace → compiler → canonical trace → replay 结构语义，但不得复制 W3-M2 内容、mission ID、condition kind 或 proof key。
- [ ] **独立素材：** 使用精确文件 `yunzhan-dialogue-background.webp`、`yunzhan-dialogue-states.webp` 与独立目录；新增 exact inventory、Scene source verifier、manifest provenance、原尺寸 visual QA 与 alpha-edge 检查，不能把 W3-M2 素材冒充云栈洞。
- [ ] **包体门禁：** 新 lazy route cold-load 固定上限 3 MiB；保持首页闭包不静态引入 Blockly/Phaser，并验证生产 manifest 的 W3-M3 closure。
- [ ] **存档故障：** `fail-yunzhan-{draft,run,observation,completion}` 只拦截相应精确 delta；`corrupt-yunzhan-current` 保留原始损坏 bytes 并恢复最后合法快照；所有故障禁止未保存播放、完成或 proof 写入。
- [ ] **AST E2E 防伪：** source contract 只允许预载正式 W3-M2 前置；进入 M3 后必须通过可见 Blockly 操作。禁止 direct localStorage M3 session/proof、`expectedSequence`、`LegacyMissionBuilder`、动态执行、monkeypatch 与 health mutation。
- [ ] **Page health：** 所有新 page 调用 `attachHealth`，在 `finally` 中 close；`afterEach` 对 raw console/page/request/response health events 精确断言空数组。
- [ ] **五项目矩阵：** 按实际 Playwright 项目映射覆盖 full/keyboard/storage/corrupt/parent/cold/asset-fault/narrow/external/lazy，再运行正式关统一回归、typecheck、build、bundle、assets、diff check 与真实浏览器截图复核。
- [ ] **历史证据边界：** `107 files / 1158 unit`、`160 source/bundle`、`44 assets`、M2 `24/24`、统一 `154/154`、全站 `315/340` 均只作历史参考；最终数字必须来自本轮新鲜验证。
- [ ] **完成声明：** 最高 W3-M3 `One-level playable`；W3-M4/M5、第三周系统闭环、全站、商业生产与部署均为 `not complete`。
