# W4-M1 积木变代码：Blockly→Python 双轨等价修复设计

## 目标、范围与完成边界

将 `w4-m1 积木变代码` 从 legacy `expectedSequence`、`LegacyMissionBuilder` 与 `MissionTools` 兼容路径升级为一关由真实可见 Blockly 和真实 CodeMirror Python 共同驱动的过渡任务。用户批准的核心玩法是 **双轨等价修复**：左侧 Blockly 是孩子熟悉的正确条件图，右侧“学徒抄写的 Python”只有一个可见字段映射错误；孩子必须在受限 Python 编辑中修正该字段，让两套程序在两张公开卡上产生相同的条件、分支和场景状态。

本任务复用前三周已经建立的正式关卡结构、保存体系、首个阻塞反馈、火眼金睛、零惩罚、家长摘要和五项目浏览器矩阵，不重做前三周系统，也不把现有通用 Python legacy 壳包装成正式玩法。

本设计获批并写入后可报告 W4-M1 `Design complete`。实施任务预选且最高允许报告的等级是 W4-M1 `One-level playable`；只有真实浏览器中的孩子输入、双轨执行、失败、保存作品、刷新、恢复和跨关路径全部取得新鲜证据后才可使用该等级。W4-M2～M5、第四周 `System loop complete`、30 关 `Full-content verified`、全站闭环、`Commercial production complete` 和公开部署均明确排除，继续为 `not complete`。

## 批准的 Pyodide 同源运行时

用户已批准把 Pyodide `314.0.2` 的最小运行时以静态文件随本项目发布，不新增 npm 或 pip 依赖。运行时固定在 `public/runtime/pyodide-314.0.2/`：五个核心文件 `pyodide.mjs`、`pyodide.asm.mjs`、`pyodide.asm.wasm`、`python_stdlib.zip`、`pyodide-lock.json` 的总字节数为 13,544,397（低于独立 15 MiB 上限）；目录还必须只有其 MPL-2.0 `LICENSE` 与来源记录 `SOURCE.md`，且由 hash/size/provenance 门禁校验。

Worker 必须从自身 `assets/` URL 相对解析 `../runtime/pyodide-314.0.2/`，从而保留 Vite 的 `/xiyou-programming-journey/` base path；禁止 CDN、`latest` 或其它外部 runtime URL。`LICENSE` 及 `SOURCE.md` 必须向接收者提供 MPL-2.0 和官方固定下载、tag/source 获取地址；第三方文件不作修改。冷启动仍受 20 秒和 15 MiB runtime 预算约束，预热双卡运行仍受 1 秒约束，不能以放宽门禁换取通过。

## 原著依据与第四周故事切分

第四周继续只覆盖《西游记》第二十七回《尸魔三戏唐三藏　圣僧恨逐美猴王》：

- 原文来源：<https://zh.wikisource.org/zh-hans/西游记/第027回>
- 原著顺序包含女子、老妇、老翁三次变化，白骨精显出本相，以及唐僧写贬书逐走悟空。
- 儿童安全表现保留原著事实结果，但不表现攻击命中、尸体、骷髅、暴力伤害、羞辱或恐怖变化。

W4-M1 只消费“外形可能改变，身份需要核验”的通用引子，不提前展示女子、老妇或老翁三次具体变化。三次变化分别保留给 W4-M2～M4，W4-M5 再做综合复盘，避免第一关提前讲完后续内容。

## 已批准的孩子可见玩法

### 页面起点

关卡发生在明亮的白虎岭入口。页面延续前三周“故事舞台 + 编程工作区 + 运行反馈”的结构：

- 左侧为故事舞台和当前公开证据卡；
- 右侧工作区内并排显示一张真实 Blockly 条件图和一段真实 CodeMirror Python；
- Blockly 块与 Python 行之间显示稳定的对应关系；
- 全关只有一个主运行入口“对照运行”。

Blockly 图已正确连接，表达：

```text
如果 真实身份 == 白骨精
  继续核验
否则
  礼貌放行
```

它是本关的真实可执行参考程序，不是图片或静态说明。W4-M1 不要求孩子再次修 Blockly；课程输入聚焦于 Python 映射。工作区仍须使用真实 Blockly draft、compiler 和 trace，导入或损坏数据中的断线、多根、未知块、错误连接和伪造字段必须被编译器拒绝。

右侧 Python 初始代码为：

```python
if appearance == "白骨精":
    continue_verification()
else:
    polite_pass()
```

默认唯一课程错误是把 Blockly 的“真实身份”误抄成 `appearance`。孩子只能在真实 CodeMirror 文本的该字段位置选择 `appearance` 或 `identity`；其他位置不可通过普通 UI 编辑。选择器、键盘路径和触控路径必须修改同一份 CodeMirror 文本，不得维护替代答案状态。

### 两张公开卡

系统按固定顺序公开运行两张卡。卡片事实是场景输入，不是隐藏答案源：

1. `canon-mysterious-visitor`，标记为“原著引子”：`appearance = "陌生来客"`，`identity = "白骨精"`；
2. `practice-mountain-traveller`，明确标记为“逻辑练习，非原著事件”：`appearance = "山中樵夫"`，`identity = "普通人"`。

第一张卡只表达外形与真实身份不同，不展示三次具体化身。第二张卡只用于验证同一条件能够走另一条分支，不推进原著状态。

默认 Python 在第一张卡读取 `appearance` 并进入“礼貌放行”，与 Blockly 读取 `identity` 后进入“继续核验”不一致；运行在首个差异处停止。第二张卡必须在修正后继续执行，用于证明 `else` 分支也与 Blockly 一致。

### 失败、观察、修正与成功

默认运行失败后：

- 先保存不可变差异快照；
- 页面显示两边本次实际读取的字段、真假结果和进入的分支；
- 同时提供“查看问题积木”和“查看 Python 行”；
- 不显示正确字段，不自动选择字段，不编辑、运行或完成任务。

已经稳定解锁的“火眼金睛”只在有效失败快照保存成功后开放。观察显示本次公开事实、两边实际字段值、条件真假和实际分支，不显示应选择 `identity`、完整正确代码或下一步答案。观察审计保存成功后才展示；重复查看同一未失效快照只记录一次，观察前后除审计字段外的 Blockly、Python、trace、run、作品、资源和完成证明必须深相等。

孩子把 Python 字段从 `appearance` 改为 `identity` 后，旧运行、差异快照、观察和成功候选立即失效。再次点击“对照运行”必须从第一张卡开始完整执行。只有两张卡上的读取字段、字段值、条件结果、分支动作和可见场景状态全部一致，运行状态才从 `mapping-ready` 进入 `mapping-proven`。

所有学习失败严格零惩罚：不扣生命、资源或星级，不撤销装备、能力、既有任务完成或前置证明。成功不发货币、资源或装饰性奖励。

## 双轨唯一事实源与语义等价

唯一执行链为：

```text
可见 Blockly → versioned draft → Blockly compiler → typed Blockly trace
可见 Python  → saved CodeMirror text → exact allowlist grammar → restricted Worker → typed Python trace
                                                              ↓
                                  compare both traces for every public card
```

Blockly compiler 和 Python Worker 都输出同一个受限语义协议。每张卡的结果至少包含：

- `cardId`；
- 实际读取的 `field` 与 `value`；
- `conditionResult`；
- `branchAction`；
- `finalSceneState`；
- Blockly `sourceBlockId` 或 Python `line/column` 来源定位。

等价检查逐字段比较两条真实语义轨迹。成功不得读取或比较 `expectedSequence`、`expectedOutput`、stdout 固定字符串、React 状态、积木坐标、场景动画、隐藏答案数组或测试注入。移动 Blockly 坐标、伪造输出、只改动画或直接写完成状态都不能改变执行语义。

Blockly 块与 Python 行的对应关系只负责失败定位和可见讲解，不能替代执行。对应关系必须绑定稳定块 ID 与 Python AST source span；刷新、导出导入和合法恢复后仍指向同一真实来源。

Scene 只消费已经保存的语义事件并播放可见结果，不读取正确字段或决定成功。静音和减少动态效果只改变声音、动画强度和转场，不改变 trace、状态或保存语义。

## 受限 Python Worker

复用现有 `pythonRunner` 和 Worker 生命周期框架，但现有正则关键词黑名单不构成正式安全边界。W4-M1 必须升级为严格 AST 白名单与结构化结果协议：

- 只接受本关固定 `if/else` 结构；
- 名称只允许 `appearance`、`identity`、`continue_verification` 和 `polite_pass`；
- 常量只允许本关合同声明的字符串；
- 比较运算只允许 `==`；
- 调用只允许两个零参数场景动作；
- 禁止 import、attribute、subscript、文件、浏览器、网络、动态执行、反射、双下划线、函数或类定义、循环、异常、协程和其他未列语法。

父页面向 Worker 发送已保存代码和公开卡，不发送答案。Worker 在每张卡的独立受限环境中设置 `appearance`、`identity` 和两个记录动作的白名单回调；内建函数集合为空，代码不能取得 Pyodide、JS、文件系统或浏览器对象。Worker 返回结构化语义事件而不是通关布尔值。

每次对照运行使用可终止的 Worker。运行前验证、runtime load、实际执行分别有稳定状态；超时、load error、worker error 和迟到消息必须终止并忽略，不得重复发布结果或完成。虽然本关普通 UI 不允许循环，底层 runner 仍必须用直接测试证明无限循环会被确定性终止。

Worker 或网络基础设施失败不算孩子的学习失败，不增加概念失败或正式尝试；页面保留草稿并提供局部重试。语法、安全或损坏输入被明确拒绝，原始代码保留，不得静默改写。

## Progress revision 8、session 与正式证明

Progress V3 从 `schemaRevision: 7` 升到 `schemaRevision: 8`。新增 W4-M1 专用 session，至少保存：

- versioned Blockly workspace；
- 完整 Python code 和允许编辑的稳定 source span；
- 最近 Blockly trace、Python trace 与双轨 run；
- 最近差异快照与火眼金睛审计；
- `totalRuns`、`semanticMismatchFailures`、`validationFailures`、`runnerInfrastructureFailures`；
- 已使用提示层级、困难概念计数；
- `lastRunAt` 与 `savedAt`。

计数口径固定：

- 只有代码通过安全验证并真正开始处理公开卡才增加 `totalRuns`；
- 双轨首个语义差异增加 `semanticMismatchFailures`；
- 明确运行时被语法、安全或损坏合同拒绝增加 `validationFailures`；
- runtime/Worker/load/timeout 基础设施问题单独记录为 `runnerInfrastructureFailures`，不计为孩子概念失败或 mission attempt；
- 同一观察快照和同一提示层级只审计一次。

W4-M1 正式完成证明继续使用 Progress V3 的 `kind: "formal-v3"`，并绑定：

- 当前保存 Blockly workspace；
- 当前保存 Python code；
- 两条 canonical trace；
- 完整成功 run；
- 对应作品 ID；
- `completedAt` 与 `verifiedAt`。

Progress 导入和迁移保持同步：解析器必须从保存 workspace 重新编译 Blockly，并使用小型、严格、无外部副作用的 allowlist grammar 从保存 code 重新派生字段、source span 和两张卡的 canonical Python trace，再逐字段比较 run、作品与证明。allowlist grammar 只接受本关固定四行结构和 `appearance | identity` 两个字段，不使用关键词黑名单、stdout 或隐藏结果数组。玩家实际运行时，Worker 内的 Python `ast` 白名单会独立验证并真实执行同一代码；Worker trace 必须与同步 grammar 派生的 trace 完全一致。导入不启动网络或异步 runtime，也不因离线而丢失合法进度。伪造 code、source span、trace、run、work、时间、unlock 或 proof 均拒绝。

## 第一份 Python 对照作品

revision 8 在 Progress V3 中增加可复用的 versioned `works` 集合。W4-M1 成功时原子保存一份 `blockly-python-mapping-v1` 作品，至少包含：

- 稳定 `workId`、`missionId` 和标题；
- 完成时的 Blockly workspace；
- 完成时的真实 Python code；
- 两条 canonical trace 与成功 run；
- `createdAt` 与 `verifiedAt`。

作品不是截图、装饰卡或独立答案源。导入时必须像 completion proof 一样从 Blockly draft 重新编译，并从 Python code 通过同步 allowlist grammar 重新派生 canonical trace；作品与证明不一致时整份导入失败。后续在真实关卡回放时仍由受限 Worker 再次执行并比对，不能用导入验证代替真实运行。W4-M2 可以只读打开该作品作为复习材料，但不能复制、运行、改写或自动填入 W4-M2，也不能完成后续任务。

## 前置、迁移与历史兼容

新玩家进入 W4-M1 必须持有 W3-M5 `formal-v3`，bare completion、W3-M5 `legacy-replay-only` 或伪造 unlock 不能建立新的正式前置。

revision 1～7 继续严格解析和迁移：

- 历史存档没有 W4-M1 完成时，不自动生成 session、code、trace、run、work 或 proof；首次正式进入后才创建并保存默认 session。
- 历史存档已经完成 W4-M1 时，生成精确来源版本的 W4-M1 `legacy-replay-only` 记录，只保留历史完成与既有后续访问；不得伪造正式输入或证明。
- 历史用户已有的 W4-M2 及后续访问通过明确兼容规则保留，但历史 W4-M1 不计入第四周正式掌握。
- 历史玩家在新的正式双轨玩法中完整重玩成功后，可把 W4-M1 evidence 原子升级为 `formal-v3`，保留原 `completedAt`，新增 `verifiedAt`、session、works、trace 与 run。
- revision 8 parser 使用 exact keys，拒绝未知 session、work、evidence 字段和不规范时间、数字、代码、图或引用。

## 保存优先、并发与恢复

Experience 的发布顺序固定为：

1. Blockly 与 Python 草稿原子保存；
2. runner 只读取刚刚确认保存的同一 revision；
3. 失败或成功 run 保存；
4. 火眼金睛审计保存后展示；
5. 成功 run、正式证明和第一份作品原子保存；
6. 完成保存成功后播放成功结果、显示成功对话框并解锁 W4-M2。

草稿、运行、观察、作品或完成任一写入失败都必须 fail closed，显示对应本地重试入口。在重试成功前，不得发布正式回放、观察、作品、完成或解锁。双击运行、快速切换字段、延迟 Worker、迟到素材回调和过期保存结果不得重复运行、完成或覆盖新代码。

跨标签写入继续使用 revision CAS。冲突时提供当前 Blockly/Python 备份与显式载入外部进度，不得静默覆盖。损坏 current 先保留原始内容供下载，再恢复最后合法 snapshot。刷新、重开、导出导入和恢复后，必须恢复同一 Blockly、Python、作品和可重新验证的轨迹，而不只是恢复画面。

## 跨系统与家长报告

正式 W4-M1 完成后：

1. 持久解锁 W4-M2；刷新、重开、导出导入和合法恢复后保持一致；
2. W4-M2 可以只读查看 W4-M1 的对照作品，但不得用它自动完成新关；
3. 家长报告新增 W4-M1 摘要：总运行、映射差异、安全拒绝、基础设施失败、首次困难概念、火眼金睛使用、作品保存、正式/历史状态和完成时间。

家长报告不显示完整 Python、正确字段、Blockly 原始 ID、完整 trace 或可照抄答案。基础设施失败必须与学习失败分开呈现，不能把网络或 runtime 问题归咎于孩子。

## UI、无障碍与局部恢复

桌面 1440 宽度使用故事舞台与编程工作区两列，工作区内部再显示 Blockly/Python 双栏。平板和手机依次纵向排列“舞台 → 当前证据卡 → Blockly → Python → 对照结果”，不得横向滚动。

交互要求：

- 只有一个主按钮“对照运行”，每次从第一张卡开始；
- 字段选择可由鼠标、真实触控、键盘和屏幕阅读器完成；
- `Enter` 与 `Space` 操作同一 CodeMirror 文本；
- 失败反馈移动焦点到可理解的状态区，并分别提供聚焦问题 Blockly 块与 Python 行的按钮；
- 不只依靠颜色、动画或连线表达差异；
- focus、对比度、静音、减少动态效果和窄屏可读性延续前三周标准。

Blockly、CodeMirror、Python Worker、场景、背景、状态图或 Experience lazy chunk 加载失败时显示局部重试；恢复前不得发布播放、结果或完成。短暂 Python runtime 未就绪不应阻塞孩子阅读故事或查看代码。

## 正式素材与 provenance

当前项目没有第四周正式素材，禁止把前三周场景硬套到白虎岭，也禁止以占位图、emoji、CSS/div art、手写 SVG 或代码画布代替正式插画。

W4-M1 只新增两张正式 WebP：

1. 白虎岭入口背景：明亮 3D 中国儿童绘本方向，无攻击、尸体、骷髅、恐怖变化或受伤画面；
2. 双轨映射三态图：1536×512 横向三格 sprite，按左、中、右三个精确 512×512 单元依次表现 `等待对照`、`发现差异`、`映射一致`；不展示女子、老妇、老翁三次具体化身。

两张素材在实施阶段使用环境内建图像生成能力制作。每张必须在 manifest 记录稳定路径、用途、工具、完整提示词、尺寸、license/provenance、实际页面槽位、hash 与 QA 状态。只有 provenance 已核验并在 320、390、768、1440 原尺寸截图中通过裁切、清晰度、角色一致性和可读性检查，才可标记 `visual-qa-passed` 并进入构建。

证据卡、代码标记和对应连线是功能性 UI。界面图标使用项目现有 Phosphor Icons，并记录包版本、图标名和许可证；图标不得替代故事插画。

## 实施前支持矩阵与性能预算

在第一项生产代码前用 RED contract 固定：

- desktop Chromium 1440×1024；
- tablet WebKit 768×1024；
- mobile Chromium 390×844；
- desktop Firefox 1440×1024；
- narrow Chromium 320×844；
- 鼠标、键盘和真实触控；
- focus、对比度、reduced motion、mute、无横向溢出和局部资源恢复；
- W4-M1 本地 lazy cold closure 上限 `3 * 1024 * 1024` bytes；
- 单张 raster 上限 `512 * 1024` bytes；
- 单任务媒体总量上限 `1.25 * 1024 * 1024` bytes；
- Python 冷启动网络传输上限 `15 * 1024 * 1024` bytes；
- 在 10 Mbps 网络和 4× CPU 限速下，冷启动最长 20 秒，期间必须有可访问的真实进度、取消和重试；
- runtime 预热后的单次双卡运行不超过 1 秒；
- entry、homepage、共享入口、Phaser、W1～W3 既有预算不得提高。

预算不能为了实现通过而事后上调。若现有 Pyodide 路径无法满足安全、传输或时延预算，实施必须停止并重新进行产品/运行时选择，不得用放宽门禁冒充完成。

## 可执行验收标准

### 课程与源码合同

1. W4-M1 进入 `formalCourse`、formal outline、executable registry 和专用 lazy route；W4-M2～M5 保持 legacy。
2. W4-M1 不含 `expectedSequence`、`expectedOutput`，不进入 `LegacyMissionBuilder`、`MissionTools` 或 legacy PythonEditor 通关路径。
3. 源码合同拒绝隐藏答案数组、stdout 固定比较、直接 storage 完成、`eval`/`new Function`、React 成功状态和测试注入。

### 双轨执行与安全

1. 默认 Blockly 对第一张卡进入“继续核验”，默认 Python 进入“礼貌放行”，首个差异稳定且定位真实块与代码行。
2. 修改为 `identity` 后，两张卡的字段、值、真假、分支、动作与场景状态逐字段一致，最终状态精确为 `mapping-proven`。
3. 只通过一张卡、调换卡、伪造 output、改动画、移动 Blockly、注入 trace/run 或直接写完成不能通过。
4. Blockly 编译覆盖断线、多根、空图、未知块、非法连接、非互惠连接、错误 parent/branch ownership、环与伪造 ID。
5. Python 覆盖 syntax error、import、文件、浏览器/网络访问、attribute/subscript、动态执行、双下划线、未知名称/常量/调用、无限循环、runtime load failure、worker error、timeout 和迟到消息。

### 保存、迁移与跨系统

1. revision 1～7 严格迁移；旧 W4-M1 完成生成 `legacy-replay-only`，不伪造 session/code/trace/run/work/proof；正式重玩可以升级。
2. 新玩家必须持有 W3-M5 `formal-v3`；历史访问单独兼容，不等于正式前置。
3. draft、run、observation、work、completion 五类保存故障全部 fail closed，并有精确可见重试。
4. 刷新、重开、导出导入、malformed import、CAS 冲突、损坏原文下载、snapshot 恢复、双击运行和过期回调都有测试。
5. 作品和 formal proof 必须绑定当前成功 session 并可重新验证；W4-M2 只读打开，不能自动填入或完成。
6. 家长报告只显示摘要，区分学习失败与基础设施失败，不泄露代码答案。

### 素材、包体与真实浏览器

1. exact asset inventory、manifest、hash、尺寸、alpha、实际引用、原尺寸 visual QA、3 MiB lazy closure、15 MiB runtime 传输、20 秒冷启动、1 秒预热运行和 1.25 MiB 媒体预算全部有新鲜证据。
2. 五项目浏览器使用孩子可见操作完成：

```text
默认对照失败
→ 保存差异
→ 火眼金睛且双轨输入不变
→ 修改真实 Python 字段
→ 两张卡一致
→ 保存作品与正式证明
→ 刷新重播
→ 导出导入恢复
→ 家长摘要
→ W4-M2 解锁
```

3. 浏览器矩阵同时覆盖键盘、真实触控、320/390/768/1440、Chromium/WebKit/Firefox、五类保存故障、CAS、损坏恢复、runtime/asset/lazy failure、404、page health、mute 和 reduced motion。
4. W1～W3 的正式课程、Progress revision 7 迁移、家长/保存路径、现有包体和统一关键回归不得退化。全站 E2E 另行新鲜运行并如实分类失败，shared/W1 遗留不能被 W4-M1 局部绿灯掩盖。

## Completion matrix 与声明边界

W4-M1 直接涉及 `Course / 30 levels`、`Blockly`、`Python`、`Parent / saves` 和 `UI / release`。实施验收必须逐格记录本关证据与缺口；单关浏览器闭环只支持 `One-level playable`，不自动满足任何周级 `System loop complete`。

没有 public deployment 授权与证据时，`UI / release` 的公开部署单元格继续缺失。W4-M2～M5 仍为 legacy，因此第四周、30 关、全站和商业完成都必须报告 `not complete`。

## 规格自检

- 没有 `TBD`、`TODO`、占位要求或未选方案。
- 核心玩法、两张卡、默认差异、正确修正、Blockly/Python trace 和最终状态互相一致。
- W4-M1 只使用第二十七回通用引子，没有提前消费三次具体变化，也没有增加第二十八回。
- 受限 Python 仍在真实 Worker 执行；同步 allowlist grammar 只负责离线导入防伪，Worker 的 Python AST 白名单、结构化结果和超时职责分离，没有用输出比较或模拟数组替代 Python。
- Progress revision 8、历史 marker、正式重玩、作品、保存顺序、家长报告和 W4-M2 解锁互相一致，不伪造历史证明。
- 视觉、素材、儿童安全、输入、浏览器、保存故障、恢复、包体、runtime 与完成声明均有明确门禁。
