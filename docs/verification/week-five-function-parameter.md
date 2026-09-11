# W5-M3 祈雨赌胜：函数参数验收

日期：2026-09-11。工作区 `/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`，分支 `codex/w4-m3-branch-structure`，基线 HEAD `63b1b5b`。本关在该基线上完成本地实现与验收。用户随后明确授权本关交接、commit 和 push；最终提交及远端结果见 Git 与临时交接文件。未授权 merge 或 deploy。

## 可观察行为

孩子在可见 CodeMirror 中编辑 `weather(order)`。默认函数体固定记录“风”，随后四次调用分别传入风、云、雷、雨；真实运行会显示每次调用的传入值、参数 `order` 的绑定值和实际记录值，因此默认代码明确失败。把函数体改为 `record_weather(order)` 后，四次实际记录才随参数变化并正式成功。漏调、重复、乱序、固定为风云雷雨任一值、危险语法和不合规结构都会保存为零惩罚学习失败。

“定位函数体”和“定位四次调用”只移动编辑焦点，不改代码、不运行；“恢复默认代码”是明确的重置动作。提示只解释已产生的失败，轨迹只展示已保存的真实执行。场景使用已登记的祈雨坛环境图，没有用 CSS 制作天气或人物插画。

执行链为可见源码草稿保存、主线程结构推导、独立同源 Pyodide Worker 真实执行、参数轨迹逐字段核对、运行保存，以及作品、formal-v3 证明和完成状态原子封存。运行、验证、观察、作品与完成保存失败会重试原事务；加载失败、超时、取消、迟到消息、跨标签冲突、损坏恢复、导出清空导入、刷新和只读重放均有覆盖。Progress 为 revision 15；有效 W5-M2 是正式前置，完成后持久解锁 W5-M4。revision 14 的旧 W5-M3 完成只迁移为 `legacy-replay-only`。

本关引用第四十五回的风、云、雷、雨故事片段，并将收雨放晴作为固定尾声；`record_weather` 明确标为教学记录抽象。W5-M4 来源元数据同时收紧到第四十六回，课程仍保持 30 关、第五周 5 关。

## 最终证据

以下 8 份 `verify:record` 均在提交前核实开始/结束指纹一致、`reusable: true`，共同输入指纹 `39ed09602c04…`。指纹包含 HEAD；后续提交改变 Git 元数据，不改变这些检查实际验证的源码。提交后不可把旧记录声称为新 HEAD 的严格指纹复用。

| 验证 | 结果 | 耗时 | 原始证据 |
| --- | --- | ---: | --- |
| 全量单元 | 180 文件，1926/1926 | 91.545 秒 | [记录](../../artifacts/verification/1789103933032-9eea1592/evidence.json) |
| W5-M2 + W5-M3 五项目浏览器矩阵 | 50/50；workers=1，retries=0 | 330.827 秒 | [记录](../../artifacts/verification/1789103593604-cd1134ed/evidence.json) |
| 类型检查 | 通过 | 4.522 秒 | [记录](../../artifacts/verification/1789104076378-2908cfec/evidence.json) |
| 生产构建 | 通过 | 3.642 秒 | [记录](../../artifacts/verification/1789104066547-eb04c856/evidence.json) |
| 工程与浏览器契约 | 236/236 | 7.114 秒 | [记录](../../artifacts/verification/1789104092017-d3e90c02/evidence.json) |
| 生产分包预算 | 通过 | 0.554 秒 | [记录](../../artifacts/verification/1789104107626-b8e9fdc0/evidence.json) |
| 素材合同 | 58/58 | 1.811 秒 | [记录](../../artifacts/verification/1789104117089-31ddf45e/evidence.json) |
| 素材发布门禁 | 全部要求素材为 `visual-qa-passed` | 0.980 秒 | [记录](../../artifacts/verification/1789104128806-4838ac83/evidence.json) |

联合浏览器实际分布为桌面 Chromium 32 项、平板 WebKit 4 项、手机 Chromium 4 项、桌面 Firefox 6 项、窄屏 Chromium 4 项。桌面覆盖两关完整流程及五阶段存储故障、跨标签冲突、真实 Worker 安全、素材失败、运行时失败/超时/取消、损坏恢复、历史迁移、懒加载和冷启动；Firefox 另覆盖键盘。每个项目均运行两关的完整流程和冷启动。

W5-M3 生产 lazy closure 为 1075.8 KiB raw、300.0 KiB gzip，包含唯一 `weekFiveWeatherPython.worker`，低于 3 MiB；首页静态 JS 为 173.7 KiB gzip，低于 180 KiB。新场景图为 271,088 字节，低于 1.25 MiB；来源、prompt、SHA-256、尺寸、槽位和视觉状态见[素材清单](../assets/asset-manifest.md)。

独立专项证据没有计入上述 Vitest 或 Playwright 数量：未改写 Python `exec`/`sys.setprofile` oracle 与 Worker AST parity 各通过 27,800 个程序；真实 Chromium Worker/Pyodide 12 项；进度证明探针 17 项；严格枚举类型回归 2 项。四视口真实 UI 还覆盖默认失败、乱序失败、可见编辑成功、三次运行、刷新、只读真实重放和完整存档字节不变；固定云雷雨、提示不改代码/次数及错误草稿刷新另有复验。原始结果位于 `artifacts/w5m3-independent/`。

过程中发现并关闭三类真实交付风险：课程曾同时注册 formal 与 legacy W5-M3，造成 31 关；会话解析曾把嵌套数组强转成提示/阻塞枚举；快捷按钮曾能一键改成答案。最终版本分别改为唯一 formal 注册、严格字符串枚举和只读定位辅助。另修正了预算测试未纳入新 Worker、浏览器定位器名称及下一关旧标题等验收脚本问题。失败记录保留在 `artifacts/verification/1789101593428-bf46dc22/`、`1789102222796-2ed49eea/` 和 `1789102352933-2f553eff/`，不作为通过证据。

## 完成边界

W5-M3 达到本地 **One-level playable**。这不代表第五周 System loop complete、30 关 Full-content verified、全站通过或 Commercial production complete。W5-M4 与 W5-M5 仍是兼容旧内容；本次没有人工屏幕阅读器、公开部署或线上存档验收。手机与窄屏仍需纵向滚动对照代码和结果。
