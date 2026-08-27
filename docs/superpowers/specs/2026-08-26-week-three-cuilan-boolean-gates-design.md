# W3-M2 变化高翠兰双闸门布尔判断设计规格

## 目标、范围与完成边界

将 `w3-m2 变化高翠兰` 从 legacy `expectedSequence`、`LegacyMissionBuilder` 与 `MissionTools` 兼容路径升级为一关由真实可见 Blockly 图驱动的布尔判断任务。已批准玩法为 **双闸门真假调试**：变化完成后，“外形和高翠兰相同”为真，“真实身份是高翠兰”为假；孩子必须让两个检查点分别读取正确的故事事实，才能先维持伪装、再在取得线索后显出悟空本相。

本任务预选且最高允许报告的等级是单关 `One-level playable`。W3-M3～W3-M5 保持 legacy；第三周 `System loop complete`、全站 `Full-content verified`、`Commercial production complete` 与公开部署均不在本关完成范围内。任一真实浏览器、持久化、失败恢复、资产或预算门禁缺失时，必须把 W3-M2 报告为 `not complete`。

用户已批准方案 A，因此本规格达到 **Design complete**。这只代表玩法、状态、风险和可执行验收已固定；生产实现仍为 `not complete`。未经用户再次明确批准，不执行 commit、push、PR 或 deploy，也不新建、切换或清理 worktree。

## 原著依据与叙事边界

原著依据是项目课程使用的 [《西游记》第十八回](https://zh.wikisource.org/zh-hans/西游记/第018回)。悟空让高翠兰离开后，变作她的模样等候；猪刚鬣被外形骗过，没有认出真实身份。悟空通过对话得知对方姓名与福陵山云栈洞住处，随后显出本相，猪刚鬣脱身逃走。

[第十九回](https://zh.wikisource.org/zh-hans/西游记/第019回) 从追赶至云栈洞、交锋和说明来历展开。W3-M2 必须在“显出本相、妖怪逃走”结束；追赶、云栈洞交锋、取经人名号和受菩萨点化的来历留给 W3-M3 以后，不得提前消费。

儿童呈现不复刻原著中的亲密接触、卧床或成人婚姻细节。正式画面只表现高翠兰已安全离开、悟空完成变化、妖怪在门口或房中被外形迷惑、悟空从对话取得姓名住处、显出本相和妖怪逃走。孩子编写的是观察与判断程序，不编写欺骗、亲密或攻击动作。

## 已批准的可见 Blockly 玩法

首次进入显示一张持久、可编辑、真实连接的 Blockly 图。默认图只有一个课程性错误：第二道闸门错误地再次检查外形。

```text
变作高翠兰

如果【外形和高翠兰相同】
    保持伪装，等待妖怪进屋
否则
    调整变化

妖怪进屋；从对话得知姓名和云栈洞住处

如果【外形和高翠兰相同】       ← 默认错误条件
    继续装作高翠兰
否则
    显出悟空本相
```

孩子必须把第二道条件换为 `真实身份是高翠兰`。它的运行值为假，因此程序进入 `else` 并正确执行“显出悟空本相”。本关要明确教会孩子：`false` 是一个正常布尔值，不代表程序失败；在正确的分支设计中，假分支可以是成功路径。

第一道条件、第二道条件及四个分支动作都来自同一个 Blockly workspace。鼠标、触摸和键盘辅助必须修改这张真实图；快捷修复按钮如果存在，也只能调用同一 workspace 的连接操作。不得存在文字答案树、第二张隐藏程序、React 状态选择器或直接完成按钮。

建议的零 UI Blockly 合同包含以下职责明确的块：

- 主链动作：`变作高翠兰`、`妖怪进屋并取得姓名住处`；
- 两个检查点容器：`检查伪装是否准备好`、`检查是否应显出本相`，各有一个布尔输入、`THEN` 与 `ELSE` 语句容器；
- 两个故事传感器：`外形和高翠兰相同`、`真实身份是高翠兰`；
- 第一道分支动作：`保持伪装并等待`、`调整变化`；
- 第二道分支动作：`继续装作高翠兰`、`显出悟空本相`。

不引入通用变量、`not`、`and` 或 `or`。多条件组合仍属于 W3-M4，Python 变量仍属于 W4；W3-M2 只深化“同一时刻可以有两个不同的真假事实”。

## 唯一事实源、图合同与编译产物

唯一事实链固定为：

`visible Blockly workspace → serialized draft → compiler → canonical trace → deterministic runtime`

任何成功、反馈、重播、导入校验和完成证明都不得读取 `expectedSequence`、课程答案数组、积木坐标、动画状态、`LegacyMissionBuilder`、`MissionTools` 或隐藏完成值。坐标只用于恢复布局。

版本化 workspace 保存稳定 block ID、type、坐标、主链 `previousId/nextId`、条件输入连接、`parentBlockId`、检查点 ID 和 then/else 容器归属。编译器必须拒绝：

- 空图、多根主链、断线、循环和非互惠连接；
- 未知块、孤立块、重复块或遗漏必需块；
- 缺条件、缺 then/else、空分支或条件输入形状错误；
- 传感器接到多个检查点、动作跨容器、错误 parent/branch 归属；
- 两个检查点换序、线索事件位于伪装闸门之前、显出本相位于取得线索之前；
- 工作区数量、字符串长度或坐标超出安全边界。

canonical instruction 至少记录：`instructionId`、`opcode`、`sourceBlockId`、`parentBlockId`、`checkpointId`、`conditionSourceBlockId`、`conditionKind`、`conditionLabel`、`observedValue`、公开 `evidenceCode/evidenceTextKey` 与 `actualBranch`。导入时必须从 workspace 重编译，并逐字段匹配保存的 trace；坐标、动画和课程文案不能参与判断。

## 确定性状态机与失败语义

故事状态依次为：

`cuilan-safe → transformed-as-cuilan → disguise-ready → clue-acquired → identity-checked → revealed → demon-fled`

变化完成后，两个公开事实保持为：

- `appearance-matches-cuilan = true`；
- `identity-is-cuilan = false`。

运行规则：

1. `变作高翠兰` 进入 `transformed-as-cuilan`。
2. 第一道闸门读取所连接传感器。只有 true/then 且 then 动作为“保持伪装并等待”，才能进入 `disguise-ready`。
3. `妖怪进屋并取得姓名住处` 只有在 `disguise-ready` 后执行，进入 `clue-acquired`。
4. 第二道闸门读取所连接传感器。只有 false/else 且 else 动作为“显出悟空本相”，才能进入 `revealed`。
5. 固定结果事件“妖怪脱身逃走”只在 `revealed` 后出现，进入 `demon-fled`；它不是儿童指令，也不能把不完整 trace 变成成功。

默认第二道闸门读取外形，得到 true/then，执行“继续装作高翠兰”，因此在首个真实问题条件处失败。若第一道误接真实身份传感器，则得到 false/else，只执行“调整变化”并立即失败，不继续取得线索。分支动作接错、主链错序或缺块分别产生可追溯诊断。

诊断概念固定为：`program-structure`、`condition-selection`、`branch-routing`、`sequence-precondition` 与 `completeness`。UI 只显示首个阻塞问题并聚焦真实 source block。所有失败的生命、资源和星级损失均为 0。

## 火眼金睛·条件观察

W3-M2 复用已有能力的获得与稳定规则：W2-M4 已持久化完成才获得，W2-M5 已持久化完成才稳定解锁。它不重新授予能力，也不改变 W3-M1 的历史审计。

能力只在以下条件全部满足时可主动使用：

1. 能力已稳定；
2. W3-M2 最近一次正式条件运行已失败并成功持久化；
3. 当前 workspace 与该失败快照仍一致；
4. 当前没有保存、播放、恢复或完成操作。

一次观察只显示首个失败检查点的：条件标签、当前真/假值、公开故事依据和实际进入的分支。例如默认失败可以显示“外形和高翠兰相同 / 真 / 变化后的外形已经相同 / 进入继续伪装分支”。它不得推荐 `真实身份是高翠兰`、指明应连接哪个块、修改 workspace、选择分支、运行、完成或透露完整正确图。

每次使用先保存审计再显示结果。W3-M2 session 保存 `{snapshotId, usedAt, workspace}` 的不可变历史图；导入时从历史图重编译重放，要求精确匹配失败 snapshot。相同 snapshot 只记一次，编辑图后当前显示失效但合法历史审计保留。观察不计入提示层级，不减少星级，也不改变 trace 或 mission completion。

家长报告只增加 W3-M2 的主动观察次数和最近使用时间，并可汇总 W3-M1/W3-M2 使用次数；不展示完整答案图、原始 block ID、条件答案或儿童可识别的私密内容。

## Progress V3、迁移与恢复

W3-M2 独立 session 保存：workspace、lastTrace、deterministic lastRun、totalRuns、compile/runtime failures、usedHintTiers、conceptFailures、lastRunAt、savedAt、两个检查点结果、failureSnapshot 与 conditionObservationUses。workspace 修改保留累计学习证据，但清除过期 trace、run、检查点结果和当前 failure snapshot。

新增 session 与 formal completion proof 时，将 `schemaRevision` 从 3 升为 4。迁移必须：

- 保留所有 W1/W2/W3-M1 现有数据与完成证明；
- 对没有 W3-M2 数据的进度不伪造 session；
- 对历史上已完成 legacy W3-M2 的记录生成 `legacy-preformal` 证明，不把它当作正式 Blockly 证明；
- 不破坏历史用户已解锁的 W3-M3，但正式 W3-M2 徽标、家长证明和新玩家解锁只接受 `formal-v3`；
- 正式完成时原子保存 workspace、trace、run、verifiedAt 与 mission completion。

保存顺序固定为：草稿保存成功 → 运行证据保存成功 → 场景播放 → 完成证明与解锁保存成功 → 显示通关。草稿、运行、观察和完成四类写失败各有不同的可见重试；任何未持久化结果都不得播放、观察、通关或提前解锁。

继续复用并重新验证 Progress V3 的 snapshot 恢复、损坏 current 原始字节保留、跨标签 revision CAS、冲突备份下载、显式载入其他标签页版本、刷新、重播和家长导出导入。解析器必须从 workspace 重编译、重跑，并拒绝伪造 trace、condition provenance、checkpoint、branch、run、failure snapshot、审计、计数或时间。

## UI、正式资产、无障碍与儿童安全

页面延续已批准的明亮 3D 儿童绘本风格，不重新定义全站视觉方向。计划使用内置 image generation 生成或编辑两张正式 WebP：

1. 高老庄后宅或灯笼庭院背景，不含文字、伪字、卧床或亲密动作；
2. 变化完成、伪装等待、妖怪进屋、悟空显形和妖怪逃走的透明状态图。

正式资产必须写入 manifest，记录用途、工具、完整 prompt/source、尺寸、SHA-256、provenance、screen slot 和原尺寸人工视觉 QA。只接受 `visual-qa-passed`；禁止 CSS/div/SVG/emoji/占位画面替代插画。若复用现有项目资产，必须先证明来源、许可、尺寸和 slot 合法。

支持项目在实现前固定为：1440×1024 Chromium、1440×1024 Firefox、768×1024 WebKit、390×844 触摸 Chromium 和 320×844 触摸 Chromium。鼠标、触摸和键盘必须产生相同 workspace 与 trace；键盘可以聚焦真实问题条件、替换条件、删除并恢复连接。

标准/减少动态、静音/有声只改变表现，不改变事实、分支、trace 或结果。Blockly SVG 必须在所有宽度真实可见、具备像素离散度证据且无横向溢出或区域重叠。Experience、Scene、Workspace 三层懒加载和两张任务资产的失败必须局部可见、fail closed 并提供恢复入口；控制具备可见焦点、语义标签和儿童可理解的状态文本。

## 开工前性能与资产预算

- W3-M2 cold 路径固定上限：`3 * 1024 * 1024` bytes；
- 单张 raster 固定上限：`512 * 1024` bytes；
- W3-M2 任务媒体总量固定上限：`1.25 * 1024 * 1024` bytes；
- entry gzip `180 * 1024`、homepage total `650 * 1024`、Phaser raw `1600 * 1024` 及现有 W1/W2/W3-M1 门限不得提高；
- 新增 W3-M2 source/bundle contract 必须证明独立 lazy route closure，不把 Phaser 或 Blockly 拉入 homepage static closure。

## 测试策略与可执行验收

实施必须从失败测试开始，并至少覆盖：

1. **课程与路由合同**：W3-M2 正式注册、无 `expectedSequence`、不进入 legacy tools；W3-M3～M5 仍为 legacy。
2. **零 UI 合同与编译器**：默认图、正确图、两种条件事实、真实 checkpoint/source/parent provenance；拒绝缺块、断线、孤立、重复、多根、环、错形状、跨容器和错序。
3. **确定性运行器**：默认第二闸门失败、第一闸门失败、分支动作错误、取得线索前显形、正确 true/then 后 false/else、固定逃走结果、严格伪造 trace 拒绝、确定性重放和零惩罚。
4. **能力与 session**：稳定能力门禁、失败后主动观察、图不变、审计先保存、同 snapshot 去重、历史 workspace 重编译重放、编辑后失效、四类写失败、schema revision 4 迁移与 `legacy-preformal/formal-v3` 边界。
5. **恢复与跨系统**：刷新、重播、跨标签 CAS、冲突备份、损坏 current 保留、合法 snapshot 恢复、恶意/畸形导入拒绝、导出导入、家长摘要和 W3-M3 解锁。
6. **真实浏览器专项矩阵**：计划保持与 W3-M1 同等级的 24 条五项目证据——desktop Chromium 15、tablet WebKit 2、mobile Chromium 390 2、desktop Firefox 3、narrow Chromium 320 2。覆盖完整失败→观察→修复→成功→刷新重播、键盘、四类保存故障、motion/mute、CAS、corrupt、parent/export-import、cold/404、资产失败和三层 lazy failure。
7. **视觉证据**：五项目各保存 Blockly、失败和成功原始截图，共 15 张并由主代理目视检查；测试输出保持忽略，不误纳入 Git。
8. **项目门禁**：新鲜运行 unit、source/bundle contracts、asset contracts、TypeScript、production build、bundle gate、asset gate、W2/W3 既有 130 条 Playwright、W3-M2 专项矩阵、全站 Playwright 审计和 `git diff --check`。不得用旧数字冒充当前通过。

## 完成矩阵与明确排除

- `Course / 30 levels`：只正式化 W3-M2，不能证明第三周或 30 关完成。
- `Blockly`：只有在可见图驱动 trace、非法图反馈、刷新恢复和五项目真实浏览器通过后，W3-M2 才能达到 `One-level playable`。
- `Parent / saves`：必须验证 revision 4、四类写失败、CAS、损坏恢复、导入导出和正式证明，但不能外推为全产品家长系统完成。
- `UI / release`：本关需满足固定视口、键盘、触摸、减少动态、静音、预算、资产与健康检查；public deployment 未执行，因此 release/system/commercial 始终 `not complete`。
- W3-M3～W3-M5、第三周系统闭环、全站遗留 24 项 shared/W1 Playwright 失败和部署不在本关实现范围内，必须在最终报告中继续披露。

## 规格自检结果

- 无 `TBD`、`TODO`、占位要求或待选择玩法。
- 两道闸门在同一故事状态下分别读取 true 与 false；默认错误、正确替换、实际分支和成功状态互相一致。
- W3-M2 在显出本相、妖怪逃走结束，未侵入 W3-M3 的追赶交锋，也未提前教授 W3-M4 多条件组合或 W4 变量。
- 火眼金睛只暴露当前失败条件的值、依据和实际分支，不指出替代条件，不编辑、不运行、不完成。
- schema revision、历史 legacy 完成、正式证明、新玩家解锁与不破坏旧用户进度的边界已明确。
- 当前只达到 `Design complete`；生产实现、资产和 `One-level playable` 均为 `not complete`。
