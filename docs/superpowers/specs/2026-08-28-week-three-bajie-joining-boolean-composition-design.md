# W3-M4 八戒归队多条件组合设计规格

## 目标、范围与完成边界

将 `w3-m4 八戒归队` 从 legacy `expectedSequence`、`LegacyMissionBuilder` 与 `MissionTools` 兼容路径升级为一关由真实可见 Blockly 图驱动的多条件组合任务。已批准玩法是 **双证据 AND 调试**：孩子必须把默认错误的 `OR` 运算改为 `AND`，让同一张程序图正确处理一张原著陈述卡和两张明确标注的逻辑练习卡。

本任务预选且最高允许报告的等级是单关 `One-level playable`。W3-M5 保持 legacy；第三周 `System loop complete`、全站 `Full-content verified`、`Commercial production complete` 与公开部署均为 `not complete`。任一真实浏览器、持久化、失败恢复、正式素材或预算门禁缺失时，W3-M4 必须报告为 `not complete`。

本规格在玩法、失败与帮助、存档、历史兼容、UI、素材和验收四个部分获得用户逐项确认后达到 **Design complete**。这不代表生产实现已经开始或单关已经可玩。未经用户再次明确授权，不执行 commit、push、PR、merge 或 deploy。

## 原著依据与叙事边界

原著依据为 [《西游记》第十九回](https://zh.wikisource.org/zh-hans/西游记/第019回)。W3-M4 从猪刚鬣在高家拜见唐僧开始，到八戒挑担、师徒三众“投西而去”结束。

原著的准确先后是：

1. 猪刚鬣拜见唐僧并复述观音劝善之事；
2. 唐僧礼谢观音，悟空为猪刚鬣松绑；
3. 猪刚鬣重新礼拜，明确愿随唐僧西去，并拜悟空为师兄；
4. 猪刚鬣说明观音此前已经为他摩顶受戒并起法名“悟能”；
5. 唐僧根据他持斋不食五荤三厌，另起别名“八戒”；
6. 八戒挑担，三众辞别高家向西而行。

现有 legacy 文案“唐僧为他摩顶受戒”与原著不符。正式课程必须改为“观音此前已授戒、法名悟能；唐僧后来另名八戒”，不得沿用错误因果。

W3-M3 已止于云栈洞对话中猪刚鬣放下钉耙、说明受观音点化的来历。W3-M4 不重复交锋、放下钉耙或烧洞，也不提前消费 W3-M5 对第十八至十九回完整条件链的复盘范围。

儿童画面不表现捆绑、揪耳、攻击、成人婚姻或羞辱细节。孩子编写的是“多个必要条件要同时成立”的判断程序，不编写拜师、受戒、命名、惩罚或攻击命令。

## 已批准的玩家可见 Blockly 玩法

首次进入显示一张持久、可编辑、真实连接的 Blockly 图。两个原子条件、真/假分支动作和程序结构都可见；孩子本关唯一需要修改的课程性错误是布尔运算符。

```text
收到当前入队陈述

如果【已蒙观音劝善受戒】 OR 【明确愿随唐僧西去】  ← 默认错误
    正式加入取经队伍
否则
    继续核对入队条件
```

孩子直接操作 Blockly 组合块的运算符字段，把 `OR` 改为 `AND`。鼠标、触控和键盘必须编辑同一个可见字段；不得提供页面外的“修复答案”、文字选择器、隐藏第二张程序或直接完成按钮。

建议的最小 Blockly 合同包含：

- 根块 `w3_bajie_receive_statement`；
- 分支容器 `w3_bajie_if_join_ready`；
- 组合块 `w3_bajie_boolean_operation`，只接受 `AND | OR`，默认 `OR`，拥有 `LEFT` 与 `RIGHT` 两个布尔输入；
- 原子故事传感器 `w3_bajie_condition_guanyin_precepts` 与 `w3_bajie_condition_willing_westward`；
- 分支动作 `w3_bajie_formally_join_team` 与 `w3_bajie_continue_verification`。

原子故事传感器首次进入时已经真实连接，可在 `LEFT` 与 `RIGHT` 输入间交换但不可从任务中删除；分支动作和顶层结构保持固定。唯一预置的课程性错误仍是组合运算符字段。导入、损坏恢复和编译器必须验证所有连接。`AND` 是可交换运算：左右输入交换后结果不变，坐标、输入顺序和积木摆放不得参与成功判定。

## 三张固定公开输入

同一张图按固定顺序处理三张公开陈述卡：

| 情境 | 卡片性质 | 已蒙观音劝善受戒 | 明确愿随唐僧西去 | 正确分支 |
| --- | --- | --- | --- | --- |
| `canon-bajie-joins` | 原著情境 | true | true | 正式归队 |
| `practice-precepts-only` | 逻辑练习，不写入原著 | true | false | 继续核对 |
| `practice-willing-only` | 逻辑练习，不写入原著 | false | true | 继续核对 |

两张练习卡必须在标题和场景中明确标记为“逻辑练习，不改变原著故事”，不得伪装成第十九回人物或事件。卡片公开说明事实，但不预先显示程序算出的布尔值或分支；这些结果只在运行时出现。

默认 `OR` 图在原著卡上得到 true 并暂时通过，在第一张练习卡上错误得到 true、进入“正式归队”，形成一次有效失败。正确 `AND` 图依次得到 `true / false / false`，三张全部走入正确分支后才算本次运行成功。

成功场景固定播放准确的原著结果：说明法名悟能、唐僧另名八戒、八戒挑担投西而去。这些是运行结果的故事呈现，不是可排序的 Blockly 指令，也不能反向决定成功。

## 唯一事实源、编译合同与 canonical trace

唯一事实链为：

`visible Blockly workspace → serialized draft → compiler → canonical trace → deterministic runner`

运行、失败反馈、观察、保存、导入、恢复和 formal proof 都必须从当前保存的可见图重新编译。课程数组、React 状态、场景动画、积木坐标、legacy `expectedSequence`、测试注入或隐藏答案都不能参与成功判定。

版本化 workspace draft 至少保存稳定 `blockId`、`type`、互惠连接、父子归属、布尔输入槽、运算符字段与安全夹紧的显示坐标。编译器为每张卡输出以下真实来源指令：

1. 收到当前陈述；
2. 检查“观音劝善受戒”传感器；
3. 检查“明确愿随西去”传感器；
4. 使用当前可见运算符计算组合结果；
5. 执行实际进入的分支动作。

每条指令保留 `instructionId`、`sourceBlockId`、`parentBlockId`、`scenarioId`、原子条件种类、公开证据代码、当前运算符、原子真值、组合结果与实际分支。交换左右输入可以改变 trace 中的可见来源次序，但不能改变 `AND` 的语义或完成结果。

编译必须拒绝空图、多根、断线、缺输入、未知运算符、未知块、孤立块、跨容器连接、非互惠连接、错误父子归属、环、重复或遗漏的必需块、伪造 trace 和无限/非法坐标。结构错误不算有效运行，不产生失败快照，也不开放火眼金睛。

## 确定性运行、失败和零惩罚

默认有效失败流程为：

1. 原著卡：`true OR true = true`，进入正式归队，当前卡通过；
2. 第一张练习卡：`true OR false = true`，错误进入正式归队；
3. 运行在当前组合块处停止，不继续把后续结果伪装成成功。

可见反馈为：“这张卡没有同时满足两个条件，程序却让它归队了。请检查两个条件的组合方式。”反馈聚焦真实组合运算块，但不出现“改成 AND”、正确图或下一步操作。

有效失败保存以下不可变快照：两个原子条件的来源和真值、当前可见运算符、组合结果、实际分支、实际动作、失败情境与真实 Blockly 来源。所有失败都严格为零生命、零资源、零星级惩罚，不清除已有完成或奖励。

编辑 workspace 后，旧 trace、运行结果和失败快照立即失效；累计运行、失败和合法观察次数保留。相同 workspace 和三张固定卡必须产生相同 trace 与结果。

## 火眼金睛边界

火眼金睛只在一次有效失败及其失败快照成功持久化后，由孩子主动点击开放。结构错误、保存失败或过期快照均不开放。

观察只显示：

- 两个原子条件本次各自的 `真/假`；
- 当前可见运算符为 `OR`；
- 本次组合结果；
- 实际进入的分支与实际动作；
- 对应公开陈述卡的文字依据。

观察不得显示正确运算符、正确表达式、答案图、下一步或完整 trace；不得替换字段、修改连接、移动焦点到答案、运行或完成任务。当前运算符可以显示，是因为它已经存在于孩子可见图中，不是隐藏答案。

观察审计必须先保存成功再展示。编辑图后旧观察快照立即失效；同一未失效快照可重复查看，但只记录一次使用。除观察审计字段外，观察前后的 workspace、运行结果、任务完成、星级和资源必须保持不变。

## 保存优先状态机、Progress 与恢复

运行请求必须绑定同一个不可变 workspace snapshot：先序列化并保存当前 draft，再从该 snapshot 编译、运行并保存结果，最后才允许场景播放。草稿、运行、观察或完成任一写入失败都 fail closed，显示明确的本地重试入口；未保存的结果不得播放、完成或解锁。

建议状态流为：

`idle → saving-draft → compiling → saving-run → playing-cards → failed | ready-for-success-scene → scene-ready → playing-success → saving-completion → completed`

正式完成前再次从当前已保存 workspace 编译并重放三张卡，逐字段核对 trace 与 run。只有三张全部正确、正式素材加载成功、可见成功播放完成且 completion 原子保存成功，才能发布 W3-M4 `formal-v3` 证明。

W3-M4 session 至少保存：

- 当前 workspace 及 fingerprint；
- 最近 canonical trace、三张卡结果和失败快照；
- 总运行、有效失败、编译失败、观察次数与时间；
- 保存 revision、CAS 信息和 `savedAt`；
- 与当前图一致的最后成功运行及 formal proof 所需数据。

刷新、重新打开、导出导入和损坏恢复必须恢复同一张可执行图，而不只是积木外观。跨标签写入沿用 CAS 与显式备份；损坏 current 先保留原始内容供下载，再恢复最后合法 snapshot。导入解析器使用 exact keys，从 workspace 重新编译、重放并拒绝伪造 operator、trace、run、failure snapshot、proof、unlock 或时间字段。

## 解锁、迁移与历史兼容

进入 W3-M4 必须同时满足 W3-M3 已完成且持有当前有效的 W3-M3 `formal-v3` proof；单独的完成 flag 或 `legacy-preformal` 不得解锁。

W3-M4 实现把 Progress V3 的 `schemaRevision` 从 5 升到 6，并继续严格解析和迁移 revision 1～5。session 白名单只新增 W3-M4 专用类型和 parser；completion evidence 新增 W3-M4 formal/legacy 证明，并允许 W3-M5 使用一个不含 workspace、trace 或 run 的 `legacy-replay-only` 标记，仅用于证明旧存档本身已有 W3-M5 完成记录。

历史兼容规则为：

- 旧版 W3-M4 完成记录保留为 `legacy-preformal`，不伪造 session、trace、run 或 formal proof；
- 旧 W3-M4 bare completion 不得新解锁 W3-M5；
- 历史存档若 W3-M5 本身已经完成，以精确来源版本的 `legacy-replay-only` 标记保留其重玩访问和原记录，避免丢失已有进度；该标记不能完成、正式化或新解锁 W3-M5；
- 当前玩家持有 W3-M4 `formal-v3` 时，可按现有 legacy W3-M5 路径完成和重玩，不生成历史 replay 标记；
- 当前 W3-M4 用正式图重新完成后，允许原子升级为 `formal-v3`；
- 新的 W3-M4 `formal-v3` proof 只开放 W3-M5 入口，不把 W3-M5 注册为正式或 executable 关卡。

家长报告和第三周摘要只显示运行次数、组合错误、观察次数、formal/legacy 状态与完成时间，不显示 raw block ID、完整 trace、练习答案或可复用答案图。

## UI、正式素材与儿童安全

页面延续 W3-M1～M3 的明亮 3D 中国儿童绘本方向。桌面端以故事舞台和 Blockly 工作区为主要区域；窄屏按故事卡、Blockly、运行反馈的顺序上下排列。三张陈述卡公开可读，Blockly 在所有目标宽度内完整可见，无横向滚动才能操作。

正式素材建议为：

- `public/assets/week-three-bajie-joining/bajie-joining-background.webp`：明亮的高老庄厅堂或庭院背景；
- `public/assets/week-three-bajie-joining/bajie-joining-states.webp`：透明状态图，表现叙说观音安排、得名八戒和挑担西行。

素材只能由环境内建图像生成/编辑工具生成，或来自 provenance 已核验的项目来源。画面禁止生成文字、伪字、捆绑、揪耳、攻击、成人婚姻暗示和羞辱姿态。CSS 只负责布局、裁切、转场与响应式，不得用 emoji、CSS/div 绘图、手写 SVG、代码画布或占位图替代正式插画。

每个素材必须在 manifest 中记录用途、工具、完整 prompt/source、尺寸、字节、哈希、许可/provenance、实际屏幕 slot 与原尺寸视觉 QA。只有 `visual-qa-passed` 素材才能进入 `One-level playable` 证据。

## 实施前兼容与预算门禁

在第一项生产实现前以失败合同锁定：

- 浏览器：desktop Chromium、tablet WebKit、mobile Chromium、desktop Firefox、narrow Chromium；
- viewport：1440、768、390、320；
- 输入：鼠标、触控、键盘；
- reduced motion、静音、焦点、可读对比度和无横向溢出；
- W3-M4 lazy cold closure 上限 `3 * 1024 * 1024` bytes；
- 单张 raster 上限 `512 * 1024` bytes；
- 单任务媒体总量上限 `1.25 * 1024 * 1024` bytes；
- 首页、共享入口、Phaser、W1/W2 与 W3-M1～M3 既有预算不得提高。

Experience、Workspace 与 Scene 应保持独立 lazy 边界。任一任务 chunk、场景资产或状态资产加载失败都显示局部重试，恢复前不能发布运行、播放或完成。mute 和 reduced motion 只改变声音与呈现强度，不改变事实、operator、trace、保存或完成语义。

## 可执行验收标准

1. **课程与 source contract：** W3-M4 正式注册、无 `expectedSequence`、不进入 legacy tools；W3-M5 保持 legacy。禁止课程答案数组、直接 storage 完成、动态执行、测试注入成功和隐藏 React 判断。
2. **Blockly/编译器：** 先写失败测试，覆盖默认 OR、正确 AND、左右交换、三张卡精确 trace，以及缺块、缺输入、未知 operator、孤立、跨容器、非互惠连接、环、重复、伪造 trace 和坐标防伪。
3. **运行时：** 默认图在第二张卡形成有效失败；正确图得到 `true / false / false` 并完成；错误条件、错误分支和只通过部分卡均失败且零惩罚。
4. **帮助：** 失败快照保存后才开放火眼金睛；仅显示原子真值、当前 operator、组合结果和实际分支；图不变、不可泄题、编辑后失效、同 snapshot 只审计一次。
5. **Progress revision 6：** 覆盖 revision 1～5 迁移、exact keys、W3-M3 formal proof 前置、legacy W3-M4 不解锁、既有 W3-M5 完成保留访问、正式 proof 重编译重放与伪造拒绝。
6. **四类写入故障：** draft、run、observation、completion 失败均 fail closed、可重试、无未保存播放；覆盖 CAS、损坏原文保留、snapshot、刷新、重开和导出导入。
7. **素材与包体：** exact inventory、manifest、hash、尺寸、alpha、场景精确引用、原尺寸 visual QA、3 MiB lazy closure 和 1.25 MiB 媒体预算全部有新鲜通过证据。
8. **五项目真实浏览器：** 使用孩子可见操作完成“默认失败 → 保存快照 → 火眼金睛且图不变 → 改为 AND → 三卡成功 → 原著结局 → 刷新重播 → 导出导入 → W3-M5 入口开放”，并覆盖键盘、窄屏、四类保存故障、CAS、损坏、parent、cold、asset fault、lazy failure、404、page health、mute/reduced motion。
9. **回归与完成矩阵：** 运行 W2-M1～M5 + W3-M1～M4 统一正式回归，再运行全站审计；历史或无关失败逐项披露，不能用专项绿灯替代全站完成。审计 Course、Blockly、Parent/saves、UI/release 相关行。
10. **声明边界：** 所有单关证据齐全后最高报告 W3-M4 `One-level playable`。W3-M5、第三周系统闭环、30 关、全站、商业生产和部署继续报告 `not complete`。

## 规格自检

- 没有 `TBD`、`TODO` 或未定义的产品选择；玩家唯一课程性修改、三张公开输入、默认错误和成功条件互相一致。
- 原著中的授戒者、法名、别名和正式同行先后已纠正；W3-M3 与 W3-M5 边界没有混入。
- visible graph、canonical trace、保存、proof、Scene 与 unlock 职责分离，没有第二答案源或 `expectedSequence` 换皮。
- 火眼金睛显示当前可见运行事实但不提供正确 operator；结构错误和有效失败边界明确。
- revision 6、legacy W3-M4、既有 W3-M5 完成访问和 formal W3-M4 解锁规则不矛盾。
- 视觉、资产、预算、输入、浏览器、故障和真实恢复都有执行门禁；没有把静态 UI 或部分测试当作可玩完成。
- 当前仅达到 **Design complete**；生产实现、素材、浏览器证据和 `One-level playable` 均为 `not complete`。
