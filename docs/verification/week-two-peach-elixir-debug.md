# w2-m3 蟠桃与金丹顺序调试验证记录

## 结论与完成边界

`w2-m3 蟠桃与金丹` 达到 **One-level playable**。新会话打开的是一条预置真实错序的 Blockly 主链；孩子运行后会在提前出现的“吃下金丹”积木处停止，通过指针或键盘把该真实积木下移，重新运行后才能完成。编译、运行、场景和 Progress V3 全部从可见连接图派生，不读取 `expectedSequence` 或隐藏成功状态。

这不是 w2-m4、w2-m5、第二周 `System loop complete`、30 关 `Full-content verified` 或 `Commercial production complete` 的证据。进入合并前仍必须补跑既有 W1 全量 Playwright。本任务没有验证公共部署、线上 404、线上性能或版本匹配，也没有 commit、push 或 deploy。

## 原著与真实玩法

- 原著第五回的关卡链是：管理蟠桃园 → 从七仙女处得知蟠桃会 → 瑶池饮酒 → 醉后误入兜率宫 → 吃下金丹。
- legacy 四步链省略“瑶池饮酒”，并把“误入”写成主动“前往”；正式关卡改为五个独立 opcode。
- 默认图故意排列为“瑶池饮酒 → 吃下金丹 → 误入兜率宫”，首个真实错误 source block 是 `peach-elixir`。
- 正确链只由 Blockly 的 reciprocal previous/next connection 编译；数组顺序、坐标、React 列表和课程文本均不决定执行。
- canonical instruction 保存 `instructionId`、`sourceBlockId`、`previousBlockId`、`nextBlockId` 和 opcode。
- 运行器状态从 `awaiting-garden` 确定性推进到 `elixir-eaten`；失败 penalty 固定为生命、资源和星级 `0/0/0`。

## Progress V3、恢复与跨系统证据

- `sessions['w2-m3']` 保存 workspace、canonical trace、deterministic run、运行/编译失败、概念失败、提示层级和时间。
- workspace 可见修改保留累计尝试，同时清除过期 trace/run；导入时从 workspace 重编并重放，伪造连接 provenance 或 run 结果会被拒绝。
- 浏览器覆盖草稿、运行、完成三类写失败；成功场景和通关弹窗都不会早于对应持久化。
- 覆盖刷新、最近运行重播、损坏 current 原始字节保留与 snapshot 恢复、跨标签 revision CAS、导出导入、家长报告和 w2-m4 解锁。
- 重复顺序失败会在第二周家长报告中进入“顺序调试”支持项。
- 排查同时发现并修复了既有 w2-m1 同草稿并发保存竞态：晚到的重复 draft save 可能清空刚写入的 run。新增确定性并发保存测试后，w2-m1 连续五次重复回归通过；w2-m3 使用相同保存合并门禁。

## 正式资产与视觉 QA

- 两张 shipping WebP 仅来自 OpenAI built-in image generation：天宫路线背景与六阶段透明状态图。
- 一个背景移除编辑因生成假棋盘而被拒绝；shipping 状态图使用初次生成的真实 RGBA alpha 源。
- 两张资产分别为 `1600x900`、181,316 bytes 与 `1536x1024`、427,632 bytes；合计 608,948 bytes，低于 1.25 MiB 任务媒体上限，单张均低于 512 KiB。
- manifest 记录完整 prompt、被拒绝版本、Sharp 技术编码、SHA-256、尺寸、slot、provenance 和人工 QA，严格 release asset gate 通过。
- 人工查看 1440 Chromium、768 WebKit、390 Chromium、1440 Firefox、320 Chromium 的失败/完成截图：无伪文字、假透明、横向溢出或关键裁切。
- 初版 CSS 曾让 Blockly DOM 存在但像素为空白。新增 host screenshot 像素离散度门禁后先 RED；补齐真实 injected Blockly 的尺寸与定位后，五块彩色 Blockly 在所有项目可见，空白壳无法再通过。

## 最终自动化证据

- Vitest：77 files，883/883 tests passed。
- bundle/source contracts：147/147 passed，包含 w2-m3 anti-injection、零 UI、health、legacy fallback 和像素可见性相关门禁。
- asset contracts：38/38 passed；严格 `--require-visual-qa` asset verify 通过。
- TypeScript `tsc --noEmit`：通过。
- production build 与 bundle gate：通过；entry static JS 113.2 KiB gzip / 180 KiB，conservative homepage 444.3 KiB / 650 KiB。
- w2-m3 Playwright：原有五项目 25/25 passed。五项目主路径和 3 MiB cold gate 均通过；Chromium/Firefox 键盘产生相同 canonical trace；覆盖 320/390/768/1440、静音/普通动画、三层懒加载、场景资产失败、任务资产 404、应用未知任务 fail-closed 和原始 health event 空数组。
- 正式资产：2/2，608,948 bytes / 1,310,720 bytes。
- `git diff --check` 与最终 changed-path 审计通过；分支仍为 `codex/week-two-formal`，HEAD 仍为 `f0b07ec5cff05b7b3ee5ea94961cf7c015170b97`。没有 commit、push 或 deploy。

## 主要 RED 与修复证据

1. 课程最初只有两个正式 W2 任务，w2-m3 仍有 `expectedSequence`；课程与 route 测试先 RED。
2. 零 UI 合同、真实 Blockly compiler、Progress session 与三个 UI 层均先以 module-not-found 或任务编号无效 RED。
3. 预算测试先因 w2-m3 3 MiB 常量缺失 RED；所有旧预算保持不变。
4. E2E 首次精确收集 25 项，首轮为 18 passed / 7 failed；失败集中于持久化读取时序和错误的服务器级未知路径假设，修正为条件等待与应用 fail-closed 页面后相关 8/8 通过。
5. 自动化最初只证明 Blockly SVG DOM 存在，人工截图发现实际为空白。新增像素门禁得到 4.31 stdev 的明确 RED；CSS 修复后桌面 host 达 47.93，并在五项目主路径通过。
6. 全量 Vitest 首轮 880/881 暴露既有 w2-m1 同草稿并发保存竞态；确定性 RED 证明一次编辑会发出两次保存，合并 in-flight save 后新增门禁与连续重复回归均通过。

## 完成矩阵审计

- **Blockly：** 本关满足真实输入、可见连接图执行、错序/删除/断开反馈、真实 source block 定位、刷新与重播。
- **Parent / saves：** 本关满足 Progress V3、严格重编重放、三类写失败、损坏源保留、CAS、导入导出与家长报告。
- **UI / release：** 本关满足目标视口、Chromium/Firefox 键盘、reduced motion/mute 语义、正式资产 gate、3 MiB cold、本地任务资产 404、未知任务 fail-closed 和本地页面 health；公共部署未验证。
- **Course / 30 levels：** 仅 w2-m3 单关证据。w2-m4～m5、第二周系统闭环和整站内容矩阵不满足，因此不得上报更高等级。
