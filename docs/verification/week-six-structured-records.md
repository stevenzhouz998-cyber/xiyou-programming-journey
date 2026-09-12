# W6-M1 三次借扇记录验收

日期：2026-09-12。状态：本地 **One-level playable**，主代理独立验收已闭合。

## 现场与授权

- 实施工作区：`/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`。
- 分支：`codex/w4-m3-branch-structure`；实施基线 HEAD：`77ccc53e667c452b76af4a65342e78eae3a9c35c`。
- 用户确认字典记录玩法、原著事实更正，并授权后续本地细节由代理决定，明确要求使用模型小队并达到 One-level playable。实施阶段未授权提交、推送、合并或部署；验收后用户另行明确授权本次交接、commit and push，仍不包含合并或部署。
- 模型小队实际委派：`/root/w6m1_implementation`，请求 `gpt-5.6-sol`、`high`，作为产品功能链唯一写入者；`/root/w6_bundle_diagnosis`，请求 `gpt-5.6-terra`、`high`，只读检查打包静态依赖，已回收结果。主代理负责规格、生成素材及来源记录、独立语义核对与浏览器验收，并经明确交接独占素材检查脚本和 15 个旧单元测试的当前版本预期适配。此处记录工具请求参数，不将其表述为额外采集的运行时模型元数据。
- 原有未跟踪审计、依赖链接、regression-results 与 visual-results 保留。

## 交付行为

公开的三次借扇事实卡与程序实际输出表分开显示。孩子通过可见 Python 编辑器修改字典字段读取；同源受限 Pyodide Worker 执行当前代码。默认合法程序将调次写入两列，失败零惩罚；修正后输出三次真实经过，保存 session、作品及正式证明，解锁 W6-M2。

规格：[已确认的 W6-M1 设计](../superpowers/specs/2026-09-12-week-six-structured-records-design.md)。本次只实现 W6-M1 正式玩法，M2/M4/M5 仅作必要事实配置更正。

## 主代理独立检查

产物均在 `artifacts/w6m1-independent/`，与产品实现分开编写。

- `independent-summary.json`：231 个输入核对实际 Python harness 与 TypeScript 语义，205 个双方可接受输入完整轨迹一致；独立 Python harness 无语义偏差，11 个安全反例全部拒绝；16 个正式证明非法变体全部拒绝。最后检查已包含拆分后的默认代码与 session factory，相关文件前后指纹一致，耗时 0.376 秒。该检查不替代浏览器。
- `worker-result.json`：真实 Chromium/Pyodide Worker 的 9 个执行及安全案例通过（开发阶段证据，最终复用需确认相关输入一致）。
- `chain-result.json`：最终生产构建上，桌面 1440×1024 与窄屏 320×844 均从 W5-M4 正式前置开始，实际操作完成 W5-M5，再完成 W6 默认失败、左侧提示保存且不改码、可见编辑、草稿刷新恢复、成功落盘、正式后禁止改写提示、只读真实重播和 M2 解锁；前序作品、证明与装备保持一致，无 pageerror。`final-browser-inputs.json` 记录该轮构建 manifest 哈希及结束时一致性。
- `home-result.json`：无学习存档的新浏览器，通过实际隐私确认打开首页，测得 21 项实际请求资源（包含立即加载的 HomePage）。沿既有工程预算口径，JS gzip、其他资源原始体积合计 493,739 B（482.17 KiB），低于 650 KiB；本地解码后体积 1,091,887 B 另行记录。前者不是线上实测传输量，也不能用它宣称部署性能或相比历史下降。无页面错误和失败资源。
- `asset-tests.log`：60/60 素材合同通过（1.570 秒）；新图的目录、固定单图库存、1536×1024 尺寸、实际 hash、页面引用、视觉状态与既有 512 KiB 单图上限均已接入；不是仅检查旧图。
- `full-unit-diagnostic.log`：首轮 1991 项中 36 项失败。独立归因是 35 项当前存档版本预期 17→18，以及 1 项正式关卡名单缺 W6-M1。`legacy-test-fix.log` 中相关 15 文件 320/320 通过（3.44 秒），仅更新当前输出/当前 fixture 和正式名单；旧输入版本及历史证明来源未改变。最终全量结果另记，不能把局部复跑称为全量通过。

## 联合浏览器验收

最终合并 **60/60 通过**，耗时 **372.791 秒**（含构建/服务启动）；W5-M4 full+cold、W5-M5 与 W6-M1 的全部项目允许路径，五配置、workers=1、retries=0。最终证据为 `artifacts/verification/1789154726609-f3e6a075/evidence.json` 和同目录 `output.log`，执行前后指纹相同，reusable=true。此前 50 项记录因随后 W5-M4 测试输出版本适配被此记录替代，不作为最终全量指纹复用。

- W5-M5 + W6-M1 五配置最终矩阵 **50/50 通过**，耗时 **273.576 秒**；桌面 Chromium、平板 WebKit、手机 Chromium、桌面 Firefox、320px 窄屏 Chromium，workers=1、retries=0。记录：`artifacts/verification/1789154156009-b81b649a/evidence.json` 和同目录 `output.log`，执行前后指纹一致，reusable=true。
- 覆盖真实 Worker、默认失败和改码成功、草稿刷新、只读重播、正式证明和前置门禁、六阶段保存故障、跨标签页冲突、取消后的同页重跑、运行环境加载失败重试、素材/模块失败恢复、损坏存档恢复、家长真实导出→清空→重新设置 PIN→导入。
- 首次联合矩阵 36/49 通过、13 项失败的日志保留在 `artifacts/w6m1-acceptance/playwright-w5m5-w6m1-rerun.log`。修复实际产品问题：保存失败重试原事务而非重复 reducer，防止运行/验证次数重复；正式保存重试后正确展示完成；恢复期间锁定侧栏操作并保留唯一局部重试入口。测试问题分别是成功弹窗遮蔽背景、重复按钮定位、初始 session 增量/字段预期、隐私确认尚未完成即输入 PIN、Firefox Worker 网络事件观测差异，均按实际行为修正，未放宽成功或安全门槛。
- `artifacts/w6m1-independent/recovery-result.json` 为主代理独立原生 Storage 写失败注入，确认局部唯一重试、故障期提示锁定、重试后 totalRuns 恰好 1 且恢复操作；最终普通生产服务检查通过，2.351 秒。它独立于 E2E storage fault adapter。

- W5-M4 因本次 SessionFactory 与 Context 动态加载调整补测 full+cold 五配置 **10/10 通过**，110.806 秒，记录 `artifacts/verification/1789154593019-c59b7d39/evidence.json`。首次失败仅为成功输出断言仍要求 revision 17，已更新为当前 revision 18，保留原始输入/历史来源版本；失败日志 `artifacts/verification/1789154477832-d21e0685/output.log`。三关最终合并记录另列。

## 最终工程门禁与生产复验

| 检查 | 结果与证据 |
| --- | --- |
| 全量单元测试 | **190 文件、1993/1993 通过**，记录耗时 95.015 秒；`artifacts/verification/1789155220268-112514fb/{evidence.json,output.log}`，前后指纹相同，收尾 `verify:reuse` 通过 |
| TypeScript | 通过，`artifacts/w6m1-acceptance/typecheck-final.log` |
| Bundle/E2E 合同 | **245/245 通过**，`artifacts/w6m1-acceptance/contracts-final.log` |
| 素材与工作流 | 素材合同 **60/60**；最终素材门禁通过 `assets-final.log`；workflow **5/5**，`workflow-final.log`，后两项位于 `artifacts/w6m1-acceptance/` |
| 生产构建 | 通过，构建 4.035 秒；`artifacts/verification/1789155136246-47210f86/` |
| 生产预算 | 通过，`artifacts/verification/1789155152059-bafe49d5/`。entry **184285/184320 B**，只余 **35 B**；静态保守 home **556.6/650 KiB**；W6 闭包 **1132.5 KiB raw / 310.6 KiB gzip**。所有上限保持原值，后续开发须继续控制入口体积 |
| 普通生产包独立浏览器 | `artifacts/w6m1-independent/final-browser-inputs.json`：三项脚本全部通过，共 **22.062 秒**；桌面/窄屏 W5-M5→W6-M1 通关链分别 **9.147/9.032 秒**，首页真实请求测量、原生存储故障精确重试均通过 |

最后生产 manifest SHA-256 为 `4e1295b9e40da509293b52330cb7ea81cba5d987d081284164b746247b575543`，独立浏览器执行前后相同。最终桌面和窄屏完成画面已经主代理复看，未发现溢出、不可读的关键操作或素材缺失。五配置联合记录在收尾 `verify:reuse` 仍通过。

全单元测试在之前并行浏览器负载的一轮曾 1990/1991 通过，唯一失败是 App 首关等待成功的默认 1 秒超时；原日志 `artifacts/verification/1789153026324-6886d9cb/output.log` 保留。未修改 App 产品或其测试来掩盖超时：同一 App 测试单独 1/1、整个文件 47/47 通过；最终停止外部测试进程后全量 1993/1993 通过。该失败不作为最终未解决产品缺陷，也不将其归因夸大为已证明的单一根因。

模型小队写入者已经停止所有自启测试/构建进程；主代理最终检查之后仅保留本地生产预览。验收结束时未提交、推送、合并或部署；后续提交与推送状态见工作区外交接文件。


## 完成边界

上述证据支持 **W6-M1 本地 One-level playable**；不代表第六周、三十关、成长系统、全站或商业上线完成。未进行线上部署或线上存档验证。
