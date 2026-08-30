# W3-M5 第三周总试炼单图故事状态机设计规格

## 目标、范围与完成边界

将 `w3-m5 高老庄总试炼` 从 legacy `expectedSequence`、`LegacyMissionBuilder` 与 `MissionTools` 兼容路径升级为一关由真实可见 Blockly 图驱动的综合条件 Boss。用户已批准的核心玩法是 **单图故事状态机**：孩子在同一张连接图中修复四个互相依赖的条件与分支错误，让公开的第十八至十九回证据流从“庄口求助”逐步推进到“八戒归队”。

本任务预选且最高允许报告的单关等级是 W3-M5 `One-level playable`。只有 W3-M1～M5 在同一当前 HEAD 上取得统一的新鲜浏览器、保存恢复、家长报告、迁移和 completion matrix 证据，才可审计第三周是否达到 `System loop complete`。现行 completion matrix 的 `UI / release` 行要求公开部署后的响应式和保存恢复；在没有 deploy 授权与证据时，该单元格保持缺失，因此第三周正式 `System loop complete` 仍必须报告 `not complete`，即使本地五关统一矩阵全绿。

30 关 `Full-content verified`、全站闭环、`Commercial production complete` 和 public deployment 均不在本设计的完成范围内。未经用户再次明确确认，不安装依赖，不 commit、push、创建 PR、merge、deploy、删除、覆盖、重置或执行其他破坏性及对外操作。

本规格在用户批准方案 A 后进入详细设计阶段。只有本文完整、无歧义且经用户复核后，才达到 `Design complete`；生产实现、素材、测试与浏览器证据此时均仍为 `not complete`。

## 原著依据与叙事边界

原著依据为：

- [《西游记》第十八回](https://zh.wikisource.org/zh-hans/西游记/第018回)：高才说明高太公请法师降妖，悟空应承；悟空变作翠兰探问来历；猪刚鬣显露身份和云栈洞住处，随后逃走，悟空追赶。
- [《西游记》第十九回](https://zh.wikisource.org/zh-hans/西游记/第019回)：云栈洞交锋后，猪刚鬣听明悟空保护唐僧西行取经，说明自己受观音劝善、持戒等待取经人；到高老庄拜见唐僧，说明法名悟能，唐僧另起别名八戒，最终八戒挑担随师徒西行。

W3-M1～M4 的既有正式边界保持不变：

1. W3-M1 止于听清高才明确求助并进入高老庄。
2. W3-M2 止于悟空的翠兰伪装被正确判断、显出本相，猪刚鬣逃走。
3. W3-M3 止于猪刚鬣听清西行取经使命，放下钉耙并说明受观音点化；不进入拜师或获名八戒。
4. W3-M4 止于猪刚鬣说明观音此前已授戒、法名悟能，唐僧另名八戒，八戒挑担随师徒西行。

W3-M5 是对这些条件判断的综合复盘，不让孩子重新排列故事，不把交锋、命名、惩罚或攻击变成儿童指令，也不改变上述原著先后。成功场景可固定回放第十八至十九回的准确摘要，但场景回放不能决定成功。

## 已批准的单图故事状态机

### 一张图、一个运行入口、一个状态令牌

首次进入显示一张持久、可编辑、真实连接的 Blockly 图。整张图只有一个根入口“运行第三周总试炼”，并公开显示当前故事阶段：

1. `manor-request`：庄口求助；
2. `cuilan-disguise`：后宅伪装；
3. `yunzhan-dialogue`：云栈洞对话；
4. `bajie-joining`：归队核验；
5. `week-three-recap-complete`：整套试炼成功。

状态令牌由当前图实际执行的动作推进，不能由 React 状态、课程配置、场景动画、积木坐标、测试注入或隐藏数组推进。练习卡只检验当前阶段的判断，不改变故事状态。只有原著卡走入正确分支并执行正确动作，才推进到下一阶段。

孩子每次只能点击同一个“运行整套试炼”入口，从第一张公开卡重新执行。不得提供按阶段运行、跳过已修复阶段、直接载入正确前缀或分段完成按钮。系统可以在成功保存过的前缀上用视觉标记说明“这些判断本次已通过”，但仍需从头重放和重新验证；标记不能替代执行。

### 四个相互依赖的默认错误

默认图结构有效、可以编译，但包含四个真实课程错误。runner 只报告第一个阻塞错误，孩子修复并重新运行后，才会遇到下一个错误。

#### 错误一：求助条件过宽

默认使用 `口信提到了高老庄`。在明确标记的练习问路卡上，它错误进入“应承降妖”分支。孩子必须把真实条件块替换为 `口信明确请求降妖帮助`。

正确行为：

- `practice-manor-directions`：提到高老庄但没有求助，false → `继续问路`，状态保持 `manor-request`；
- `canon-gaocai-help`：高才明确请法师降妖，true → `应承并进入庄中调查`，状态推进到 `cuilan-disguise`。

#### 错误二：把外形当成真实身份

后宅伪装阶段有两道顺序闸门。第一道正确使用 `外形与高翠兰相同`，true 后维持伪装并继续询问；第二道默认仍错误使用同一个外形条件，因此错误地继续伪装。孩子必须把第二道真实条件块替换为 `真实身份是高翠兰`。

正确行为：第二道为 false，进入 `显出悟空本相并追向云栈洞`，状态推进到 `yunzhan-dialogue`。`猪刚鬣逃往云栈洞` 是 runner 从正确动作派生的固定原著结果，不是儿童 opcode。

#### 错误三：对话分支动作接反

云栈洞阶段固定使用公开条件 `当前话语明确说明唐僧正在西行取经`，但默认把两枚真实动作块接反：THEN 为 `守洞`，ELSE 为 `说明受观音点化`。孩子必须在同一 Blockly workspace 中交换这两枚动作的真实分支连接。

正确行为：

- `canon-wukong-name-only`：只识得悟空身份，false/ELSE → `守洞`，状态保持 `yunzhan-dialogue`；
- `canon-pilgrimage-explicit`：明确说明保护唐僧西行取经，true/THEN → `放下钉耙并说明受观音点化`，状态推进到 `bajie-joining`。

#### 错误四：归队条件使用 OR

归队阶段公开显示两个原子条件：`已蒙观音劝善受戒` 与 `明确愿随唐僧西去`。默认组合运算符为 `OR`，孩子必须把同一个可见字段改为 `AND`。

同一组合图按以下公开卡运行：

| 情境 | 卡片性质 | 已受戒 | 愿西去 | 正确结果 |
| --- | --- | ---: | ---: | --- |
| `practice-precepts-only` | 逻辑练习，不改变原著 | true | false | 继续核对 |
| `practice-willing-only` | 逻辑练习，不改变原著 | false | true | 继续核对 |
| `canon-bajie-ready` | 原著归队情境 | true | true | 正式归队 |

两张练习卡必须在故事舞台和文字中明确标为“逻辑练习，不改变原著故事”。只有原著卡走入 `正式归队`，才推进到 `week-three-recap-complete`。随后场景固定呈现“观音此前授戒并起法名悟能 → 唐僧另名八戒 → 八戒挑担随师徒西行”；这些结果不是可排序的 Blockly 指令。

### 为什么不是四个小关或 expectedSequence 换皮

- 四段逻辑位于同一张可见连接图、同一个持久 workspace、同一次从头执行的 canonical trace 中。
- 每一段的正确原著动作都会改变同一个公开故事状态；前段没有正确推进，后段即使局部连接正确也不能完成。
- runner 供应固定、公开的证据卡和初始状态，不供应正确条件、分支、运算符或动作路线。
- 孩子不排列 `hear_report → transform → chase → learn_origin → join_team`，也不从课程配置选择动作；成功只来自真实条件求值、实际分支连接与状态转移。
- 单独通过任何阶段、静态拥有正确块、移动坐标或伪造动画状态都不能完成。

## Blockly 合同与唯一事实源

唯一事实链固定为：

`visible Blockly workspace → versioned serialized draft → compiler → workspace-bound canonical trace → deterministic state-machine runner`

建议使用独立的 `WeekThreeBoss*` 合同，不泛化或改写 W3-M1～M4 的已验收实现。最小块集合包括：

- 根块和四个阶段容器；
- 求助阶段的两个候选条件和两枚分支动作；
- 伪装阶段的外形、真实身份条件与两道顺序闸门；
- 云栈洞的固定西行使命条件及两枚可交换动作；
- 归队阶段的两个原子条件、AND/OR 组合块和两枚分支动作；
- 公开状态推进动作，且每个动作只允许出现在规定阶段和分支。

版本化 draft 至少保存稳定 `blockId`、`type`、字段值、输入连接、`previousId/nextId`、`parentBlockId`、容器归属和有限显示坐标。连接必须互惠；坐标只用于恢复画面，永不参与语义或成功判定。

每条 canonical instruction 至少保存：

- `instructionId`、`sourceBlockId`、`parentBlockId`；
- `stageId`、`scenarioId`；
- 条件来源、种类、公开标签、真值和证据代码；
- 组合运算符、原子真值与组合值（如适用）；
- 实际进入的分支、实际动作和状态转移前后值。

编译器必须拒绝空图、多根、断线、缺输入、未知块或字段、未知运算符、孤立块、重复必需块、共享条件块、跨阶段或跨容器连接、非互惠连接、错误 parent/branch ownership、环、非法动作位置、遗漏阶段、无限/非法坐标和伪造 trace。结构错误是 compile failure，不是有效运行，不产生运行失败快照，也不开放火眼金睛。

## 确定性运行、诊断与零惩罚

runner 总是从 `manor-request` 和第一张公开卡开始，并从当前保存 workspace 重新编译。默认图的确定性阻塞顺序为：

1. 练习问路卡暴露求助条件过宽；
2. 修复后，后宅第二闸暴露外形与真实身份混淆；
3. 再修复后，云栈洞第一轮暴露分支动作接反；
4. 再修复后，归队第一张单条件练习卡暴露 OR 过宽；
5. 四处全部修复后，整套公开证据流一次完成。

运行只报告第一个阻塞错误并聚焦真实来源块。儿童反馈可以说明本次公开事实、条件得到的真/假、实际分支、实际动作和状态没有按预期推进，但不得说出应选条件、应交换的动作、正确运算符、完整图或下一步答案。

结构错误不算运行；有效运行失败保存不可变快照。所有失败严格为零惩罚：生命、资源、星级、装备、既有任务完成和前置证明均不减少。相同 workspace 与相同证据流必须产生相同 trace、失败顺序和结果。

编辑 workspace 后，当前 trace、run、scenario results、failure snapshot 和成功候选立即失效；累计运行、编译失败、各概念失败和合法观察审计保留。

## 火眼金睛边界

火眼金睛只在有效失败及其快照成功保存后，由孩子主动点击开放。结构错误、保存失败、过期快照和未稳定解锁的能力均不开放。

观察只显示当前已运行事实：

- 当前阶段与公开证据卡；
- 实际检查的条件及真/假；
- 当前可见运算符和组合结果（如适用）；
- 实际分支、实际动作与状态是否推进。

观察不得显示正确条件、正确运算符、正确分支连接、答案图、完整 trace 或下一步；不得修改、移动、替换、运行或完成图。观察审计必须保存成功后才展示；同一未失效 snapshot 重复查看只记录一次。除观察审计字段外，观察前后的 workspace、trace、run、missions、stars、resources 和 completion evidence 必须深相等。

## 保存优先状态机、Progress revision 7 与迁移

Experience 的保存顺序固定为：

`save draft → compile/run immutable snapshot → save run/failure → optional save observation → load scene assets → visible playback → save completion/formal proof → publish completion`

草稿、运行、观察或完成任一写入失败都必须 fail closed，并显示对应本地重试入口。未保存的图、运行、观察或成功不能播放、完成、生成证明或解锁后续内容。双击运行、延迟资源回调和过期保存结果不得重复完成或覆盖新图。

Progress V3 从 `schemaRevision: 6` 升到 `schemaRevision: 7`，新增专用 W3-M5 session、parser 和 completion evidence。正式证据为当前保存 workspace 重新编译、从头重放成功所得的 `formal-v3`，并要求已有 W3-M4 `formal-v3` 前置。

迁移规则：

- revision 1～6 均有严格解析与显式迁移；未知 revision、额外 key、非法时间、非法计数或互相矛盾的 session/evidence fail closed。
- 所有旧 W3-M5 completion 只迁移为或保留 `legacy-replay-only`，包括 revision 6 中在正式 W3-M4 之后通过 legacy 工具完成但尚无 marker 的记录；不得生成 W3-M5 workspace、trace、run、session 或 formal proof。
- `legacy-replay-only` 保留历史重玩和既有 W4 访问，不计入第三周正式系统证据。
- 历史用户在新正式 Blockly 图中完整重玩成功后，可以把 W3-M5 evidence 原子升级为 `formal-v3`，保留原 `completedAt`，写入新的 `verifiedAt`、workspace、trace 和 run。
- 新玩家进入 W3-M5 必须持有 W3-M4 `formal-v3`；bare completion、W3-M4 `legacy-preformal` 或 W3-M5 历史 marker 不能伪造新的正式前置。
- W4-M1 对新玩家只由 W3-M5 `formal-v3` 解锁；历史用户的已完成内容与兼容访问不得因迁移丢失，但必须在 UI 和家长报告中明确显示历史/正式状态。

导入、刷新、重开和 snapshot 恢复必须恢复同一张可执行图，而不只是积木外观。导入解析器从 draft 重新编译并从头重放，逐字段比较 trace、scenario results、状态转移、失败快照、观察审计和 formal proof；伪造 operator、condition、branch、action、state、trace、run、unlock 或完成均拒绝。

跨标签写入继续使用 revision CAS。冲突时提供当前图备份与显式载入外部进度；不得静默覆盖。损坏 current 先保留原始内容供下载，再恢复最后合法 snapshot。

## 跨关与家长可见效果

W3-M5 正式成功必须产生两个真实跨系统效果，不新增货币或装饰奖励：

1. W3-M5 `formal-v3` 持久解锁 W4-M1 入口；刷新、重开、导出导入和损坏恢复后仍保持一致。
2. 第三周家长报告新增 Boss 综合摘要：整套运行次数、四类概念错误次数、首次阻塞概念、成功整套运行、火眼金睛使用次数、正式/历史证明和完成时间。

家长报告不显示 raw block ID、完整 trace、练习卡答案、正确连接图或可供孩子照抄的步骤。第三周“正式掌握”必须从 W3-M1～M5 当前可验证 formal proofs 与 sessions 派生，不新增可独立伪造的装饰性 mastery flag。

## UI、无障碍与正式素材

页面延续明亮 3D 中国儿童绘本方向。桌面端显示故事舞台、公开证据卡、单一 Blockly workspace 和运行反馈；窄屏按故事舞台、当前证据、Blockly、反馈纵向排列。不得把四阶段拆成四张独立程序图。

单一 workspace 可以提供只负责平移/聚焦的阶段导航，用于找到当前阶段或失败来源；它不修改图、不跳过执行、不显示正确状态。320/390 宽度下使用纵向阶段布局和安全缩放，所有课程性字段与连接必须可通过真实触控和键盘完成。鼠标、触控、Enter/Space 必须操作同一个 Blockly 实体。

计划中的 shipping 素材为：

- `public/assets/week-three-boss/week-three-boss-background.webp`：明亮 3D 中国儿童绘本风格的高老庄至云栈洞再到西行路径全景舞台；无文字、伪字、攻击命中、捆绑、揪耳、成人婚姻或羞辱画面。
- `public/assets/week-three-boss/week-three-boss-states.webp`：透明状态图，表现高才求助、悟空调查、云栈洞对话、八戒挑担西行等非暴力状态。

素材只能由环境内建图像生成/编辑工具生成，或使用 provenance 已核验的项目来源。不得以 emoji、CSS/div 绘图、手写 SVG、代码画布或占位图代替。每项素材必须在 manifest 中记录用途、工具、完整 prompt/source、尺寸、字节、SHA-256、许可/provenance、实际 slot 与原尺寸 visual QA；只有 `visual-qa-passed` 才能进入单关完成证据。

Scene 只消费 runtime events，不读取隐藏答案或决定成功。背景、状态图、Scene chunk、Workspace chunk 或 Experience chunk 加载失败均显示局部重试；恢复前不能发布播放或完成。mute 与 reduced motion 只改变声音、转场和动画强度，不改变证据、trace、状态转移、保存或完成语义。

## 实施前支持矩阵与预算门禁

在第一项生产代码前用失败合同锁定：

- desktop Chromium 1440×1024；
- tablet WebKit 768×1024；
- mobile Chromium 390×844；
- desktop Firefox 1440×1024；
- narrow Chromium 320×844；
- 鼠标、键盘与真实触控；
- focus、对比度、reduced motion、mute、无横向溢出和局部资源恢复；
- W3-M5 lazy cold closure 上限 `3 * 1024 * 1024` bytes；
- 单张 raster 上限 `512 * 1024` bytes；
- 单任务媒体总量上限 `1.25 * 1024 * 1024` bytes；
- entry、homepage、Phaser、W1/W2 与 W3-M1～M4 既有预算不得提高。

预算必须在实现前由 RED contract 固定，不能为了 W3-M5 事后上调。

## 可执行验收标准

1. **课程与路由：** W3-M5 进入 formal course、executable registry 和专用 lazy route；不含 `expectedSequence`，不进入 `LegacyMissionBuilder` 或 `MissionTools`。W4 及其他 legacy 关卡不被意外正式化。
2. **默认阻塞链：** 测试逐步修复四处错误，精确证明每次只暴露下一个真实阻塞；只修局部、移动坐标或注入完成不能通过。
3. **Blockly/编译器：** 真实 workspace 操作改变 condition、连接和 operator 后必须改变 canonical trace；删除、断线、跨阶段连接、非法形状、环、重复块、未知块、错误 ownership、非互惠连接、伪造 trace 和非法坐标均给出可定位结构诊断。
4. **runner：** 全部公开卡从同一图和初始状态运行；练习卡不推进故事，原著卡只通过正确动作推进；最终状态精确为 `week-three-recap-complete`；所有失败零惩罚并可确定性重放。
5. **火眼金睛：** 只在已保存有效失败后开放；显示当前事实而不泄题；图不变、编辑后失效、同 snapshot 只审计一次；观察前后除审计字段外深相等。
6. **Progress revision 7：** 覆盖 revision 1～6、revision 6 无 marker 的当前 legacy 完成、`legacy-replay-only` 保留、正式重玩升级、exact keys、W3-M4 formal 前置、W4 解锁、伪造 session/trace/run/proof/unlock 拒绝。
7. **保存与恢复：** draft/run/observation/completion 四类故障均 fail closed、精确重试；覆盖刷新、重开、CAS、损坏原文保留、合法 snapshot、导出导入、malformed import、双击运行和过期资源回调。
8. **家长与跨关：** W4-M1 只由合规正式证明或明确历史兼容路径开放；家长报告显示综合学习摘要而不泄露答案；clear、导出导入和恢复后结果一致。
9. **素材与包体：** exact inventory、manifest、hash、尺寸、alpha、场景引用、原尺寸 visual QA、3 MiB lazy closure、1.25 MiB 媒体预算和既有预算不回退均有新鲜证据。
10. **W3-M5 五项目浏览器：** 通过孩子可见操作完成“默认第一错误 → 保存失败快照 → 火眼金睛且图不变 → 修复 → 依次发现并修复其余三错 → 整套成功 → 固定原著回放 → 持久化 → 刷新重播 → 导出导入 → 家长摘要 → W4-M1 解锁”，并覆盖键盘、触控、320/390/768/1440、Chromium/WebKit/Firefox、四类保存故障、CAS、损坏、cold、asset/lazy failure、404、page health、mute/reduced motion。
11. **第三周统一审计：** 在同一当前 HEAD 上运行 W3-M1～M5 统一五项目矩阵和相关 unit/source/typecheck/build/bundle/assets；逐格审计 Course、Blockly、Parent/saves、UI/release。历史数字不得冒充新鲜运行。
12. **全站审计与声明边界：** 新鲜运行全站 E2E 并逐项披露失败。W3-M5 专项通过最高只支持单关 `One-level playable`；任一 relevant completion-matrix 单元格缺失，第三周 `System loop complete: not complete`。30 关、全站、商业完成和部署继续为 `not complete`。

## 规格自检

- 没有 `TBD`、`TODO`、占位产品选择或未定义成功条件。
- 四个默认错误、公开证据卡、状态推进和阻塞顺序互相一致；练习卡不改变原著状态。
- 孩子只修真实条件、连接和运算符，不排列故事、编写攻击或操作隐藏状态。
- 唯一事实链、保存优先、formal proof、迁移、防伪、家长报告、W4 解锁和 Scene 职责分离，没有第二答案源。
- revision 7 同时覆盖旧 `legacy-replay-only`、revision 6 无 marker 的 legacy 完成和正式重玩升级，不伪造历史 session 或 proof。
- 视觉、资产、预算、输入、浏览器、故障、恢复和 completion matrix 均有实施前门禁。
- 当前仅是经用户批准核心方向后写成的设计规格；在用户复核本文前，`Design complete` 仍为 `not complete`，生产实现也未开始。
