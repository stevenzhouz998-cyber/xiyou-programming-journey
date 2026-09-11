# W5-M2 三清观：函数定义与调用验收

日期：2026-09-11。工作区 `/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`，分支 `codex/w4-m3-branch-structure`，基线 HEAD `fba30f246fe5ad7b71e87beb9ec72ef35d04ddda`。该 HEAD 已包含正式 W5-M1；W5-M2 在此基线上完成本地验收。用户随后于同日明确授权本关交接、commit 和 push；未授权 merge 或 deploy。最终提交和远端结果以 Git 与系统临时交接文件为准。

## 可观察行为

孩子在可见 CodeMirror 中编辑无参函数 `record_sanqing()`。默认函数体已按顺序包含“记录夜入三清观”和“记录说明来历”，但没有调用；首次真实运行只留下“定义完成”，两条动作不会执行。孩子在定义后调用一次，独立 Worker 才进入函数体并依次执行两步。漏调、重复调用、缺步、逆序及把动作放到函数外都会保存为零惩罚学习失败；参数留给 W5-M3。

三个快捷控件和编辑器修改同一份源码，普通空行、LF 与 CRLF 保持等价。渐进提示只解释概念，不改写或运行源码。逐步轨迹只播放已保存的真实定义、调用与动作，显示源行及函数内外边界。运行中的 Worker 有明确“取消本次运行”控件；控件仅在 Worker 等待结果阶段出现，进入持久化后关闭，取消后的迟到消息不会保存。

执行链为：草稿原子保存 → 主线程同步 AST 推导 → 独立同源 Pyodide Worker 以 AST 白名单、空 builtins 和真实 `exec` 执行 → 回调形成定义/调用/动作轨迹 → 主线程逐字段核对 → 保存运行 → 作品、formal-v3 证明和完成状态原子封存。stdout、预期文本、动画和 React 状态不决定成功。正式完成后只读回放再次执行已保存源码，但不改提示、次数、作品或证明。

Progress 升至 revision 14。正式 W5-M1 是本关前置；完成后持久解锁 W5-M3。revision 13 及更早的旧 W5-M2 完成只迁移为 `legacy-replay-only`，真实重玩才能升级，同时保留原任务历史。运行、结构验证、观察、作品和完成保存失败均重试原事务，不重复执行或计数；跨标签冲突、损坏源下载、快照恢复、导出清空导入和家长摘要均有真实浏览器覆盖。

固定故事回顾为：悟空、八戒、沙僧夜入三清观，悟空随后说明他们是西行取经的僧众；故事接着进入车迟国祈雨比试。两条记录是教学回顾抽象，不冒充原著手续，也不要求孩子编写亵渎或战斗。[第四十五回原文](https://zh.wikisource.org/wiki/西遊記/第045回)用于核对悟空说明西行僧众来历。

## 最终证据

所有下表记录的输入指纹均为 `9f07abb83625…`，命令开始/结束指纹一致。

| 验证 | 结果 | 耗时 | 原始证据 |
| --- | --- | ---: | --- |
| 全量单元 | 176 文件，1902/1902 | 92.602 秒 | [记录](../../artifacts/verification/1789097616551-8c46bd4e/evidence.json) |
| W5-M1 与 W5-M2 五端完整联合浏览器 | 56/56；W5-M2 25，W5-M1 31；workers=1，retries=0 | 364.708 秒 | [记录](../../artifacts/verification/1789097219936-baa57bcc/evidence.json) |
| W5-M2 桌面完整故障矩阵 | 16/16 | 73.099 秒 | [记录](../../artifacts/verification/1789096828155-51a118d6/evidence.json) |
| E2E 故障构建 | 通过，独立 W5-M2 Worker 产物唯一 | 3.690 秒 | [记录](../../artifacts/verification/1789096919942-6f103caa/evidence.json) |
| 类型检查 | 通过 | 5.489 秒 | [记录](../../artifacts/verification/1789097616551-89d756ff/evidence.json) |
| 工程脚本、生产构建与预算 | 233/233，构建及预算通过 | 11.089 秒 | [记录](../../artifacts/verification/1789096793815-27c0f809/evidence.json) |
| 素材合同 | 57/57 | 2.724 秒 | [记录](../../artifacts/verification/1789097616550-c406b4d3/evidence.json) |
| 素材发布门禁 | 全部素材为 `visual-qa-passed` | 1.533 秒 | [记录](../../artifacts/verification/1789097616551-b4a6f0c2/evidence.json) |

独立 Python oracle 没有复用 Worker harness，而是用未改写源码的 Python `exec` 加 `sys.setprofile` 对照 TypeScript 完整轨迹；3008 个有限程序变体（含空行、LF/CRLF、函数体/顶层组合）全部一致，0.051 秒。这 3008 个组合不计入 Vitest 的 1902 项。[原始结果](../../artifacts/w5m2-independent/python-oracle-result.json)。主代理另以 dev StrictMode 完成默认失败、可见编辑、两次运行、formal-v3、刷新及只读回放，并确认保存前后字节一致、无 pageerror；四个视口无水平溢出。[独立结果](../../artifacts/w5m2-independent/result.json)。

完整联合浏览器实际分布为桌面 Chromium 37 项、桌面 Firefox 7 项、平板 WebKit 4 项、手机 Chromium 4 项、窄屏 Chromium 4 项。桌面覆盖全部存档与运行故障；Firefox 覆盖键盘；每端都跑两关完整流程和冷启动。最终截图、各端指标和追踪副本保存在 [稳定浏览器产物](../../artifacts/w5m2-acceptance-final)。

| 项目 | W5-M2 首次结果（预算≤20秒） | 热运行（预算≤1秒） | 测量条件 |
| --- | ---: | ---: | --- |
| desktop-chromium-1440x1024 | 13.537 秒 | 0.300 秒 | 10mbps-4x-cpu-cdp |
| desktop-firefox-1440x1024 | 6.154 秒 | 0.252 秒 | native-engine-compatible-no-cdp |
| tablet-webkit-768x1024 | 2.550 秒 | 0.235 秒 | native-engine-compatible-no-cdp |
| mobile-chromium-390x844 | 13.514 秒 | 0.319 秒 | 10mbps-4x-cpu-cdp |
| narrow-chromium-320x844 | 13.460 秒 | 0.324 秒 | 10mbps-4x-cpu-cdp |

三种 Chromium 使用 10 Mbps 与 4 倍 CPU 降速；Firefox/WebKit 是原生引擎兼容测量，不声称相同节流条件。W5-M2 lazy closure 1,117,277 字节加 Worker 5,389 字节，共 1,122,666 字节，低于 3 MiB；同源 Pyodide 五文件 13,544,397 字节，低于 15 MiB；新场景 247,316 字节，低于 1.25 MiB。素材来源、prompt、哈希、尺寸、槽位与视觉状态见[素材清单](../assets/asset-manifest.md)。

## 完成边界

W5-M2 达到本地 **One-level playable**。这不代表第五周 System loop complete、30 关 Full-content verified、全站通过或 Commercial production complete。W5-M3 至 M5 仍未正式实现；本次只证明 W5-M1 前置、W5-M2 完整链及 W5-M3 解锁边界。没有执行人工屏幕阅读器验收、公开部署或线上存档验证。手机和窄屏页面纵向较长，需要滚动对照代码与结果，保持既有布局方向。
