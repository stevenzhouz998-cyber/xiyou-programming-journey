# W4-M3 第二次变化：Python 分支归位设计

## 目标、范围与完成边界

将 `w4-m3 第二次变化` 从 legacy `expectedSequence`、`expectedOutput`、`starterCode`、通用 `PythonEditor` 与 `MissionTools` 通关路径升级为一关由真实可见 CodeMirror Python、受限 Pyodide Worker、typed branch trace 和持久化正式证明共同驱动的 Python 条件任务。

用户已批准的核心玩法是 **分支归位：补出真正的 `else`**。判断条件 `identity == "白骨精"` 从头到尾保持不变；默认程序的问题是 `polite_help()` 位于 `if` 外部，因此原著卡会先执行“继续核验”，随后又无条件执行“礼貌帮助”。孩子必须在真实 CodeMirror 中插入 `else:` 并把末行动作缩进到 `else` 分支，让两张公开卡分别且只执行一条路线。

本任务复用 W4-M1/W4-M2 已建立的同源 Pyodide runtime、Worker 生命周期、安全轮廓、保存优先、正式作品、proof、家长摘要、故障恢复与五项目浏览器门禁；不复用 W4-M1 的 mapping grammar/trace，不复用 W4-M2 的 assignment/seal grammar/trace，也不修改两关已有 session、work、proof、attempts 或完成结果。

本规格经用户书面确认后，W4-M3 可报告 `Design complete`。未来实施预选且最高允许报告的等级为 W4-M3 `One-level playable`；只有孩子可见输入、真实 Worker 运行、三类失败、帮助、保存、刷新、恢复、跨关与五项目浏览器证据全部通过后才可使用该等级。W4-M4、W4-M5、第四周 `System loop complete`、30 关 `Full-content verified`、全站通过、公开部署和 `Commercial production complete` 均继续为 `not complete`。

## 原著事实与儿童安全边界

第四周继续只覆盖《西游记》第二十七回《尸魔三戏唐三藏　圣僧恨逐美猴王》：

- 原文来源：<https://zh.wikisource.org/zh-hans/西游记/第027回>；
- 第二次变化中，变化者变作老妇寻找女儿；悟空再次识破；
- 第三次老翁变化、本相和贬书属于 W4-M4/W4-M5 的后续范围，本关不提前消费；
- 本关的儿童安全表现只保留“老妇外形改变，公开核验身份不变”和“再次识破”的事实。

不得表现或让孩子编写攻击、伤害、尸体、骷髅、恐怖变化、惩罚、羞辱或逐走命令。老妇形象必须端庄、慈祥且不脸谱化；程序依据公开身份事实分支，绝不能把年龄、外貌或服饰当作危险判断依据。

## 已批准的孩子可见玩法

### 页面起点

页面延续明亮 3D 中国儿童绘本方向和“故事舞台 + 编程工作区 + 运行反馈”结构：

- 左侧为白虎岭故事舞台、老妇角色、当前公开卡与两条可见路线；
- 右侧为真实 CodeMirror Python、分支结构预览与本次运行记录；
- W4-M2 的证据匣作品可以在默认折叠的只读区回看；
- 全关只有一个主运行入口“运行分支”。

W4-M2 作品回看没有复制、编辑、运行、自动填入、session 更新或完成 callback。W4-M3 的 grammar、Worker、runner、proof 与 unlock 不读取 W4-M1/W4-M2 work；打开或关闭回看前后，W4-M1/W4-M2 的 session、work、proof、attempts、completion 和 W4-M3 当前草稿必须深相等。

### 两张公开卡

系统按固定顺序完整运行两张卡；卡片是孩子始终可见的场景输入，不是隐藏答案源：

1. `canon-old-woman-disguise`，标记“原著第二次变化”：`appearance = "老妇"`、`identity = "白骨精"`，身份来源为公开火眼核验；
2. `practice-herbalist-elder`，标记“逻辑练习，非原著事件”：`appearance = "老妇"`、`identity = "山中采药人"`，身份来源为公开练习资料。

两张卡故意使用相同的外形标签而身份不同，用于明确证明分支判断来自 `identity`，不能从老妇形象、卡片顺序、动画或隐藏结果推断。练习卡不推进原著状态。

### 默认真实 Python

首次进入时创建并原子保存以下三行 CodeMirror 文本：

```python
if identity == "白骨精":
    keep_observing()
polite_help()
```

判断字段、比较运算、常量和两个动作名保持只读。普通 UI 只允许修改两项真实文本区域：

1. 在两个动作之间插入或删除精确连接词 `else:`；
2. 把 `polite_help()` 的缩进设为 0 或 4 个空格。

键盘用户可在真实 CodeMirror source span 中输入、删除、换行和缩进；鼠标、触控与屏幕阅读器用户使用“分支连接词”和“缩进层级”控件。所有路径必须通过同一个 CodeMirror transaction 修改同一份文本，不得保存 connector、缩进选择或正确答案的平行状态。刷新、导出导入与恢复后，控件只能从保存的 code 重新派生显示状态。

逐字输入会短暂产生 `e`、`el`、缺冒号或非标准空格等未完成文本。session 的受限 draft envelope 必须允许保存这些安全的学习草稿：固定只读行逐字节不变、连接词区域长度不超过 32 个字符、末行动作文本不变、总 code 长度受限。draft envelope 只证明文本可以安全保存，不证明可以执行或完成；超出可编辑区域、改写固定行、过长文本、控制字符或未知字段的导入仍作为损坏数据拒绝。

### 四种可运行的代码结构

完整输入进入运行门禁时，只有以下四种结构进入本关的 canonical grammar；逐字输入产生的其它受限草稿可以保存和恢复，但运行时发布 `python-structure-invalid`：

1. 无 `else:`，`polite_help()` 缩进为 0：原著卡执行两个动作，练习卡只执行礼貌帮助；
2. 无 `else:`，`polite_help()` 缩进为 4：原著卡在同一个 `if` 中执行两个动作，练习卡不执行动作；
3. 有 `else:`，`polite_help()` 缩进为 0：真实 Python `IndentationError`/结构错误；
4. 有 `else:`，`polite_help()` 缩进为 4：唯一成功结构。

成功代码为：

```python
if identity == "白骨精":
    keep_observing()
else:
    polite_help()
```

### 默认失败、观察与帮助

默认代码在 Worker 中真实运行原著卡时依次记录：

1. 条件读取 `identity = "白骨精"`，结果为 `true`；
2. 执行 `keep_observing()`；
3. 离开 `if` 后继续执行 `polite_help()`；
4. 保存该卡执行了两条互斥路线的事实。

两张卡均完成结构化运行后，runner 保存完整 run，并把本次主要学习状态发布为 `branch-conflict`。若第二种结构同时造成原著卡冲突与练习卡无动作，run 保存两项事实；界面可以展示两张卡的实际路线，但不得给出正确结构或替孩子修改。

火眼金睛只在有效失败 snapshot 保存成功后开放。观察可以显示：当前卡、条件实际真假、实际执行的动作和代码行；不得显示完整成功代码、直接说“添加 else 并缩进”、编辑、运行、跳过或完成。观察审计保存成功后才展示；重复查看同一未失效 snapshot 只记录一次。

三层提示固定为：

- 观察：“看看每张卡实际亮起了几条路线。”
- 思考：“`if` 结束后，没有归入其它分支的语句仍会继续执行。”
- 局部提示：“检查礼貌帮助这一行属于条件内、条件外，还是应该属于另一条互斥路线。”

提示不得出现完整成功代码或替孩子插入 `else:`。所有学习失败严格零生命、零资源、零星级损失，不撤销装备、能力、前置完成或正式证明；成功不发货币、资源或装饰奖励。

### 修正与成功

任何 code 编辑都立即使旧 trace、run、failure snapshot、观察、成功候选和正在执行的 Worker 失效。再次点击“运行分支”必须先保存当前 code，再从第一张卡开始完整运行。

只有以下条件全部满足，runner 才从 `branch-ready` 进入 `branch-proven`：

- 原著卡的 condition 为 true，且只执行 `keep_observing()`；
- 练习卡的 condition 为 false，且只执行 `polite_help()`；
- 两张卡均恰好一个动作，没有冲突、缺失或额外事件；
- Worker trace 与同步 grammar 从同一保存文本派生的 canonical trace 完全一致；
- 成功 run、当前素材 readiness、work、proof 与 completion 均按保存门禁发布成功。

成功后 Scene 只播放已经保存的“再次核验完成”安全尾声，并展示持久化后的 W4-M4 解锁。Scene、React state、DOM、动画或音效不能决定成功。

## 唯一事实链与领域边界

唯一执行链为：

```text
可见 CodeMirror Python
→ 原子保存 revision-10 W4-M3 draft
→ 同步 exact branch grammar（导入、恢复与 proof 复算）
→ 受限 Pyodide Worker 的 AST 白名单与真实 exec
→ per-card condition/action typed trace
→ deterministic branch runner
→ 保存 run / failure snapshot
→ 原子保存 work + formal proof + completion
→ Scene 只播放已保存事件
```

成功不得读取或比较 legacy `expectedSequence`、`expectedOutput`、stdout、固定输出字符串、React state、DOM、动画状态、坐标、W4-M1/W4-M2 work、隐藏答案数组、缓存成功、直接 storage 标记或测试注入。

领域职责保持独立：

1. `WeekFourBranchContract`：公开卡、condition/action trace、failure snapshot 与 runner result；
2. `WeekFourBranchPythonGrammar`：四种精确文本结构、source span 与同步 canonical trace；
3. `WeekFourBranchPythonRunner/Worker`：Pyodide 生命周期、AST 白名单、真实执行、timeout 与 structured result；
4. `WeekFourBranchSession/Schema`：revision-10 session、work、evidence exact parser 和重算防伪；
5. `WeekFourBranchExperience/Editor/Scene`：保存优先编排、真实 CodeMirror 输入和只消费保存事件的播放；
6. formal course、ProgressContext、parent、fault adapter、asset/bundle/E2E gates 只负责明确接线，不成为第二语义源。

## typed trace、runner 与状态机

W4-M3 定义独立 trace，不能复用 W4-M1 mapping trace 或 W4-M2 assignment/seal trace。每张卡至少包含：

- `condition`：`cardId`、实际 field `identity`、实际 value、比较值 `白骨精`、`conditionResult`、Python source span；
- `action`：`cardId`、实际 action `keep-observing | polite-help`、执行顺序、Python source span；
- `card-result`：实际动作数组、`single-route | branch-conflict | branch-missing` 和可见 scene state；
- `run-result`：两卡结果、主要状态、固定零惩罚和完成布尔值。

状态机固定为：

- `branch-ready`：首次进入或 code 编辑后；
- `branch-conflict`：任一卡执行两个互斥动作；
- `branch-missing`：任一卡没有执行动作；
- `python-structure-invalid`：真实 Python 语法、缩进或 exact contract 无效；
- `branch-proven`：两张卡分别且只执行正确路线。

语法错误在卡片执行前发布 `python-structure-invalid`。可执行代码必须完整运行两张卡后保存全部事实；主要学习状态按 `branch-conflict → branch-missing → branch-proven` 的稳定优先级选择，但 run 不丢弃其它卡的已保存结果。

相同保存 code 重复运行必须产生确定性相同 trace 与 run。卡片事实、顺序和 action callbacks 是公开场景输入及受信 harness，不返回正确结构或通关布尔值。

## 同步 grammar、Worker 与安全边界

W4-M3 复用 `public/runtime/pyodide-314.0.2/` 的固定同源 runtime、MPL-2.0 provenance 和现有 inventory；不得复制 runtime、使用 CDN/`latest` 或新增 npm/pip 依赖。新 Worker 从自身 assets URL 相对解析同一 runtime，保留 Vite base path。

同步验证分为两层：draft envelope 负责安全保存未完成的可见文本；canonical grammar 只接受上述四种完整结构。canonical grammar 统一换行后派生：

- connector 和动作行 source span；
- 对每张公开卡的 canonical condition/action trace；
- conflict、missing、invalid 或 proven run；
- 当前可访问控件的显示状态。

同步验证用于离线导入、恢复、work/proof 重算，不启动网络或 Worker，也不能替代玩家运行。未完成但符合 draft envelope 的 code 可以恢复为 `python-structure-invalid` 草稿，却不能生成 canonical trace、work、proof 或 completion。第三种无缩进 `else` 必须同步复现真实 Python 结构错误；其它完整结构不能执行。超出 draft envelope 的未知名称、常量、动作、语句、控制字符或越界编辑作为损坏输入拒绝，不静默规范化。

Worker 使用 Python `ast.parse` 与严格 AST 白名单：只接受本关固定 `Module`、`If`、`Compare`、`Eq`、`Name`、`Constant`、`Expr`、`Call`、`Load` 及准确 body/orelse ownership；名称只允许 `identity`、`keep_observing`、`polite_help`，常量只允许 `白骨精`，调用只允许两个零参数记录动作。

禁止 import、attribute、subscript、文件、浏览器、网络、JS、动态执行、反射、dunder、函数/类定义、赋值、循环、异常、协程、生成器和其它未列语法。每张卡在独立且 `__builtins__ = {}` 的安全环境运行；Worker 只返回真实 condition/action trace，不返回成功布尔值。

父页面重新从当前保存 code 派生 expected canonical trace，逐字段核对 Worker message 的 request ID、source span、card、condition、action 和顺序。任何不一致均 fail closed 为 Worker contract failure，不计为孩子学习失败。timeout、load error、worker error、cancel、迟到消息和无限运行终止必须有独立测试；即使普通 UI 不能生成循环，也必须证明底层 runner 不会失去终止能力。

## Progress revision 10、session、work 与正式证明

Progress V3 从 `schemaRevision: 9` 升到 `schemaRevision: 10`。新增 `sessions['w4-m3']`，至少保存：

- `kind: "python-branch-structure-v1"` 与通过受限 draft envelope 的 versioned Python draft；
- 完整 CodeMirror code；连接词和缩进控件只从 code 派生，不持久化平行答案；
- 最近 canonical trace、Worker trace、run 与 failure snapshot；
- `totalRuns`、`branchConflictFailures`、`branchMissingFailures`、`validationFailures`、`runnerInfrastructureFailures`；
- 火眼金睛观察审计、已使用提示层级、困难概念和首次阻塞概念；
- `lastRunAt` 与 `savedAt`。

计数口径固定：

- code 已保存、通过运行前合同并真正开始处理公开卡时，`totalRuns + 1`；
- 一次 run 可同时包含 conflict 与 missing 事实，但每类计数在该 run 最多增加一次；
- syntax/indentation/exact grammar 拒绝增加 `validationFailures`，不增加 `totalRuns` 或 mission attempts；
- runtime/load/timeout/Worker 基础设施问题只增加 `runnerInfrastructureFailures`；如果 timeout 前真实执行已开始，`totalRuns` 可增加，但学习失败和 mission attempts 不增加；
- 相同 snapshot 的观察和相同提示层级只审计一次。

正式成功时原子保存 `works['w4-m3-branch-structure-record']`：

- `kind: "python-branch-structure-v1"`、稳定 work ID、mission ID 与儿童可见标题；
- 完成时的真实 Python code；
- canonical trace、Worker trace 与成功 run；
- `createdAt` 与 `verifiedAt`。

`missionCompletionEvidence['w4-m3']` 使用 `kind: "formal-v3"`，精确绑定当前 session code、两条 trace、成功 run、同一 work ID、`completedAt` 与 `verifiedAt`。导入时必须从 code 同步重建 trace/run 并逐字段验证 session、work、proof 与 mission completion；正式回放还必须再次由真实 Worker 执行。缺 session、work、成功 run、前置 proof 或任何引用/时间不一致时整份导入拒绝。

正式完成后的只读 replay 可以真实重验 Worker，但不得改变 code、trace、run、work、proof、attempts、计数或时间。只有从 legacy 记录升级为首次 formal proof 时允许新增 `verifiedAt` 与正式数据。

## 前置、迁移与历史访问

新正式 W4-M3 Experience 只接受 W4-M2 `formal-v3` 且其 session/work/proof 可验证。bare mission completion、W4-M2 `legacy-replay-only` 或伪造 unlock 不建立正式前置。

revision 1～9 严格迁移到 revision 10：

- 历史存档没有 W4-M3 完成时，不自动生成 W4-M3 session、code、trace、run、work 或 proof；
- 历史存档已有 W4-M3 完成时，只生成精确来源的 `legacy-replay-only` marker，保留原 `completedAt` 与既有 W4-M4 legacy 访问，不伪造正式输入或证明；
- revision 9 中合法的 W4-M1/W4-M2 session、work、proof、attempts 和完成数据必须语义不变；
- revision 9 或更早携带 W4-M3 session/work/formal proof 的存档作为未来字段伪造拒绝；
- 历史玩家取得 W4-M2 formal proof 后，可以进入正式 W4-M3 完整重玩并升级；升级保留历史 `completedAt`，新增 formal `verifiedAt`、session、work、trace 和 run；
- revision 10 parser 使用 exact keys，拒绝未知 session、work、evidence、时间、计数、code、trace、run 或引用。

页面访问分支固定为：

1. W4-M2 formal 玩家进入正式 W4-M3 Experience；
2. 只有历史 W4-M2 completion/访问、尚无 W4-M2 formal proof 的玩家看到“历史访问已保留”的只读说明、已有 W4-M3 legacy 状态和返回 W4-M2 正式验证入口；不创建 W4-M3 session，也不允许旧 generic task 写入新 completion；
3. 已有 W4-M3 legacy 且后来取得 W4-M2 formal 的玩家进入正式 Experience，并看到“历史完成已保留，可正式验证”；
4. 新正式路径的 W4-M4 unlock 只认 W4-M3 `formal-v3`；历史用户既有 W4-M4/W4-M5 legacy 访问由独立 compatibility 判断保留。

W4-M4/W4-M5 在本任务中继续保持 legacy：不进入 formal executable registry，不新增专属 session/Worker/trace/work/proof，也不删除现有配置和历史兼容访问。

## 保存优先、故障、并发与恢复

发布顺序固定为：

1. Python draft 原子保存；
2. grammar 与 Worker 只读取刚确认保存的同一 revision；
3. validation failure、run 或 failure snapshot 保存；
4. 火眼金睛观察审计保存后展示；
5. 成功 run 已保存且当前正式素材 ready 后，work、formal proof 与 completion 在一个原子事务中发布；
6. Scene 使用已经 ready 的当前资产播放固定尾声并展示 W4-M4 解锁。

五类写入故障 ID 固定为：

- `fail-w4-m3-draft`；
- `fail-w4-m3-run`；
- `fail-w4-m3-observation`；
- `fail-w4-m3-work`；
- `fail-w4-m3-completion`。

work/proof/completion 在生产中是一个原子事务；work 与 completion fault 只分别验证事务阶段，任何失败都不能留下半份 work、proof、mission completion 或 unlock。

其它稳定故障 ID 为：

- `fail-w4-m3-runtime-load`、`fail-w4-m3-runtime-timeout`；
- `fail-w4-m3-assets`、`fail-w4-m3-lazy`；
- `fail-w4-m3-cas-stale-writer`、`fail-w4-m3-corrupt-current`。

精确副作用边界：

- draft fault：原 code/session/run/work/proof/completion/unlock 全部不变；
- run fault：新 code 已保存，last trace/run/failure/observation/work/proof/completion/unlock 不变；
- observation fault：code/run/failure 保持，观察计数和内容不发布；
- work/completion fault：成功 run 保持，work/proof/completion/unlock 全不存在，重试后一次原子发布；
- runtime load/timeout：保留 draft，只记录基础设施字段，不增加学习失败；
- asset/lazy fault：不发布 playback/work/proof/completion/unlock，重试读取同一保存成功 run，不重复运行 Worker；
- stale writer：旧标签不能覆盖新 revision，提供旧 code 备份，只有显式载入外部进度才改变当前 view；
- corrupt current：先下载字节完全一致的损坏原文，再恢复最后合法 snapshot；恢复后 code/session/work/proof 必须重新解析与重放。

双击运行、快速修改 connector/缩进、延迟 Worker、迟到素材、过期保存和 CAS 回调不能重复运行、完成或覆盖新 code。刷新、重开、真实 export/import 和恢复后必须还原同一 code、结构化 run、work、proof 与时间，而不是只还原界面。

Parent“备份并清空”沿用当前 initial V3 clear 合同：先下载备份，再删除 W4-M3 session/work/evidence/mission completion 与由它产生的新正式 W4-M4 unlock，同时按现有合同重置 settings/privacy；不得破坏此前已经合法存在的历史 compatibility provenance。clear 后不能凭缓存、旧 work 或 React state 进入正式 W4-M4。

## 家长摘要与跨系统结果

`getWeeklyReport(progress, 4)` 增加 W4-M3 非答案摘要：

- 总运行次数；
- branch conflict、branch missing、Python 结构拒绝与基础设施失败；
- 火眼观察与提示层级；
- work 是否保存；
- formal/legacy 状态、完成时间和验证时间。

家长页面不得显示完整代码、正确缩进、成功结构、source span、raw IDs 或完整 trace。基础设施失败必须与学习失败分开，不把 runtime/网络问题归咎于孩子。

正式 W4-M3 completion 必须持久解锁 W4-M4；刷新、重开、导出导入、合法恢复与空白存储导入后保持一致。W4-M3 不新增货币、资源、装备、能力或装饰奖励，也不得改变既有装备和火眼能力。

## UI、无障碍与局部恢复

桌面 1440 宽度使用故事舞台与 Python 工作区两列。平板和手机按 DOM 顺序排列：

```text
故事舞台 → 当前公开卡 → W4-M2 只读回看 → Python → 分支结构预览 → 运行反馈
```

不得横向滚动。交互要求：

- 只有一个主按钮“运行分支”；
- connector 与缩进可由鼠标、真实触控、键盘和屏幕阅读器完成；
- `Enter`、`Backspace`、`Tab`、`Shift+Tab` 与可访问控件操作同一 CodeMirror 文本；
- 失败后焦点移动到可理解的 status/alert，并提供“查看问题代码行”；
- 条件真假、路线冲突、无路线和成功均用文字与图形表达，不只依靠颜色、动画或位置；
- 静音和减少动态效果只改变声音、动画强度和转场，不改变 trace、run、保存或成功语义；
- CodeMirror、Worker、Scene、W4-M2 review、asset 或 lazy chunk 失败均有局部重试，恢复前不发布结果或完成。

自动化可访问性证据覆盖 role、accessible name、live region、焦点顺序、纯键盘完成和触控目标。项目未安装 axe，本任务不新增依赖或虚构 axe 结果；没有真实辅助技术人工证据时，不声称完整屏幕阅读器实测。

## 正式素材与 provenance

视觉延续已批准的明亮白虎岭 3D 儿童绘本方向。允许复用已核验的 `assets/week-four-mapping/white-tiger-ridge-background.webp`，但 manifest 必须增加真实 W4-M3 screen slot 并证明同一 build asset 未复制、未漏记。

W4-M3 计划新增两张正式 WebP：

1. `assets/week-four-branches/old-woman-visitor.webp`：1024×1024 透明背景。提示词基线：“明亮温暖的中国神话 3D 儿童绘本角色，一位端庄慈祥的山中老妇，朴素整洁的传统衣着，站姿自然，双手可见，柔和日光，完整全身，透明背景，适合 8–12 岁儿童；不出现文字、武器、攻击、伤害、尸体、骷髅、恐怖变化、邪恶脸谱、夸张衰老或性化表达。”
2. `assets/week-four-branches/branch-route-states.webp`：1536×512 透明 RGBA 横向三格，每格精确 512×512，顺序为“等待运行、两条路线同时亮起的冲突、单一路线确认”，使用同一白虎岭绘本视觉语言；不含文字、伪字、代码、答案 token、恐怖、攻击或伤害。

两张资产只能由环境内建图像生成/编辑工具制作。实施时必须记录最终完整 prompt、工具、尺寸、license/provenance、SHA-256、真实 alpha、实际 import/screen slot 和 QA 状态；hash 只能在接受生成结果并完成技术转换后计算，规格不预造未知值。

每张 raster 不超过 `512 * 1024` bytes。只有 provenance 已核验，并在 320、390、768、1440 和 Firefox 原尺寸截图中通过裁切、清晰度、老妇形象尊重性、三格边界、状态可辨与无伪字检查，才可标记 `visual-qa-passed` 并进入构建。

功能性代码标记和按钮图标继续使用项目现有 Phosphor Icons，并记录包版本、图标名与许可证。图标不得替代故事插画。禁止 CSS/div art、emoji、手写 SVG、代码画布、占位框、拉伸截图或无 provenance 素材作为正式画面。

## 实施前支持矩阵与性能预算

在第一项生产代码前用 RED contract 固定：

- desktop Chromium 1440×1024；
- tablet WebKit 768×1024；
- mobile Chromium 390×844；
- desktop Firefox 1440×1024；
- narrow Chromium 320×844；
- 鼠标、键盘、真实触控和屏幕阅读器语义；
- focus、对比度、reduced motion、mute、无横向溢出和局部资源恢复；
- W4-M3 本地 lazy cold closure 上限 `3 * 1024 * 1024` bytes；
- 单张 raster 上限 `512 * 1024` bytes；
- W4-M3 cold 媒体总量（含复用背景）上限 `1.25 * 1024 * 1024` bytes；
- 固定 Pyodide core 网络传输上限 `15 * 1024 * 1024` bytes；
- 10 Mbps 网络与 4× CPU 限速下，cold ready 加首次完整两卡结果最长 20 秒，期间提供可访问进度、取消和重试；
- runtime warm 后，两张卡完整执行不超过 1 秒；
- entry、homepage、共享入口、Phaser、W1～W3、W4-M1 与 W4-M2 既有预算不得提高。

预算不得为实现通过而事后放宽。若复用 runtime 后无法满足安全、传输或时延预算，实施必须停止并重新进行运行时选择。

W4-M3 E2E 标签固定为：`@w4-m3-full`、`@w4-m3-keyboard`、`@w4-m3-mouse`、`@w4-m3-touch`、`@w4-m3-accessibility`、`@w4-m3-storage`、`@w4-m3-corrupt`、`@w4-m3-parent`、`@w4-m3-work`、`@w4-m3-python-security`、`@w4-m3-cold`、`@w4-m3-runtime-fault`、`@w4-m3-asset-fault`、`@w4-m3-narrow`、`@w4-m3-external` 与 `@w4-m3-lazy`。

五个 Playwright project 精确为：

- `desktop-chromium-1440x1024`：完整路径与全部专项标签；
- `tablet-webkit-768x1024`：`full`、`cold` 和代表性 asset/runtime 恢复；
- `mobile-chromium-390x844`：`full`、`touch`、`cold`；
- `desktop-firefox-1440x1024`：`full`、`keyboard`、`cold`；
- `narrow-chromium-320x844`：`full`、`touch`、`narrow`、`cold`。

## 可执行验收标准

### 课程与源码合同

1. W4-M3 以 `mode: "python"` 进入 `formalCourse`、formal outline、executable registry 和专用 lazy route；从 legacy `expectedSequence`、`expectedOutput`、`starterCode`、通用 `PythonEditor`、`LegacyMissionBuilder` 与 `MissionTools` 通关路径移除。
2. W4-M1/W4-M2 继续 formal 且行为不变；W4-M4/W4-M5 保持 legacy，不新增 formal session/Worker/trace/work/proof。
3. W4-M3 使用本规格的专属提示，不继承按故事顺序生成的 legacy/generic hints。
4. 源码合同拒绝 hidden answer、stdout 比较、直接 storage completion、`eval`、`new Function`、React/DOM/动画成功和测试注入。
5. W4-M2 work review 无复制、编辑、运行、填入或完成 callback；打开前后 W4-M1/W4-M2 与当前 W4-M3 Progress 深相等。

### Python 结构、执行与安全

1. 默认保存代码在真实 Worker 中让原著卡执行两个动作，并保存 `branch-conflict`；练习卡只执行礼貌帮助。
2. 无 `else` 且末行缩进时，run 同时保存原著卡 conflict 与练习卡 missing。
3. `else` 无缩进或逐字输入的其它受限未完成草稿，由同步验证发布 `python-structure-invalid`，不启动卡片动作；刷新和导出导入保留原始草稿。
4. 只有 `else` 加正确缩进使两张卡分别且只执行一个动作，最终状态精确为 `branch-proven`。
5. 卡片顺序、stdout、场景、DOM、坐标、伪造 trace/run、直接 completion 或旧 work 均不能通过。
6. syntax/indentation error、import、attribute/subscript、dunder、未知 name/call、文件、browser/network/JS、动态执行、赋值、函数/类、循环、异常、协程、无限运行、load error、worker error、timeout、cancel 和迟到消息有确定测试。
7. 相同 code 重复运行完全确定；任何编辑使旧 evidence 失效并取消正在运行的 Worker。

### Progress、恢复与跨系统

1. revision 1～9 严格迁移到 10；历史 W4-M3 completion 只生成 `legacy-replay-only`，不伪造 session/code/trace/run/work/proof；正式重玩可升级。
2. 新正式前置要求 W4-M2 `formal-v3`；历史访问与正式前置分离，旧 generic W4-M3 不再写新 completion。
3. draft、run、observation、work、completion 五类保存故障 fail closed、可重试且无半写副作用。
4. refresh、reopen、真实 export/import、malformed import、Parent clear、CAS、双击、过期 result、损坏原文下载与 snapshot 恢复全部覆盖。
5. work 与 formal proof 绑定当前成功 session，可从 code 同步重建，并由真实 Worker replay 验证。
6. formal completion 原子解锁 W4-M4，更新不泄题家长摘要，不增加货币或装饰奖励。
7. 完成后 refresh 恢复相同 code、structured run、work、proof 与时间；只读 replay 不增加 runs、attempts 或验证时间。
8. 导出后导入空白存储，由 parser 重建同一 code/trace/run/work/proof，再由真实 Worker replay；非法 future fields 和孤儿 W4-M3 数据拒绝。
9. W4-M1/W4-M2 session、works、proof、attempts、completion 和能力/装备在 W4-M3 进入、失败、成功、回放、导出导入前后保持语义不变。

### 资产、性能与真实浏览器

1. 复用背景和两张新资产具有 exact inventory、manifest、hash、尺寸、alpha、live slot、原尺寸 QA 和媒体预算证据。
2. 五项目真实浏览器使用孩子可见操作完成：

```text
进入正式 W4-M3
→ 可选打开 W4-M2 只读回看且无副作用
→ 默认运行并保存 branch conflict
→ 火眼观察且 code 不变
→ 尝试无 else 的缩进结构并观察 conflict/missing
→ 尝试无缩进 else 并得到真实结构错误
→ 添加 else 并正确缩进真实 CodeMirror
→ 完整真实 Worker 两卡成功
→ 原子保存作品与正式证明
→ 固定安全原著尾声
→ 刷新重放
→ 导出导入恢复
→ 家长摘要
→ W4-M4 解锁
```

3. 浏览器矩阵覆盖鼠标、键盘、触控、320/390/768/1440、Chromium/WebKit/Firefox、五类保存故障、CAS、损坏恢复、runtime/asset/lazy failure、404、page health、mute 与 reduced motion。
4. 独立 Python 安全 probe 前后 Progress/storage 深相等；E2E source contract 禁止 W4-M3 成功注入，只允许固定的完整 W4-M2 formal 前置 helper。
5. W4-M1/W4-M2 专项与 W1～W3 关键正式回归、unit、typecheck、build、bundle、assets 和全站 E2E 审计必须新鲜运行并如实分类；历史局部数字不能替代 W4-M3 证据。

## Completion matrix 与声明边界

W4-M3 直接涉及 `Course / 30 levels`、`Python`、`Parent / saves` 与 `UI / release`；W4-M1/W4-M2 只读回看使 Blockly 与前序 Python 成为防回归依赖，但 W4-M3 不借前两关证明系统级完成。

| Matrix 行 | W4-M3 单关必须取得的证据 | 仍为 `not complete` 的系统级缺口 |
| --- | --- | --- |
| Course / 30 levels | 独立分支归位玩法、第二次变化、W4-M2 formal 前置、W4-M4 unlock、失败/刷新/恢复/五项目浏览器 | W4-M4/W4-M5 仍 legacy，其余内容未全量验证，第四周没有完整系统闭环 |
| Blockly（依赖防回归） | W4-M1 work 只读无副作用，W4-M1 formal regression 通过 | W4-M3 不新增 Blockly 系统证据，不能据此满足全 Blockly row |
| Python | 真实 CodeMirror、exact grammar、受限 Worker、typed branch trace、attempts、work、安全与 load/timeout | 仅 W4-M3 单关，后续 Python/AI 模式未正式化或全内容验证 |
| Parent / saves | session/work/proof/report、refresh/reopen、export-import、clear、migration、CAS、corrupt recovery | 全站 parent/save 路径和所有版本/关卡未统一复验 |
| UI / release | 五项目响应式、键盘/触控、语义可访问性、mute/reduced motion、asset/lazy/runtime recovery、性能与 page health | 真实屏幕阅读器人工验证、儿童隐私发布审计、版本化公开部署、线上 404/性能/恢复仍缺失 |
| Growth / rewards / equipment | 本关零惩罚、无装饰奖励，既有装备与能力不变 | W4-M3 不新增第四周 reward/mastery 效果，不能证明系统或周级 loop 完成 |

实施后即使单关所有本地证据通过，最高也只能报告 W4-M3 `One-level playable`。W4-M4、W4-M5、第四周 `System loop complete`、30 关 `Full-content verified`、全站通过、公开部署和商业生产完成继续为 `not complete`。没有 public deployment 授权与线上证据时，`UI / release` 的部署单元格始终缺失。

## 规格自检

- 核心玩法、两张卡、默认贯穿错误、无 else 缩进、无缩进 else、正确结构和五状态互相一致。
- 条件表达式从头到尾保持不变；学习点是 Python body/orelse ownership，不重复 W4-M1 字段映射或 W4-M2 变量覆盖。
- 唯一事实源来自保存的可见 CodeMirror、同步 exact grammar、真实 Worker 与 typed trace，不使用 legacy answer、stdout、React、DOM、动画或测试注入。
- revision 10、legacy replay、formal upgrade、session、work、proof、parent、W4-M4 unlock、clear、CAS、corrupt 和五类保存故障边界互相一致。
- W4-M1/W4-M2 只读且语义不变；W4-M4/W4-M5 不被本任务提前正式化。
- 故事只消费第二次变化，不展示第三次、本相或贬书；孩子不编写攻击、伤害或惩罚命令。
- 素材计划、provenance、儿童安全、输入、浏览器、可访问性、性能、安全与完成声明均有实施前门禁。
- 本规格没有把待生成 hash 当作已知事实，也没有以静态配置或 UI 壳冒充可玩证据。

## 下一阶段门禁

用户书面批准本规格后，下一步只能使用 `writing-plans` 生成逐文件实施计划。计划必须列出 exact 文件、导出 API、revision-10 keys、RED→GREEN 测试、素材生成/验收步骤和候选验证命令。在用户另行授权实施前，不修改生产代码；未获明确授权时，不 commit、push、merge、deploy、创建 PR、删除、重置、安装、付费或对外发送。
