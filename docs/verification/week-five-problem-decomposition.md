# W5-M4 后续比试：问题分解验收

日期：2026-09-11。工作区 `/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`，分支 `codex/w4-m3-branch-structure`，实施基线 HEAD `ede141d8b8cd`。本关证据覆盖本地实现和验证。用户随后于 2026-09-11 明确授权交接并 commit、push 当前分支；不包含 merge 或 deploy。提交结果以 Git 及工作区外交接文件为准。

## 可观察行为

孩子在可见 CodeMirror 中编辑三个小函数和一个总函数。默认程序虽然正好显示五条故事标题，但“隔板猜物”被错放进坐禅小组，同时总函数漏调猜物小组。第一次真实运行只报告当前最先阻塞的记录归属错误并定位到错放记录；孩子修正归属后再次运行，才看到漏调用。总函数重复、乱序、顶层绕过或小函数归属不对都不能通关。

程序只记录坐禅、隔板猜物、砍头比试故事、剖腹比试故事和油锅比试故事五个公开标签，不提供伤害指令，也不引入 `return`。所有学习失败均为零惩罚。提示和定位按钮只解释已保存的当前失败与移动焦点，不改代码、不执行；只读回放再次启动真实 Worker，同时保持存档逐字节不变。

执行链为可见源码原子保存、主线程结构推导、同源模块 Worker 中的 Pyodide 实际执行、函数调用层级和动作归属逐字段核对，再原子保存运行、作品、formal-v3 证明和完成状态。Worker 使用整树 AST 白名单，并拒绝参数、现代泛型、`return`、`pass`、导入、属性访问、循环、递归和其他任意语法。stdout、表面文字、隐藏答案和 React 状态均不能决定成功。

Progress 为 revision 16；有效 W5-M3 formal-v3 是正式前置。正式完成保留前关作品和装备、持久解锁 W5-M5，并在家长摘要中只报告问题分解学习结果。revision 15 的旧 W5-M4 完成只迁移为 `legacy-replay-only`。运行、验证、观察、作品、完成保存失败，以及 Worker 加载、超时、取消、迟到结果、跨标签冲突、素材失败、损坏恢复、刷新、导出清空导入均有真实浏览器覆盖。

## 正式证据

以下 9 份 `verify:record` 均已核实开始/结束指纹一致、`reusable: true`，共同输入指纹为 `90bbe0411ac4…`。实现冻结前，W5-M4 单关五项目预检为 24/24，耗时 2.6 分钟；该预检用于关闭开发问题，不替代下表的正式同指纹记录。

| 验证 | 结果 | 耗时 | 原始证据 |
| --- | --- | ---: | --- |
| 全量单元 | 183 文件，1949/1949 | 96.234 秒 | [记录](../../artifacts/verification/1789115063034-568a3eb1/evidence.json) |
| W5-M3 + W5-M4 五项目浏览器矩阵 | 49/49；workers=1，retries=0 | 320.045 秒 | [记录](../../artifacts/verification/1789115197272-740af8ec/evidence.json) |
| 类型检查 | 通过 | 6.446 秒 | [记录](../../artifacts/verification/1789115063028-c1c60cdc/evidence.json) |
| 生产构建 | 通过 | 5.333 秒 | [记录](../../artifacts/verification/1789115063040-c03defc0/evidence.json) |
| 工程与浏览器契约 | 239/239 | 7.392 秒 | [记录](../../artifacts/verification/1789115087634-bc82de90/evidence.json) |
| 生产分包预算 | 通过 | 1.087 秒 | [记录](../../artifacts/verification/1789115087633-5077a446/evidence.json) |
| 素材合同 | 59/59 | 3.373 秒 | [记录](../../artifacts/verification/1789115063029-80e6e360/evidence.json) |
| 素材发布门禁 | 全部要求素材为 `visual-qa-passed` | 1.915 秒 | [记录](../../artifacts/verification/1789115063029-7cb62c60/evidence.json) |
| 工作流静态门禁 | 5/5 | 1.028 秒 | [记录](../../artifacts/verification/1789115063035-06f746f0/evidence.json) |

联合矩阵实际分布为桌面 Chromium 31 项、平板 WebKit 4 项、手机 Chromium 4 项、桌面 Firefox 6 项、窄屏 Chromium 4 项。第一次正式记录为 44/49：W5-M4 的 24 项全部通过，五个项目中的 W5-M3 完整链仍断言旧的当前 schema revision 15。该断言已改为 revision 16，revision 14 的历史迁移夹具保持不变；[失败日志](../../artifacts/verification/1789114673226-1b645973/output.log)保留，第二次联合矩阵 49/49 形成上表最终证据。

正式冷启动在桌面 Chromium 以 10 Mbps 网络和 4 倍 CPU 节流实际测量：同源 Pyodide 五项资源 13,544,397 字节，页面 lazy closure 1,172,541 字节，独立 Worker 6,893 字节，场景图 311,702 字节；首个真实结果 13.50 秒，热结果 299 毫秒，均在沿用预算内。其他项目也验证同源运行时文件齐全与实际传输字节；五项目指标原文见 [`final-cold-metrics.json`](../../artifacts/w5m4-independent/final-cold-metrics.json)。

独立专项证据不计入正式 Vitest 或 Playwright 数量：CPython 语义 oracle 与生产 harness parity 各 1567/1567；实际浏览器 Pyodide Worker 17/17；六种不可能或篡改动态轨迹全部拒绝；正式证明与迁移探针 16/16；可见编辑覆盖默认归属失败、修正后漏调用、重复调用失败、成功、刷新和只读回放。四视口均无横向溢出，1536×1024 场景图完整加载且控制台错误为零。定位专项核对默认错放记录第 3 行及后三项实际错误行。原始结果位于 [`artifacts/w5m4-independent/`](../../artifacts/w5m4-independent/)。

过程中关闭了六类真实边界：动态动作最初未被核心合同消费；总函数可在小函数动作之后才伪造启动；Worker 开发路径和 module 加载方式不兼容；提示定位曾指向同组的正确记录；课程同时注册 formal 与 legacy W5-M4；家长访问门在未设置凭据的初态会做一次多余 relock，且清空后的第二次设置可能在锁回更新完全落地前开始输入。最终分别加入完整动态轨迹消费、总函数活动上下文、同源模块加载、实际错误行定位和唯一 formal 注册。ParentAccessGate 只在记录变化或已授权记录不再匹配时锁回，避免初始冗余 relock 抹掉输入，同时继续容忍本地保存成功后 `record` prop 短暂仍为旧 `unset`；浏览器链等待清空后的锁回 effect 完成再做一次真实输入。家长 PIN 的格式、哈希和权限规则未改变。

## 完成边界

W5-M4 达到本地 **One-level playable**。这不代表第五周 System loop complete、30 关 Full-content verified、全站通过或 Commercial production complete。W5-M5 仍是兼容旧内容；本次没有人工屏幕阅读器、公开部署或线上存档验收。手机与窄屏仍需纵向滚动对照代码和记录组。

## 提交后的证据时效

提交前 9 份证据再次通过严格复用检查。它们记录的是实施基线 HEAD 与本次全部源码输入；提交本身改变 HEAD 后，严格指纹检查会失效。保留原始记录，以提交前暂存差异核对源码一致性，不伪造提交后重新运行的证据。

提交检查另发现新文件 `weekFiveDecompositionPythonRunner.ts` 末尾多一个空行，已仅删除该空行。无可执行内容变化；旧9份全量证据保持原样，严格指纹从此不再复用，补充类型与该 runner 专项检查均通过（记录：`artifacts/verification/1789116025223-4d585a12/evidence.json`、`artifacts/verification/1789116026420-d4530aec/evidence.json`）。
