# W4-M3 Python 分支归位验收

## 范围与现场

验收工作区：`/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`。实现起点为 `cd713bc3c4d37268ea21fa913112d1d27d2e3f71`，远端为 `https://github.com/stevenzhouz998-cyber/xiyou-programming-journey.git`。2026-09-08 用户授权完成本关后 commit and push；推送独立功能分支，不触发只监听 `codex/xiyou-programming` 的 Pages 部署。

验收截止 2026-09-09。本记录仅覆盖 W4-M3「第二次变化」单关，已达到 **One-level playable**：真实输入、执行、失败、保存、刷新、恢复、作品、家长摘要与下一关解锁均有五项目浏览器证据。W4-M4/M5、第四周 System loop complete、30 关 Full-content verified、公开部署及 Commercial production complete 仍为 **not complete**。

## 可见玩法与真实证据

孩子在 CodeMirror 中调整固定 `if` 条件下的连接词和礼貌帮助行的缩进。同样外形的原著老妇卡与采药人练习卡依次进入真实同源 Pyodide Worker。默认条件外帮助产生路线冲突；把帮助移入 if 产生原著卡冲突及练习卡无路线；未缩进的 else 主体产生结构错误。添加 else 并正确归位后，两卡各执行一条适当路线。

完成链为可见代码 → 已保存草稿 → 精确语法及 AST 限制 → Worker 实际执行 → 类型化 trace 与确定性复核 → 已保存 run → 原子作品与 formal-v3 证明。动画、stdout、React 状态及隐藏期望答案不决定成功。火眼金睛只展示保存过的失败事实；提示不编辑、运行或完成代码。失败不扣生命、资源或星数，成功不添加装饰货币。

Progress revision 10 增加独立 session、`w4-m3-branch-structure-record` 作品与正式证明。历史完成保留原 completedAt，只有真实重玩才生成新证据。正式回放重新核验但不改写进度；成功持久解锁 W4-M4，并提供不含答案的家长摘要。W4-M1/M2 原作品与证明保留。

## 本轮发现及修复

- 补齐两条真实 lazy URL 的独立预算，主路径与 `?retry=1` 均计入共享依赖和唯一真实 Worker；任一路径缺失或超限拒绝通过。
- E2E 源码门禁覆盖计算属性访问、属性定义及别名注入；五种写入故障及 CAS 故障必须实际设置、消费与解除。解除故障后清空预期错误白名单。
- 独立审查复现“失败 → 火眼观察 → 不改代码重跑”无法保存的问题。新运行现在使旧运行的观察审计失效，界面隐藏旧观察；本次运行内重复查看仍去重。新增回归先失败再通过，浏览器主路径也加入该操作。
- [受控视觉索引](week-four-python-branch-structure-visual-evidence.md)记录五项目 default/proven 的十张真实截图及哈希、尺寸和日期。素材发布门禁检查索引和链接；本地截图二进制不随提交携带，不把格式校验说成像素验真。

## 验证证据

原始输出保留在本地 `artifacts/verification/`；命令和范围如下。记录器全量指纹变化不自动代表被测行为变化，必须区分脚本/文档编辑和运行时代码编辑。运行时代码最终修复后重新执行以下验收。

| 检查 | 结果与证据 |
| --- | --- |
| 受影响 session/schema/progress/context/experience | 5 文件、341 测试通过；观察后重跑回归已先确认失败 |
| TypeScript | 通过；`1788883046743-30a49223`，6.318 秒 |
| bundle/runtime/E2E 源合同、生产构建及预算 | 229 测试通过并完成 build/budget；`1788883053212-aff111e4`，13.914 秒 |
| 素材合同 | 56 测试通过；`1788883067265-b9c67fef`，2.594 秒 |
| 发布素材门禁 | 通过；`1788883070035-9c10b68f`，1.309 秒 |
| 全量单元测试 | `1788883045512-e47ce99b`：1741 通过，1 项旧 RuyiStaff 499-block 粘贴压力测试超时；158 文件、101.01 秒。对应源码未改，原样定点复跑该文件 30/30 通过（`1788883172658-31a11827`，30.769 秒）；未放宽 timeout 或重试。随后新增故障适配器回归全文件 24/24 通过 |
| 全站浏览器 | `1788883015192-b90e6fe4`：508 项，473 passed / 35 failed / 0 flaky，2279.297 秒（约 38 分钟），workers=1、retries=0；失败分类见下方 |
| W4-M1/M2 防回归 | 同一全站审计分别 26/26、34/34 通过，共 60/60，五项目均按配置覆盖 |
| 最终受影响单元与类型 | `1788884103582-adc02244` typecheck 通过（5.663 秒）；`1788884109378-f24c3df3` 三文件 99/99 通过（3.760 秒），包括新运行观察失效和精确故障注入 |
| 最终 W4-M3 专项 | `1788885321142-7fd943c1`：30/30 通过，0 failed / 0 flaky，205.049 秒，输入指纹一致；桌面 Chromium 16、平板 WebKit 4、手机 Chromium 3、Firefox 3、320px Chromium 4 |
| 最终生产/素材复核 | `1788885360444-4da47508`：229 工程测试及生产构建、预算通过，12.549 秒；`1788885373138-67e19a87` 发布素材门禁通过，1.084 秒 |

生产构建主/备用 lazy closure 均约 968.7 KiB raw、287.0 KiB gzip，含 Worker，低于 3 MiB。保守首页预算 512.4 KiB / 650 KiB。浏览器实际传输结果单独记录，不与静态压缩预算混用。

### 全站失败的基线分析

首次审计因发现本关真实观察生命周期缺陷而主动中断，记录 `1788882776421-40fcd9fa` 为 25 passed、6 failed、1 interrupted、476 did not run；这不是最终审计。修复后重跑完整 508 项。

对照 `cd713bc` 源码及独立归档构建（`/tmp/w4m3-baseline-budget.xmZNL5`，build:e2e 4.24 秒）确认：

- commercial foundation 的旧 Python 测试用 V2 历史记录进入 W4-M2 却期待编辑器；base 已将其路由为历史只读说明。旧 W2-M1 lazy 测试期待 MissionTools，但 base 已使用正式 Horse 路由。
- 首页原始传输预算在 base 的静态下界已为 911453 > 665600 bytes；W1-M1/M2 仅 entry + runtime JS 分别为 2659989/2663443 > 2621440；W1-M3 加必载六图为 3078011 > 2883584。当前公共 entry raw 比 base 增加 34858 bytes。这些下界证明既有预算缺口，不冒充基线浏览器测量，也不以生产 gzip gate 通过代替 raw 浏览器预算。
- regalia 首次草稿、advanced 草稿和 equipment 写入故障使用 raw revision 2 fixture。加载器在内存迁移但不为合法 V3 设置 repair，故障适配器却直接比较旧 CURRENT 的完整内容，revision 2 与迁移后的 9（base）/10（当前）不等，首写故障不触发。相关 fixture、加载及比较逻辑均已在 base 存在；这些测试缺口不代表故障恢复已被证明通过。
- W3-M4 家长导入测试等待的成功提示因预期的 PIN 重新认证而卸载。清空后重建 PIN 会产生新的恢复码摘要，导入旧备份恢复不同的完整凭据；base 的 ParentAccessGate 已规定这种变化必须重新认证，并有单元测试覆盖。测试未处理重新认证。本轮看到的是验证 PIN 页面，不是解析错误；W4-M3 自身导入后的实际存档恢复另由专项路径核验。

未修改这些旧测试断言、提高预算、隔离测试或增加重试来掩盖失败。完整审计的 35 个失败按相同测试的项目实例计数：

| 失败类别 | 实例数 | 具体路径 |
| --- | ---: | --- |
| 旧 W4-M2 历史存档却期待编辑器 | 5 | `commercial-foundation.spec.ts:475`，全部项目 |
| 旧 W2-M1 兼容路由断言 | 1 | `commercial-foundation.spec.ts:593`，桌面 Chromium |
| 既有原始传输预算超限 | 20 | `commercial-foundation.spec.ts:647`、`dragon-palace-code-battle.spec.ts:451`、`four-seas-regalia-code-battle.spec.ts:387`、`ruyi-staff-code-battle.spec.ts:616`，各五项目 |
| 旧版 fixture 首写故障未注入 | 3 | `four-seas-regalia-code-battle.spec.ts:328`、`underworld-boss-code-battle.spec.ts:154` 与 `:158`，桌面 Chromium |
| 导入后重新认证使成功消息卸载 | 1 | `week-three-bajie-joining.spec.ts:59`，桌面 Chromium |
| 本轮新增重跑后的旧计数断言 | 5 | `week-four-python-branch-structure.spec.ts:476`，各五项目；运行实际为 4 次、冲突 3 次，启动时缓存的断言仍期待 3/2。已修正并要求新的专项复跑 |

最后一类的五项目计数断言已经在新的 30/30 专项中全部通过，且完成后续导出导入、清空恢复和 W4-M4 解锁。其余 30 项既有问题仍是全站交付缺口；不能用本关专项通过抵消它们。未重跑基线浏览器，既有问题的归属依据是逐条源码对照、故障机制和独立 base 构建下界。没有把两轮结果拼成“全站 508/508”。

### 最终专项性能

五项目均测得保守本关 closure 1016983 bytes，加 Worker 6892 bytes，总计 1023875 / 3145728 bytes；固定同源 Pyodide 五文件为 13544397 / 15728640 bytes。首次结果预算 20 秒、热运行 1 秒。下面使用实际浏览器附件，非估计：

| 项目 | 测量条件 | 首次结果 ms | 热运行 ms |
| --- | --- | ---: | ---: |
| 桌面 Chromium 1440×1024 | CDP 10 Mbps / 4× CPU | 13377.7 | 218.9 |
| 平板 WebKit 768×1024 | 原生引擎，无 CDP 节流 | 2984.6 | 195.8 |
| 手机 Chromium 390×844 | CDP 10 Mbps / 4× CPU | 13371.0 | 233.8 |
| Firefox 1440×1024 | 原生引擎；两个 Worker module 使用明示 compatibility fetch 补体积计量 | 6027.4 | 193.2 |
| 窄屏 Chromium 320×844 | CDP 10 Mbps / 4× CPU | 13350.4 | 227.1 |

附件位于 `artifacts/w4m3-acceptance/week-four-python-branch-st-53990-m-result-meet-named-budgets-<project>/w4m3-cold-metrics-<project>.json`。Chromium 限速数据和原生引擎时延不混称为同一种测量。

## 素材与视觉

老妇 1024×1024 WebP，258690 bytes，SHA-256 `b1cf7db437613bbfeb6cea555d7f9b9dca53b2cf27df8d81ccea19a0af601f91`；三格路线 1536×512 WebP，184348 bytes，SHA-256 `3bdf6244e763333295fcfd6de6e3a6799222bf05f26695a61dfe1126d88dd832`。加共享白虎岭背景共 564352 / 1310720 bytes。

原始插画由内置图像生成工具产生；实际 alpha 清理、缩放及 WebP 转换在素材清单中如实记录，未把后处理伪装成未经处理的原始生成结果。五项目默认/完成截图已逐张复核人物完整、透明边缘、路线格、文本与窄屏布局。本轮在 `artifacts/w4m3-final-browser-v2/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-<project>/w4m3-<state>-<project>.png` 保存 default/conflict/invalid/proven，共 20 张，独立复核无可见横向溢出、人物裁切或卡片/路线事实冲突。主代理也复核桌面成功全图，底部安全核验文案可见。非法结构截图可能捕获运行环境正在加载；就绪由独立 runtime/cold 浏览器断言证明。Firefox 非法结构截图不能独立证明橙色焦点环，实际焦点和键盘操作另有 DOM/键盘测试。人工屏幕阅读器朗读未验证。

## Completion matrix 与交付边界

| 相关系统 | 本关要求 | 更高层级未完成项 |
| --- | --- | --- |
| Course / Python | 两卡真实执行、失败与成功、刷新与正式回放、W4-M4 解锁 | 其它 Python 模式及 30 关内容矩阵 |
| Parent / saves | 五写入故障、CAS、损坏原文保留与恢复、导出导入、备份清空、历史升级 | 全站残余失败须独立记录 |
| Blockly 前置 | W4-M1/M2 回看只读、证明与作品不被本关改写 | 不由本关外推全站 Blockly 完成 |
| UI / 素材 | 五项目、键盘/触控、焦点、减弱动画、静音、预算、来源及视觉证据 | 屏幕阅读器实测、公开部署与线上检查 |
| Growth / rewards | 本关零惩罚、零新增装饰奖励 | 第四周及全站成长/奖励系统闭环 |

本地生产预览已由代理启动并在浏览器打开，地址 `http://127.0.0.1:4174/xiyou-programming-journey/`。新预览浏览器按正常前置锁定 W4-M3，不注入已完成结果来伪造展示。

独立集成审查的唯一实际阻塞（观察后原代码重跑）已复现、修复并由另一审查者复核。提交仅包含本关相关实现、素材、测试与记录；已有 AGENTS/工程工作流修改、依赖符号链接和原始浏览器输出留在工作区，不混入本关提交。目标分支为 `codex/w4-m3-branch-structure`，无公开部署。
