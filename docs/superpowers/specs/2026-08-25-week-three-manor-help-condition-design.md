# W3-M1 庄上求助与火眼金睛条件观察设计规格

## 目标、范围与完成边界

将 `w3-m1 庄上求助` 从 legacy `expectedSequence`、`LegacyMissionBuilder` 与 `MissionTools` 兼容路径升级为第一个真实 Blockly 条件关，并让它成为“火眼金睛·条件观察”的第一个正式能力消费者。已批准玩法是同图双情境真假检验：孩子必须让同一张可见 Blockly 图正确处理一则原著求助和一则明确标记的非原著练习口信。

本规格的最高目标是单关 `One-level playable`，不会把 W3-M2～W3-M5 升级为正式关，也不把第三周、系统循环、全内容或商业发布描述为完成。W3-M2～W3-M5 保持 legacy。实现过程中不提交、不推送、不部署、不新建或切换 worktree、不清理或回退任何 W1/W2 未提交内容。

本文件已随用户对方案 A 的批准进入 **Design complete**：玩法、状态、风险和可执行验收均已固定。此结论只代表设计文档已完成自检；当前实现及 `One-level playable` 仍为 **not complete**，须由后续代码、真实浏览器和持久化证据取得。

## 原著依据与情境边界

原著唯一依据是项目课程使用的 [《西游记》第十八回](https://zh.wikisource.org/zh-hans/西游记/第018回)。高才奉高太公之命外出寻找能降妖的法师；悟空听清来意后主动应承，请高才回庄禀报，随后由高太公迎请入庄。关卡所判断的是“口信是否明确请求降妖帮助”，不是“是否提到高老庄”、来人外貌、紧张程度或是否单独提到妖怪。

两张固定、公开可见的口信按固定顺序运行：

1. `canon-gaocai-help`：**原著情境**。高才说明自己奉高太公之命，正在寻找能降妖、解救庄上困扰的法师；预期进入应承分支。
2. `practice-manor-directions`：**练习情境·不改变原著**。庄客只介绍高老庄的位置与道路，明确没有请求帮助；预期进入继续问路分支。它不写入原著事件、不改变原著叙事，也不替代高才。

正确完成后，场景对原著情境显示“高才回庄禀报 → 高太公邀请入庄”；练习情境只显示“继续问路前行”。两者都是运行结果的可见反馈，不能反向决定执行成功。

## 已批准的可见 Blockly 玩法

首次进入给出一张持久、可编辑、真实连接的 Blockly 图，预置错误条件。图的目标结构固定为：

```text
收到当前口信
如果【口信是在明确请求降妖帮助】
    主动应承，并请来人回庄禀报
否则
    继续问路前行
```

默认图将条件槽连接为 `口信提到了高老庄`。它在两张口信中都返回 true，因此原著情境虽表面正确，练习情境会被误送进“主动应承”分支。孩子必须在同一张图中编辑真实条件块，并保有真实 `then` 与 `else` 分支；只通过任一情境都不能完成。

建议的零 UI Blockly 合同只定义本关需要的块：

- 根块 `w3_manor_receive_message`；
- 分支容器 `w3_manor_if_message`，有一枚 `CONDITION` 值输入和互斥的 `THEN`、`ELSE` 语句容器；
- 条件块 `w3_manor_condition_explicit_demon_help`（正确）和 `w3_manor_condition_mentions_gao_manor`（默认错误）；
- 动作块 `w3_manor_accept_and_return_notice` 与 `w3_manor_continue_journey`。

不得给儿童第二张程序图、文字答案树、场景按钮或隐藏选择器。鼠标、触摸和键盘辅助都必须编辑这同一 Blockly workspace；课程文案、React 数组、积木坐标与动画只可呈现结果，不能构成执行或答案来源。

## 唯一事实源、编译合同与诊断

唯一事实链为：`visible workspace → serialized draft → compiler → canonical trace → deterministic runtime`。每次运行和导入都从当前可见图重新生成，严禁读取 `expectedSequence`、`LegacyMissionBuilder`、`MissionTools`、React 预设动作数组、坐标、动画状态或其他隐藏状态来决定成功。

草稿为可版本化的 `ManorHelpWorkspaceDraft`，保存稳定 `blockId`、`type`、坐标、输入连接、`previousId/nextId`、`parentBlockId` 与容器归属。连接须互惠；坐标仅用于恢复画面。编译器输出按场景可重放的 `ManorHelpTrace`，每条指令至少包含：

- `instructionId`、`opcode`、`sourceBlockId`、`parentBlockId`；
- `scenarioId`；
- 条件检查的 `conditionSourceBlockId`、`conditionKind`、`conditionLabel`、`observedValue` 与公开 `evidenceCode`/`evidenceTextKey`；
- `actualBranch: 'then' | 'else'`，以及分支动作的来源积木。

编译必须拒绝空图、多根主链、断线、缺条件、缺 `then` 或 `else`、未知块、孤立块、跨容器连接、非互惠连接、循环、重复或遗漏的必需根/分支动作、错误输入形状和工作区边界违规。运行时还须拒绝“条件正确但分支动作错误”、错误条件、错误分支和“只通过一个 scenario”。每个诊断都引用真实可聚焦的块；若缺失对象而无法聚焦，焦点落在缺口所属的 `if` 容器。儿童语言需说明原因，例如“这封练习口信提到高老庄，却没有请求降妖帮助，所以不该主动应承”。

所有失败都是零惩罚：生命、资源、星级和既有完成记录均不减少。诊断、失败记录和重试不会把错误图改成正确图。

## 确定性运行与状态机

每次运行以相同图依次处理两个固定 scenario；两次条件判断互不复用缓存。单情境状态为：

`message-received → condition-observed → then-accepted-return-notice | else-continued-journey → scenario-settled`。

整关状态为：

`idle → compiling → running-canon → running-practice → failed | ready-to-persist-success → persisted-success → scene-ready → completed`。

运行规则如下：

1. 编译只从可见图生成 trace；结构问题停在 `failed`，不会开始场景播放。
2. 对 `canon-gaocai-help`，正确条件的值为 true，正确实际分支为 `then`，动作必须是 `accept-and-return-notice`。
3. 对 `practice-manor-directions`，正确条件的值为 false，正确实际分支为 `else`，动作必须是 `continue-journey`。
4. 默认“提到了高老庄”在两次检查都为 true；第二张练习口信的实际 `then` 分支构成确定性失败，不允许首张碰巧通过即通关。
5. 只有两个 `scenarioResult` 均为 success、trace 与运行结果被本地成功持久化、Scene 资产已就绪且播放完成，才可以写入 `missions['w3-m1']` 的 completed 记录并解锁后续课程顺序中的内容。

未持久化的结果不得播放、通关或解锁。保存失败会停留在可重试的失败状态，界面明确说明“这次结果还没有保存，不能算完成”。

## 火眼金睛·条件观察

### 获得与稳定解锁

能力状态独立于任务 session，采用可校验记录 `conditionObservation`：

- W2-M4 的已持久化完成结果使 `acquiredAt` 可得，代表孩子已经获得能力；
- W2-M5 的已持久化完成结果使 `stableUnlockedAt` 可得，代表能力稳定解锁并按已持久化课程顺序开放 W3-M1；
- W2-M5 的保存失败、回滚失败、未发布 completion 或伪造导入绝不得写入 `stableUnlockedAt`，也不得解锁 W3-M1；
- 对 schemaRevision 3 之后的新完成，能力状态只由已安全持久化的 mission completion 派生；若已有对应正式 session，session 必须能重编译、重放并与 mission completion 一致。对旧 revision 迁移，既有合法 `missions['w2-m4'].completedAt` 与 `missions['w2-m5'].completedAt` 是兼容性事实源，可确定性生成 `acquiredAt` 与 `stableUnlockedAt`，不要求历史上不可能存在的正式 session；但旧文档若已含对应 session，则仍必须重编译、重放并与 mission completion 一致。能力声明字段永远不能自行授予或稳定解锁。

W3-M1 只在 `acquiredAt` 和 `stableUnlockedAt` 都存在、且本次正式关运行已失败并成功持久化失败快照时，显示孩子主动点击的“火眼金睛·条件观察”。它不是自动弹窗，不扣星，不计入普通 `usedHintTiers`，也不替代任何一档普通提示。

### 可见信息与不可跨越的边界

观察只读取失败快照，显示：当前 `conditionLabel`、本次 `true`/`false`、公开口信依据，以及实际走入的 `then`/`else` 分支。快照必须包含 `conditionSourceBlockId`、`conditionKind`、`scenarioId`、`observedValue`、`evidenceCode`/`evidenceTextKey` 与 `branch`，从而能把观察与真实运行对应起来。

观察严禁：修改 Blockly、替换条件、选择分支、运行、聚焦正确答案、展示正确条件、完整 trace、下一步或完整答案。它也不移动焦点到可能暗示答案的积木，只显示失败运行中已实际检查的块和公开口信文本。

编辑 workspace 后旧快照立即失效且不可再显示；同一未失效快照可反复查看，但其 `snapshotId` 只记录一次使用审计。观察前后，除审计字段外，workspace、missions、completion、stars、trace 和两个 scenario results 必须深相等。家长报告只显示“已获得 / 已稳定 / 主动观察使用次数和最近使用时间”的摘要，不呈现孩子的口信内容、完整 trace 或答案。

## Progress V3、保存、恢复与防伪

当前 `version: 3, schemaRevision: 2` 的 Progress V3 在实现本关时升级为 `schemaRevision: 3`。V1、V2 与 V3 revision 1/2 文档均通过明确迁移进入 revision 3，保留并校验既有 `missions`、`equipment`、`privacy`、`recovery`、`sessions`、settings 与保存元数据；未知、缺失、非法或矛盾字段 fail closed。迁移只可从合法的旧任务 completion 及其存在时可验证的 session 生成能力状态，不能凭空宣称 W2-M4/W2-M5 完成，也不能让能力声明字段自行授予或稳定解锁观察能力。

`sessions['w3-m1']` 的类型、creator 与 parser 必须是专用 `ManorHelpSession`，至少保存：

- 当前 `workspace` 及可重编译 draft fingerprint；
- `lastTrace`、两个带 `scenarioId` 的 `scenarioResults`、最近 `failureSnapshot`、condition provenance、actual branch；
- `runs`、compile/runtime `failures`、`usedHintTiers`、fire-eye uses、`lastRunAt`、`savedAt`；
- 用于快照去重的 `snapshotId` 和仅一次写入的使用审计时间。

每一次 workspace 编辑保留累计学习计数，但清除与旧图不匹配的 trace、scenario results、failure snapshot 和 run 结果。导入解析器必须从 draft 重新编译、按固定双场景重跑，并逐字段比较 trace、scenario、condition、provenance、实际分支、失败快照、能力状态及允许的计数/时间演进；伪造 scenario、trace、condition、ability、完成或解锁均拒绝。

继续使用 Progress coordinator 的草稿、运行、完成三类保存失败重试；损坏 current 原文下载后再恢复；snapshot 恢复；跨标签 revision CAS 和冲突备份；刷新、重开、导入导出。in-flight 写入按同一 draft 合并，晚到草稿保存不能擦掉刚保存的运行、观察审计或完成证据。任何能力或任务状态写入都要通过 CAS 后再发布到 UI。

课程注册必须同步完成下列正式边界：`formalCourse` 新增不含 `expectedSequence` 的 W3-M1；`isFormalMissionOutline('w3-m1')` 为 true；`executableMissionIds` 加入 W3-M1；Mission 页面给 W3-M1 专用 lazy route；session types、creator/parser、schema 与 import/export 注册同名专用类型。W3-M2～W3-M5 不得被这些改动意外登记为正式或 executable。

## UI、资产、无障碍与健康边界

页面保持明亮 3D 中国儿童绘本方向。正式实现前通过内建图像生成制作高老庄求助背景与双情境状态资产，不能以 emoji、CSS/div 绘图、手写 SVG、代码绘图或临时画面代替。每个 shipping asset 在 manifest 中完整记录用途、生成工具、prompt 或原著来源、编辑过程、SHA-256、尺寸、许可/provenance、屏幕 slot 和原尺寸 visual QA；只有 manifest 与生成文件匹配且为 `visual-qa-passed` 才进入完成证据。

真实 Blockly 在 320、390、768、1440 宽度均清晰可见且无横向溢出；键盘能完成与鼠标等价的选择、替换条件、连接真/假分支、删除及恢复。mute 和 reduced-motion 只改变声音、转场与动画强度，不改变条件值、trace、分支、保存或完成语义。专用 Experience、Workspace、Scene 均 lazy load；任一任务 asset、chunk 或场景资源失败都显示局部重试入口，页面健康检查 fail closed，恢复前不能发布运行或完成。

## 实现前预算门禁

在第一项生产行为前，以 RED contract 锁定以下预算：

- W3-M1 cold path：`3 * 1024 * 1024` bytes；
- entry、home、Phaser、scene 与 W1/W2 既有预算均不得提高；
- 单张 raster 上限 `512 * 1024` bytes；
- 单任务媒体总量：`MAX_MISSION_MEDIA_BYTES = 1.25 * 1024 * 1024` bytes；任何新媒体必须在该门禁内。

预算、source/bundle contract 和资产合同必须先失败再实现；事后记录数值不构成通过。

## 可执行验收

1. unit 与 source/bundle contract 先锁定正式注册、专用 lazy route、无 `expectedSequence`/legacy 执行源、W3-M2～M5 仍 legacy、3 MiB cold path 及既有预算不变。
2. block/compiler contract 覆盖唯一根、condition slot、真/假容器、稳定 source/parent provenance、双情境 trace；覆盖空图、断线、缺条件、缺 then/else、孤立、跨容器、非互惠连接、环、错误形状、错误条件、错误分支和只过一个情境，并断言儿童诊断聚焦真实块。
3. deterministic runner 覆盖默认错误条件使两次为 true、原著 true/then、练习 false/else、两个 scenario 成功、零惩罚、可重放和正确可见结果。
4. Progress/schema/session 测试覆盖 revision 3 与 V1/V2/V3 旧 revision 迁移、专用 creator/parser、保存后再播放/完成/解锁、草稿/运行/完成三类保存失败、三类重试、刷新、重开、损坏原文下载与恢复、snapshot、CAS、导入导出、伪造拒绝与 W1/W2 回归保护。
5. 能力测试覆盖 W2-M4 acquired、W2-M5 已持久化完成才 stableUnlocked、W2-M5 保存失败不可稳定解锁也不可解锁 W3；失败快照字段完整；同一 snapshot 多次查看只审计一次；编辑图使旧 snapshot 失效；观察前后除审计字段外的深相等；家长报告只含摘要。
6. asset contract、manifest 全字段、hash/尺寸/slot、bundle 预算、TypeScript、production build、asset visual QA 与 `git diff --check` 均需有新鲜通过输出。
7. 五项目真实浏览器矩阵为 1440 Chromium、768 WebKit、390 Chromium、1440 Firefox、320 Chromium。每个相关路径用孩子可见操作完成“默认失败 → 主动火眼观察 → 图不变 → 修复 → 双情境成功 → 持久化 → 刷新重播”，且覆盖键盘、窄屏、mute/reduced-motion、asset/lazy/404/page-health、三类保存失败、损坏恢复、CAS、导入导出与家长报告。可合法预置前置任务进度，但禁止注入 W3-M1 成功；禁止 `page.evaluate` 直接通过、隐藏修改 workspace 或绕过可见 Blockly。

## 规格自检

- 所有故事、双情境、条件真值、分支、失败快照与完成要求相互一致：高才求助为 true/then，练习问路为 false/else，默认“提到高老庄”为两次 true 并在练习情境失败。
- 事实源、正式注册、Progress migration、能力审计、保存前置与浏览器验收均有明确责任边界，没有将装饰层、隐藏状态或单情境成功当作完成。
- 范围仅覆盖 W3-M1 与其作为火眼金睛消费者所需的最小 Progress/报告接口；不会外推 W3-M2～M5、第三周系统循环、全站验证或发布。
- 当前仅为 **Design complete**；任何实现、资产、浏览器和持久化证据缺失时均为 **not complete**。
