# W4-M2 第一次变化：Python 变量覆盖取证设计

## 目标、范围与完成边界

将 `w4-m2 第一次变化` 从 legacy `expectedSequence`、`expectedOutput`、通用 `PythonEditor` 与 `MissionTools` 通关路径升级为一关由真实可见 CodeMirror Python、受限 Pyodide Worker 和持久化 canonical trace 共同驱动的正式变量任务。

用户批准的核心玩法是 **两只证据匣：修复变量覆盖**。初始 Python 把普通观察与火眼核验两次结果都写进 `appearance`，导致第一次外形记录被覆盖且 `identity` 缺失。孩子必须把第二行真实代码的目标变量改为 `identity`，让外形与真实身份分别保存后再封存取证记录。

本任务复用 W4-M1 已建立的同源 Pyodide runtime、Worker 生命周期、安全轮廓、保存优先、作品、正式证明、家长摘要和五项目浏览器门禁；不复用 W4-M1 固定 `if/else` grammar、Blockly trace、mapping run 或 completion proof，不重新开发前三周系统。

本规格获用户确认后可报告 W4-M2 `Design complete`。实施预选且最高允许报告的等级为 W4-M2 `One-level playable`；只有孩子可见输入、真实 Python 执行、失败、帮助、作品、刷新、恢复、跨关与五项目浏览器证据全部通过后才可使用该等级。W4-M3～M5、第四周 `System loop complete`、30 关 `Full-content verified`、全站闭环、`Commercial production complete` 与公开部署继续为 `not complete`。

## 原著事实与故事切分

第四周继续只覆盖《西游记》第二十七回《尸魔三戏唐三藏　圣僧恨逐美猴王》：

- 原文来源：<https://zh.wikisource.org/zh-hans/西游记/第027回>；
- 第一次变化中，白骨精变作送斋女子，携香米饭与炒面筋接近师徒；
- 悟空返回后以火眼金睛识破；妖怪随后借法脱身，第一次变化结束；
- 老妇、老翁、本相与贬书属于 W4-M3、W4-M4 和 W4-M5 的后续故事范围。

儿童安全呈现不得复述或可视化原文中的攻击、假尸、尸体、蛆虫、青蛙、骷髅、成人性化描写、羞辱或惩罚。W4-M2 的固定安全尾声只表述“悟空识破第一次变化，变化者借法脱身，山岭疑云仍未散去”，不让孩子编写攻击、惩罚或逐走命令，也不提前展示第二次变化。

## 已批准的孩子可见玩法

### 页面起点

页面延续明亮 3D 中国儿童绘本风格和“故事舞台 + 编程工作区 + 运行反馈”结构：

- 左侧为白虎岭故事舞台、送斋来客与两张公开证据卡；
- 右侧为真实 CodeMirror Python、外形匣/身份匣状态和本次运行记录；
- W4-M1 的“第一份积木与 Python 对照经卷”保留为默认折叠的只读复习区；
- 全关只有一个主运行入口“运行取证”。

课程注册必须把 W4-M2 明确标记为 `mode: "python"`，不能继续使用当前将所有 formal mission 固定成 Blockly 的 helper。实施应增加只服务显式模式的 formal factory 或独立 `formalPythonMission`，并保证 W1～W4-M1 的 `mode: "blockly"` 不变。W4-M2 的默认代码来自 versioned session 创建器，不写入 course `starterCode`，course 也不得携带 `expectedOutput`。

W4-M2 使用专属且不泄题的三层提示：

- 观察：“看看两次核验分别写进了哪只证据匣，哪一只后来没有留下记录。”
- 思考：“同一个变量再次赋值会覆盖旧值；两种事实需要各自保存。”
- 局部提示：“检查第二行写入的目标变量，是否和这次火眼核验的事实类型相符。”

现有按故事先后自动生成的通用 formal hints 不适合本关变量概念；实施必须允许本关显式 hints，同时不改变既有正式关卡提示。

W4-M1 作品回看没有复制、编辑、运行、自动填入、session 更新或完成回调。W4-M2 的 grammar、Worker、runner、proof 与 unlock 不读取该作品；打开或关闭回看不能改变 W4-M2 的代码、运行、作品或进度。

### 两项公开证据

故事舞台始终公开显示本关事实：

1. `ordinary-eyes`，儿童标签“普通观察”：得到 `送斋女子`；
2. `fiery-eye-check`，儿童标签“火眼核验”：得到 `白骨精`。

这两项是公开场景输入，不是隐藏答案表。普通观察与火眼核验只提供事实值，不返回通关布尔值、不决定目标变量，也不发布完成。

### 初始真实 Python

首次进入保存以下三行真实 CodeMirror 文本：

```python
appearance = ordinary_eyes()
appearance = fiery_eye_check()
seal_record(appearance, identity)
```

程序结构、函数名、调用顺序和 `seal_record` 参数固定。普通 UI 只允许编辑第二行左侧目标变量的稳定 source span，值域精确为 `appearance | identity`；第一行和第三行保持只读。

可访问选择器“第二次核验写入哪个变量”与 CodeMirror 中第二行目标 token 绑定同一文本 transaction。鼠标、键盘、触控和屏幕阅读器都必须修改真实 CodeMirror 文本，不维护平行答案状态。直接在允许 source span 内编辑也必须经过相同 token 白名单，无法把其他位置变成隐藏输入。

### 默认失败

默认代码通过语法与安全验证后在 Worker 中真实执行：

1. `ordinary_eyes()` 返回“送斋女子”，写入 `appearance`；
2. `fiery_eye_check()` 返回“白骨精”，再次写入 `appearance`，覆盖先前值；
3. `seal_record(appearance, identity)` 读取不到 `identity`，记录无法封存。

这里必须保留真实 Python 的 `NameError` 语义：由于实参求值在 callback 调用前失败，默认代码不会伪造一次已执行的 `seal_record`。Worker 从真实 traceback、失败 source span 和执行后 globals 记录 `seal` attempt（`executed: false`、`missingVariable: "identity"`）；同步 grammar 必须确定性重建同一失败语义。

这个精确 `NameError` 是本关默认课程输入产生的预期学习失败，保存为 `evidence-unsealed` 并增加覆盖类困难；它不是 Worker/runtime infrastructure failure。其他未在专属 grammar 中声明的 `NameError` 一律作为 validation/contract rejection 处理，不能借异常文本进入默认学习分支。

页面只在 run 与不可变 failure snapshot 保存成功后显示：

- 外形匣先写入“送斋女子”；
- 第二次核验又写入外形匣并发生覆盖；
- 身份匣尚无记录；
- 封存未完成，所有惩罚为零。

反馈不得直接说“把第二行改成 identity”，不得自动选择、编辑、运行或完成任务。

### 修正与成功

孩子把第二行左侧改为 `identity` 后，旧 trace、run、failure snapshot、观察和成功候选立即失效，正在运行的 Worker 被取消。再次点击“运行取证”必须从第一行开始完整执行保存后的新代码。

正确代码真实执行后：

- `appearance = "送斋女子"`；
- `identity = "白骨精"`；
- `seal_record` 读取两项完整公开事实；
- runner 从 `evidence-ready` 进入 `evidence-sealed`；
- 成功 run 先保存，当前正式素材 ready 后，作品、formal proof 与 mission completion 原子保存；
- Scene 才播放固定安全尾声并展示已经持久化的 W4-M3 解锁。

成功不发货币、资源或装饰性奖励。所有学习失败严格为零生命、零资源、零星级损失，不撤销装备、能力、既有任务或正式证明。

## 唯一事实链与 canonical trace

唯一执行链为：

```text
可见 CodeMirror Python
→ 原子保存 W4-M2 draft
→ 同步 exact allowlist grammar（导入与 proof 复算）
→ 受限 Pyodide Worker 的 Python AST 白名单与真实 exec
→ assignment / overwrite / seal canonical trace
→ deterministic variable-evidence runner
→ 保存 run / failure snapshot
→ 原子保存 work + formal proof + completion
→ Scene 只播放已保存事件
```

W4-M2 定义专属 typed trace，不复用 W4-M1 的 Blockly/Python mapping trace。至少包含：

- `assign`：代码行、目标变量、证据来源、实际写入值、写入前值、是否覆盖、Python source span；
- `seal`：实际读取的 `appearance`、`identity`、缺失变量、调用 source span；
- `result`：`evidence-ready | evidence-unsealed | evidence-sealed`、失败原因与固定零惩罚。

状态语义固定：首次或编辑后的有效草稿为 `evidence-ready`；默认真实运行保存为 `evidence-unsealed`；只有完整成功 run 为 `evidence-sealed`。失败的 `seal` trace 必须标记 `executed: false`，成功的 `seal` trace 才标记 `executed: true` 并包含 callback 实际收到的两项值。

Worker 返回的每个 trace item 必须来自真实执行。同步 grammar 从相同保存文本确定性重建同一语义，用于离线导入、作品和 proof 防伪；同步 grammar 不能替代玩家运行。Worker trace 与同步 trace 任一字段不一致必须 fail closed。

领域边界固定为六个可独立测试的职责，不把新逻辑继续堆入 W4-M1 模块：

1. `WeekFourVariableContract`：公开证据、assignment/seal trace、failure snapshot 与 runner result；
2. `WeekFourVariablePythonGrammar`：同步 exact grammar、source span 与离线 canonical trace；
3. `WeekFourVariablePythonRunner/Worker`：Pyodide 生命周期、AST allowlist、真实执行、timeout 与 structured result；
4. `WeekFourVariableSession/Schema`：revision-9 session、work、evidence exact parser 和重算防伪；
5. `WeekFourVariableEvidenceExperience/Editor/Scene`：保存优先编排、真实 CodeMirror 输入与只消费保存事件的视觉播放；
6. formal course、ProgressContext、parent、storage fault、asset/bundle/E2E gates 只做明确接线，不成为第二语义源。

成功不得读取或比较 legacy `expectedSequence`、`expectedOutput`、stdout、固定输出字符串、React state、动画状态、DOM、坐标、W4-M1 work、隐藏答案数组、缓存成功、直接 storage 标记或测试注入。Scene 只消费已保存事件，不能决定运行正确性或完成。

## 专属 Python grammar、Worker 与安全边界

W4-M2 复用 `public/runtime/pyodide-314.0.2/` 的固定同源 runtime 目录与既有 MPL-2.0 provenance，不复制 runtime、不增加 CDN、`latest`、npm 或 pip 依赖。新 Worker 从自身 assets URL 相对解析同一 runtime，继续支持 Vite base path。

W4-M2 必须新增独立 grammar、runner 和 Worker 合同。不得放宽或塞入 W4-M1 只允许固定 `if/else` 的 grammar/Worker。

同步 grammar 只接受三条固定语句：

1. `appearance = ordinary_eyes()`；
2. `appearance | identity = fiery_eye_check()`；
3. `seal_record(appearance, identity)`。

换行统一为 LF；缩进、函数名、参数、语句数和 source span 必须精确。grammar 是正向 allowlist，不通过关键词黑名单判断安全。

Worker 的 Python AST 白名单只允许：

- 一个包含两个简单赋值与一个表达式调用的 `Module`；
- 第一条语句精确为目标 `appearance` 调用零参数 `ordinary_eyes`；
- 第二条语句只允许目标 `appearance | identity` 调用零参数 `fiery_eye_check`；
- 双参数调用 `seal_record(appearance, identity)`；
- 完成上述结构所需的 `Assign`、`Name`、`Store`、`Load`、`Call`、`Expr` 节点。

Worker 的逐行结构验证必须与同步 grammar 完全同构，包括语句顺序、每行 callback、目标范围和参数顺序。`identity = ordinary_eyes()`、交换两行、把 `ordinary_eyes` 放到第二行或把 `fiery_eye_check` 放到第一行都必须在执行前被两边一致拒绝，不能形成“Worker 可执行、同步 grammar 不接受”的第二路径。

任何未列节点或名称立即拒绝。明确禁止 import、attribute、subscript、文件、浏览器、网络、JS bridge、动态执行、反射、双下划线、函数或类定义、循环、条件、异常、协程、集合、运算表达式和其他调用。

Worker 使用空 `__builtins__`，只提供三个 trusted callbacks：

- `ordinary_eyes()` 返回公开值“送斋女子”并记录证据来源；
- `fiery_eye_check()` 返回公开值“白骨精”并记录证据来源；
- `seal_record(appearance, identity)` 只记录实际参数，不返回通关布尔值。

每次运行使用可终止 Worker 和稳定 request ID。runtime load、实际执行和结果发布具有独立状态；cold timeout 为 20 秒，warm run timeout 为 1 秒。取消、timeout、load error、worker error、contract mismatch 和迟到消息必须终止或忽略，不能写入过期结果、重复完成或覆盖更新后的代码。

虽然普通 UI 无法输入循环，独立安全 probe 仍必须证明 import、文件、浏览器/网络、attribute/subscript、动态执行、双下划线、未知名称/调用和无限循环被稳定拒绝或终止，且运行前后 Progress 与 storage 深相等。

## 失败、火眼金睛与提示边界

只有代码通过安全验证、Worker 真正开始执行并产生已保存 failure snapshot，才增加一次有效运行和一次变量覆盖失败。语法或安全拒绝计入 `validationFailures`；runtime load、Worker error、timeout、资源和 lazy chunk 故障计入 `runnerInfrastructureFailures`，不算孩子的概念失败或 mission attempt。

火眼金睛只在有效失败快照保存成功后由孩子主动打开。它可以显示：

- 第一次与第二次实际写入的目标匣；
- 每次写入值与是否覆盖；
- 封存时实际存在和缺失的变量；
- 当前失败来源行。

它不得显示正确第二行、正确 token、自动修复按钮、完整成功代码或下一步答案，不得编辑、运行、排序、复制、填充或完成。观察审计必须先保存再展示；同一未失效 snapshot 只记录一次。观察前后除审计字段外，Python、trace、run、work、proof、资源与完成状态必须深相等。

提示层级只讲概念：变量名像证据匣标签、同名再次写入会覆盖旧值、两项不同事实需要分别保存。提示不说出应选择的变量名，不改代码、不移动焦点到答案、不运行。

## Progress revision 9、session、作品与正式证明

Progress V3 从 `schemaRevision: 8` 升到 `schemaRevision: 9`。新增 W4-M2 专用 session，至少保存：

- 完整 Python code 与第二行允许编辑的稳定 source span；
- 最近同步 trace、Worker trace、deterministic run 与 failure snapshot；
- 火眼金睛观察审计；
- `totalRuns`、`overwriteFailures`、`validationFailures`、`runnerInfrastructureFailures`；
- 使用的提示层级与困难概念计数；
- `lastRunAt` 与 `savedAt`。

持久化 exact keys 固定为 `sessions['w4-m2']`、`missionCompletionEvidence['w4-m2']` 与 `works['w4-m2-variable-evidence-record']`。`lastRun` 与 canonical trace 是本关的结构化 output；不保存或比较 stdout。`totalRuns` 是真实学习运行次数并随刷新、导出导入和恢复保留；既有 mission `attempts` 只在正式 completion 事务成功时按当前项目语义更新，基础设施失败、观察、重放和完成保存重试不得重复增加。

计数口径固定：

- code 安全验证通过且 Worker 开始真实执行后才增加 `totalRuns`；
- 已保存 run 发现外形覆盖或身份缺失时增加 `overwriteFailures`；
- 明确运行请求被语法、安全或损坏合同拒绝时增加 `validationFailures`；
- runtime、Worker、timeout、asset 或 lazy infrastructure 问题单独增加 `runnerInfrastructureFailures`；
- 同一 snapshot 的观察和同一提示层级只审计一次。

W4-M2 正式完成证明继续使用 `kind: "formal-v3"`，并绑定：

- 当前保存 Python code 与 source span；
- 同步 canonical trace 和真实 Worker trace；
- 完整 `evidence-sealed` run；
- W4-M2 作品 ID；
- `completedAt` 与 `verifiedAt`。

成功时原子保存 versioned work：

- `kind: "python-variable-evidence-v1"`；
- `workId: "w4-m2-variable-evidence-record"`；
- `missionId: "w4-m2"`；
- 标题“第一次变化变量取证记录”；
- 完成时 Python、canonical trace、成功 run、`createdAt` 与 `verifiedAt`。

作品不是截图、装饰卡或答案源。导入时必须从 code 通过同步 grammar 重建 trace 与 run，并逐字段核对 session、work 与 proof；不一致时整份导入失败。重放仍须启动真实 Worker，不用导入验证冒充执行。

家长报告新增 W4-M2 摘要：总运行、覆盖类困难、安全拒绝、基础设施故障、观察次数、作品保存、formal/legacy 状态和完成时间。父母端不显示完整 Python、正确第二行、变量名答案、source line、raw trace 或可复制答案值。

## 前置、迁移、解锁与历史兼容

新玩家进入正式 W4-M2 必须持有 W4-M1 `formal-v3`。裸 completion、W4-M1 `legacy-replay-only`、伪造 unlock 或只有 W4-M1 work 均不能建立新的正式前置。

revision 1～8 继续严格解析并迁移到 revision 9：

- 历史存档未完成 W4-M2 时，不生成 W4-M2 session、code、trace、run、work 或 proof；
- 历史存档已完成 W4-M2 时，生成精确来源版本的 `legacy-replay-only`，只保留历史完成与既有后续访问，不伪造正式输入；
- 历史 W4-M3 及后续访问通过明确兼容规则保留，但不计入第四周正式掌握；
- 历史玩家必须先取得 W4-M1 `formal-v3`，再完整重玩 W4-M2，才能将 W4-M2 evidence 原子升级为 `formal-v3`；原 `completedAt` 保留并新增 `verifiedAt`；
- W4-M1 revision-8 session、work、evidence 与验证语义保持不变；
- revision 9 parser 使用 exact keys，拒绝未知 session、work、evidence、时间、数字、code、trace、run 与引用。

W4-M2 `legacy-replay-only` provenance 必须使用精确联合类型，不允许版本与 revision 随意组合：

- `{ sourceVersion: 1, sourceSchemaRevision: null }`；
- `{ sourceVersion: 2, sourceSchemaRevision: 1 }`；
- `{ sourceVersion: 3, sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }`。

迁移测试必须覆盖 V1、V2 和 V3 revision 1～8。特别是 revision 8 同时含 W4-M1 `formal-v3` work/proof 与旧 W4-M2 completion 时，W4-M1 session/work/proof 必须语义不变，W4-M2 只新增来源为 revision 8 的 legacy marker，不能伪造 W4-M2 code 或 work。

正式 W4-M2 completion 持久解锁 W4-M3；刷新、重开、导出导入和合法恢复后保持一致。新正式路径的 W4-M3 必须由 W4-M2 `formal-v3` 解锁；历史兼容访问单独保留，不得把 bare legacy completion 提升为正式前置。W4-M3～M5 仍保持 legacy，本任务不正式化或实现其玩法。

页面访问分支固定为：

1. 新玩家只有 W4-M1 `formal-v3` 才进入正式 W4-M2 Experience；
2. 历史 W4-M2 已完成但 W4-M1 尚未 formal 的用户，打开 W4-M2 时只看到“历史记录已保留”的只读状态和返回 W4-M1 正式重玩入口，不创建 session、不允许旧 generic task 再次写 completion；其既有 W4-M3 legacy 访问保留；
3. 历史 W4-M2 已完成且后来取得 W4-M1 `formal-v3` 时，进入正式 W4-M2 Experience，并显示“历史完成已保留，可正式验证”；
4. 新玩家的 W4-M3 unlock 只认 W4-M2 `formal-v3`；历史用户的既有 W4-M3～M5 legacy 访问由独立 compatibility 判断保留。

因此“W4-M3～M5 保持 legacy”精确定义为：不进入 formal executable registry，不新增专属 session、Worker、trace、work 或 proof；不得删除现有 legacy 配置或历史兼容访问。

## 保存优先、并发与恢复

发布顺序固定为：

1. Python draft 原子保存；
2. grammar 与 Worker 只读取刚确认保存的同一 revision；
3. run 或 failure snapshot 保存；
4. 火眼金睛观察审计保存后展示；
5. 成功 run 已保存且当前正式素材 ready 后，work、formal proof 与 completion 在一个原子事务中保存；
6. 使用已经 ready 的当前场景资产播放固定成功尾声并展示 W4-M3 解锁。

draft、run、observation、work 或 completion 任一写入失败都必须 fail closed，并显示精确本地重试入口。测试故障模式固定为：

- `fail-w4-m2-draft`；
- `fail-w4-m2-run`；
- `fail-w4-m2-observation`；
- `fail-w4-m2-work`；
- `fail-w4-m2-completion`。

生产存储中 work/proof/completion 仍为一次原子写入；work 与 completion fault 只用于分别验证事务阶段，任何失败都不能留下半份作品、证明、mission completion 或 unlock。

双击运行、快速切换目标变量、延迟 Worker、迟到素材回调、过期 CAS 和保存回调不能重复运行、完成或覆盖新 code。跨标签冲突提供当前代码备份和显式载入外部进度，不静默覆盖。损坏 current 必须先保留原始字节供下载，再恢复最后合法 snapshot。刷新、重开、导出导入和恢复后必须还原同一 Python、作品和可重新验证的 trace，而不只是恢复画面。

除五类写入 fault 外，E2E 使用稳定故障 ID `fail-w4-m2-runtime-load`、`fail-w4-m2-runtime-timeout`、`fail-w4-m2-assets` 与 `fail-w4-m2-lazy`。每个模式只影响对应边界：runtime/timeout 不写学习失败，asset/lazy 不发布 playback 或 completion，关闭模式并重试后同一保存候选最多发布一次。CAS 测试必须证明旧标签无法覆盖新 code；corrupt 测试必须证明原始字节可下载、合法 snapshot 被恢复且恢复后重新 grammar/Worker 验证。

CAS 与损坏测试再固定 `fail-w4-m2-cas-stale-writer`、`fail-w4-m2-corrupt-current` 两个 test-only setup ID；它们不得存在于生产 UI 或成为成功开关。精确不变/变更断言为：

- draft fault：原 session/code/trace/run/work/proof/completion/unlock 全部不变；重试后只保存一次新 code；
- run fault：新 code 已保存，但 lastRun/failure/observation/work/proof/completion/unlock 不变；重试后只产生一个 canonical run 与一次对应计数；
- observation fault：code/run/failure 保持，观察次数与 UI 观察内容不发布；重试后只增加一次观察，其余字段深相等；
- work 或 completion fault：成功 run 保持，但 work/proof/completion/unlock 均不存在；重试后四者在同一事务精确发布一次；
- runtime load fault：draft 保持、`runnerInfrastructureFailures + 1`、`totalRuns` 和所有学习/完成字段不变；
- runtime timeout：若真实执行已开始则 `totalRuns + 1`，同时 `runnerInfrastructureFailures + 1`；不增加覆盖失败、mission attempts 或完成字段；
- asset/lazy fault：session 学习计数不变，不发布 playback/work/proof/completion/unlock；局部重试后读取同一保存 run，不重复运行 Worker；
- stale-writer：旧标签无法覆盖新 revision，显示旧代码备份；只有显式载入外部进度才改变当前 view；
- corrupt-current：先下载字节完全一致的损坏原文，再恢复 snapshot；恢复后 code/trace/work/proof 必须重新解析重放，不能由损坏内容生成成功。

## UI、无障碍与正式素材

桌面 1440 宽度使用故事舞台与 Python 工作区两列；平板和手机依次纵向排列“舞台 → 公开证据 → W4-M1 只读回看 → Python → 两只证据匣 → 运行反馈”，不得横向滚动。

交互要求：

- 只有一个主按钮“运行取证”；
- 第二行目标变量可由鼠标、真实触控、键盘和屏幕阅读器修改；
- `Enter` 与 `Space` 操作同一 CodeMirror source span；
- 失败后焦点移动到可理解的状态区，并提供“查看问题代码行”；
- 不只依靠颜色、动画或图形表达覆盖、缺失与成功；
- focus、对比度、静音、减少动态效果和窄屏可读性延续既有标准；
- CodeMirror、Worker、Scene、W4-M1 review、asset 或 Experience lazy chunk 失败均有局部重试，恢复前不发布结果或完成。

视觉延续 W4-M1 已批准的明亮白虎岭 3D 儿童绘本方向。实施允许复用已核验的 `assets/week-four-mapping/white-tiger-ridge-background.webp`，但 manifest 与 asset gate 必须增加真实 W4-M2 screen slot 并重新验证两关引用，不得复制同一图片制造未追踪副本。

W4-M2 新增两张正式 WebP：

1. `assets/week-four-variables/woman-with-offering.webp`：1024×1024 透明背景、端庄成年山中女子，携绿色器皿与素斋篮，儿童安全、无性化、无武器、无攻击、无伤害；
2. `assets/week-four-variables/variable-record-states.webp`：1536×512 透明横向三格，按三个精确 512×512 单元表现“等待记录、外形匣被覆盖且身份匣为空、两匣分别封存成功”，不含文字、伪字、代码或答案 token。

两张新资产的 manifest screen slot 精确为 `w4-m2 WeekFourVariableEvidenceScene`，内建生成源必须为 RGBA，shipping WebP 必须保留真实 alpha 且单张不超过 `512 * 1024` bytes。复用背景的现有 manifest screen slot 字符串精确更新为 `w4-m1 WeekFourMappingScene; w4-m2 WeekFourVariableEvidenceScene`，并由 gate 证明同一 build asset 没有被复制或漏记。

素材只能由环境内建图像生成/编辑能力制作，或来自 provenance 已核验的项目来源。每张必须记录稳定路径、用途、工具、完整 prompt、尺寸、license/provenance、实际 screen slot、SHA-256 与 QA 状态。新素材的 SHA-256 只能在接受生成结果并完成仅技术转换后计算，随后写入 manifest 并由 exact hash gate 锁定；规格不得预先编造未知 hash。只有 provenance 已核验并在 320、390、768、1440 与 Firefox 原尺寸截图中通过裁切、清晰度、人物安全、状态可辨和可读性检查，才可标记 `visual-qa-passed`。

UI 图标继续使用项目现有 Phosphor Icons 并记录包版本、图标名和许可证；图标不替代故事插画。禁止 CSS/div art、emoji、手写 SVG、代码画布、占位框、拉伸截图或无 provenance 素材作为正式画面。

## 开工前支持矩阵与性能预算

在第一项生产代码前用 RED contract 固定：

- desktop Chromium 1440×1024；
- tablet WebKit 768×1024；
- mobile Chromium 390×844；
- desktop Firefox 1440×1024；
- narrow Chromium 320×844；
- 鼠标、键盘、真实触控和屏幕阅读器语义；
- focus、对比度、reduced motion、mute、无横向溢出和局部资源恢复；
- W4-M2 本地 lazy cold closure 上限 `3 * 1024 * 1024` bytes；
- 单张 raster 上限 `512 * 1024` bytes；
- W4-M2 cold 任务媒体总量（含复用背景）上限 `1.25 * 1024 * 1024` bytes；
- 固定 Pyodide core 网络传输上限 `15 * 1024 * 1024` bytes；
- 10 Mbps 网络和 4× CPU 限速下 cold ready + 首次 result 最长 20 秒，期间有可访问的真实进度、取消和重试；
- runtime warm 后单次三行运行不超过 1 秒；
- entry、homepage、共享入口、Phaser、W1～W3 与 W4-M1 既有预算不得提高。

屏幕阅读器在自动化中只声明可执行的语义证据：`@w4-m2-accessibility` 必须验证 editor/selector/button/status/alert/dialog 的 role、accessible name、live-region 更新、焦点顺序和纯键盘完成路径；没有真实辅助技术人工证据时不得声称完整屏幕阅读器实测。

W4-M2 E2E source contract 固定标签：`@w4-m2-full`、`@w4-m2-keyboard`、`@w4-m2-mouse`、`@w4-m2-touch`、`@w4-m2-accessibility`、`@w4-m2-storage`、`@w4-m2-corrupt`、`@w4-m2-parent`、`@w4-m2-work`、`@w4-m2-python-security`、`@w4-m2-cold`、`@w4-m2-runtime-fault`、`@w4-m2-asset-fault`、`@w4-m2-narrow`、`@w4-m2-external` 与 `@w4-m2-lazy`。五个 Playwright project 名称精确为：

- `desktop-chromium-1440x1024`：完整主路径以及全部专项标签；
- `tablet-webkit-768x1024`：`full`、`cold` 和代表性 asset/runtime 恢复；
- `mobile-chromium-390x844`：`full`、`touch`、`cold`；
- `desktop-firefox-1440x1024`：`full`、`keyboard`、`cold`；
- `narrow-chromium-320x844`：`full`、`touch`、`narrow`、`cold`。

项目当前未安装 axe，因此本任务不新增依赖、不虚构 axe 结果；以 DOM 语义、ARIA、live region、焦点和键盘/触控路径形成自动化可访问性证据，真实屏幕阅读器人工验证继续列为未验证范围。

预算不得为实现通过而事后放宽。若复用 runtime 后仍不能满足安全、传输或时延预算，实施必须停止并重新进行产品/运行时选择。

## 可执行验收标准

### 课程与源码合同

1. W4-M2 以 `mode: "python"` 进入 `formalCourse`、formal outline、executable registry 和专用 lazy route；从 legacy `expectedSequence`、`expectedOutput`、`starterCode`、通用 `PythonEditor`、`LegacyMissionBuilder` 与 `MissionTools` 通关路径移除。
2. W4-M1 继续 formal 且行为不变；W4-M3～M5 保持 legacy，不进入 formal executable registry，也不新增专属 session/Worker/trace/work/proof；现有配置和历史兼容访问不得删除。
3. W4-M2 使用专属变量提示，不继承“先后顺序”式通用提示；提示不包含正确 token 或完整成功代码。
4. 源码合同拒绝 hidden answer、stdout 比较、直接 storage 完成、`eval`、`new Function`、React success、DOM/动画成功和测试注入。
5. W4-M1 work review 保持无复制、编辑、运行、填入或完成 callback，打开前后 W4-M2 Progress 深相等。

### Python 执行、失败与安全

1. 默认保存代码在真实 Worker 中产生两次对 `appearance` 的写入、一次覆盖、缺失 `identity` 的 seal 失败和零惩罚。
2. 只把第二行目标改为 `identity` 后，同步 grammar、Worker trace、runner 与已保存 run 完全一致，最终状态精确为 `evidence-sealed`。
3. 缺行、换行/缩进漂移、错误函数、错误参数、未知目标、伪造 trace/run、stdout、场景或直接完成均不能通过。
4. syntax error、import、attribute/subscript、dunder、未知 name/call、文件、browser/network/JS、动态执行、函数/类、条件、循环、异常、协程、无限循环、runtime load error、worker error、timeout、cancel 和迟到消息均有确定测试。
5. 相同保存 code 重复运行产生确定性相同语义；编辑 code 后旧执行证据全部失效。

### Progress、恢复与跨系统

1. revision 1～8 严格迁移到 9；旧 W4-M2 完成只生成 `legacy-replay-only`，不伪造 session/code/trace/run/work/proof；正式重玩可升级。
2. 新玩家正式前置要求 W4-M1 `formal-v3`；历史访问与正式前置分离。
3. draft、run、observation、work、completion 五类保存故障 fail closed、可重试且没有半写副作用。
4. refresh、reopen、真实 export/import、malformed import、CAS、双击、过期 result、损坏原文下载与 snapshot 恢复全部覆盖。
5. work 与 formal proof 绑定当前成功 session，并可从 code 同步重建、由真实 Worker 重放验证。
6. formal completion 原子解锁 W4-M3，并在家长报告写入不泄题摘要；不增加货币或装饰奖励。
7. Parent `clear` 清除 W4-M2 session、work、evidence、mission completion 与 unlock，保留既有 clear 合同要求保留的隐私/设置字段；clear 后不能凭残留 work 或缓存进入正式 W4-M3。
8. 成功后 refresh 必须恢复相同 code、structured `lastRun`、work、proof 与时间；只读 replay 不增加 `totalRuns` 或 mission attempts。导出后导入空白存储必须由 parser 重建同一 code/trace/run/work/proof，再由真实 Worker replay；createdAt/completedAt 保留，verifiedAt 仅按正式升级规则变化。
9. revision-9 observation capability 聚合必须同时包含 W4-M1 与 W4-M2 的 observation audit；任何观察记录都要求已获得且已稳定的火眼金睛能力，不能继续只扫描 W3 sessions。

### 资产、性能与真实浏览器

1. 复用背景和两张新资产具有 exact inventory、manifest、hash、尺寸、alpha、live slot、原尺寸 QA 与媒体预算证据。
2. 五项目真实浏览器使用孩子可见操作完成：

```text
进入正式 W4-M2
→ 可选打开 W4-M1 只读回看且无副作用
→ 默认运行并保存覆盖失败
→ 火眼金睛且代码不变
→ 修改真实第二行目标变量
→ 完整真实 Worker 成功
→ 原子保存作品与正式证明
→ 固定安全原著尾声
→ 刷新重放
→ 导出导入恢复
→ 家长摘要
→ W4-M3 解锁
```

3. 浏览器矩阵同时覆盖鼠标、键盘、触控、320/390/768/1440、Chromium/WebKit/Firefox、五类保存故障、CAS、损坏恢复、runtime/asset/lazy failure、404、page health、mute 和 reduced motion。
4. 独立安全 probe 前后 Progress/storage 深相等；E2E source contract 禁止 W4-M2 成功注入，只允许固定的完整 W4-M1 formal 前置 helper。
5. W4-M1 专项与 W1～W3 关键正式回归、unit、typecheck、build、bundle、assets 和全站 E2E 审计必须新鲜运行并如实分类；W4-M1 历史 26/26 不能替代 W4-M2 证据。

## Completion matrix 与声明边界

W4-M2 直接涉及 `Course / 30 levels`、`Python`、`Parent / saves` 与 `UI / release`；W4-M1 只读作品使 `Blockly` 成为必须防回归的依赖行，但 W4-M2 不新增 Blockly 系统完成证据。以上行均不是 N/A：Course 只取得 W4-M2 单关证据，Parent 必须覆盖 work/report/export-import/clear/migration/CAS/corrupt，UI/release 必须覆盖本地响应式与可访问性但仍缺公开部署。

| Matrix 行 | W4-M2 单关必须取得的证据 | 仍为 `not complete` 的系统级缺口 |
| --- | --- | --- |
| Course / 30 levels | 独立变量覆盖玩法、原著第一次变化、W4-M1 formal 前置、W4-M3 unlock、失败/刷新/恢复/五项目浏览器 | W4-M3～M5 仍 legacy；其余课程内容未全量验证；第四周没有完整 reward/mastery 跨关系统 |
| Blockly（依赖防回归） | W4-M1 work 只读且不参与 W4-M2 成功；W4-M1 formal regression 通过 | W4-M2 不新增 Blockly 系统证据，也不能借 W4-M1 单关证明全 Blockly row |
| Python | 真实 CodeMirror、专属 grammar、受限 Worker、structured output、attempts、work、恶意输入与 load/timeout 失败 | 仅 W4-M2 单关；W4-M3～W6 的 Python/AI 互动仍未正式化和全内容验证 |
| Parent / saves | session/work/proof/report、refresh/reopen、export-import、clear、migration、CAS、corrupt recovery | 全站 parent/save 路径和全部版本/关卡仍未统一复验 |
| UI / release | 五项目响应式、键盘/触控、语义可访问性、mute/reduced motion、asset/lazy/runtime recovery、性能和 page health | 真实屏幕阅读器人工验证、儿童隐私发布审计、版本化公开部署、线上 404/性能/恢复仍缺失 |
| Growth / rewards / equipment | 本关明确零惩罚、无装饰奖励，既有装备与能力不被失败破坏 | W4-M2 不新增第四周 reward/mastery 效果；不能据此声称该系统或第四周 loop 完成 |

单关真实浏览器闭环最多支持 W4-M2 `One-level playable`。W4-M3～M5 仍为 legacy，因此第四周 `System loop complete`、30 关 `Full-content verified`、全站、商业完成和公开部署全部继续为 `not complete`。没有 public deployment 授权与线上证据时，`UI / release` 的部署单元格始终缺失。

## 规格自检

- 没有 `TBD`、`TODO`、占位要求或待实现者自行决定的核心产品规则。
- 方案 A、默认三行代码、两项公开证据、覆盖失败、正确修改、trace、run 与成功状态互相一致。
- 故事只消费第一次变化，没有展示老妇、老翁、本相或贬书；固定尾声不把攻击或惩罚变成孩子代码。
- W4-M2 拥有独立 grammar/Worker/trace/proof，不污染 W4-M1 固定 mapping 合同，也不回退 legacy。
- 唯一事实源来自保存的可见 Python 与真实 Worker；同步 grammar 只负责离线复算，不以 stdout、隐藏答案或 React state 替代执行。
- revision 9、legacy replay、formal upgrade、work、parent、W4-M3 unlock、五类保存故障和恢复规则互相一致。
- 视觉、provenance、儿童安全、输入、浏览器、性能、安全与完成声明均有实施前门禁。

## 实施计划硬门禁

用户确认本规格后，下一步实施计划必须逐项列出 exact 文件、导出 API、RED→GREEN 测试、schema revision 9 keys 与候选验证命令；未写清前不得修改生产代码。至少必须覆盖：

- 新建 `src/engine/weekFourVariableContract.ts`、`weekFourVariablePythonGrammar.ts`、`weekFourVariablePythonRunner.ts`、`src/workers/weekFourVariablePython.worker.ts`；
- 新建 `src/progress/weekFourVariableSession.ts`、`weekFourVariableSessionSchema.ts`；
- 新建 `src/components/WeekFourVariableEvidenceExperience.tsx`、`WeekFourVariableEvidencePythonEditor.tsx`、`WeekFourVariableEvidenceScene.tsx` 及样式/测试；
- 新建 `e2e/week-four-python-variable-overwrite.spec.ts` 与 `scripts/check-week-four-variable-e2e-contract.mjs`；
- 修改 course/formal outline/executable registry、Progress types/session/schema/progress/context/fault adapter、parent、MissionPageContent、bundle/asset gates、manifest、Playwright config 与 package scripts；
- 锁定 `schemaRevision: 9`、`sessions['w4-m2']`、`missionCompletionEvidence['w4-m2']`、`works['w4-m2-variable-evidence-record']`、`kind: "python-variable-evidence-v1"` 和上述所有 fault/tag ID；
- 先写 course/source/budget/asset/E2E contract RED，再按 contract → grammar/Worker → session/schema → completion/parent/storage → UI/asset → browser/full regression 的依赖顺序实施。
