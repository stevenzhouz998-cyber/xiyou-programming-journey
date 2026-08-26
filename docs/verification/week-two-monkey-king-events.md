# w2-m2 齐天大圣事件触发验证记录

## 结论与边界

`w2-m2 齐天大圣` 达到 **One-level playable**。玩家从空白的真实 Blockly 工作区建立两棵可见事件 handler，系统按固定事件队列运行，错误会定位实际问题积木且不扣生命、资源或星级；workspace、trace、run、提示、尝试、失败和时间通过 Progress V3 保存、刷新、恢复、跨标签和导入导出。

这不是 w2-m3～m5、第二周系统闭环、30 关 Full-content verified 或 Commercial production complete 的证据。进入合并前仍必须补跑既有 W1 全量 Playwright 回归；本任务没有验证公共部署或线上版本。

## 唯一事实源与运行行为

- `src/course/course.ts` 不再注册 w2-m2 legacy mission；`src/course/formalCourse.ts` 以无 `expectedSequence` 的正式任务注册。
- `src/blockly/weekTwoMonkeyKingContract.ts` 是零 UI 合同。草稿保存允许缺帽、空 handler 和孤立动作等中间状态，但编译入口拒绝执行不完整程序。
- 编译 trace 包含 handler/action kind、eventId、eventType、dispatchIndex、handlerBlockId、sourceBlockId、parentBlockId 与 opcode。
- 固定事件队列是 `return-to-flower-fruit` → `heavenly-title-conferred`。第一事件只接受竖旗；第二事件依次接受名号、建府。
- 错事件与 handler 内错序产生不同诊断并聚焦真实 sourceBlockId；结果 penalty 固定为 0/0/0。

## Progress V3

- `sessions['w2-m2']` 保存 workspace、canonical lastTrace、deterministic lastRun、totalRuns、compile/runtime failures、usedHintTiers、conceptFailures、lastRunAt、savedAt。
- workspace 可见编辑会保留历史尝试，同时清空过期的 trace/run。
- 导入解析器从 workspace 重编 trace、重跑 runner，再逐字段比较上传证据；伪造 event provenance、trace 或成功 run 会被拒绝。
- 浏览器覆盖草稿写失败、运行写失败、完成写失败及各自可见重试；成功播放和成功弹窗不会早于对应持久化。
- 覆盖刷新、最近运行重播、损坏 current 保留与 snapshot 恢复、跨标签 CAS、家长报告、导出导入和 w2-m3 解锁。

## 视觉资产与响应式

- 新资产仅来自 OpenAI built-in image_gen：花果山背景和四阶段事件状态图；两个不合规中间稿（伪文字旗幡、假透明棋盘格）被拒绝。
- 最终资产均为 1600×900 WebP，完整 prompt、编辑、处理、SHA-256、slot 和 visual QA 记录在 asset manifest。
- w2-m2 资产共 224,192 bytes，低于 1.25 MiB 任务媒体上限；未使用 world-map、young-hero、CSS/div/SVG/emoji/占位画面。
- 人工查看最终 1440 Chromium、768 WebKit、390 Chromium、1440 Firefox、320 Chromium 截图：场景与初始状态一致，真实 SVG Blockly 可见；390/320 使用纵向两 handler 排布；没有横向裁切或控件重叠。

## 最终自动化证据

- Vitest：70 files，851/851 tests passed。
- bundle/source contracts：145/145 passed，其中包含 w2-m2 anti-injection、health、legacy fallback 和零 UI 合同 gate。
- asset contracts：37/37 passed；正式 asset verify 通过。
- TypeScript `tsc --noEmit`：通过。
- production build 与 bundle gate：通过；entry static JS 111.8 KiB gzip / 180 KiB，conservative homepage 440.1 KiB / 650 KiB。
- w2-m2 Playwright：25/25 passed，使用原有五项目。Chromium/Firefox 键盘产生同一 canonical trace；WebKit/390/320 完成真实错误→刷新→修正→成功路径；所有项目 cold 路径均不超过固定 3 MiB，并验证任务资产族 404。
- `git diff --check`：通过。

## 主要 RED 与修复证据

1. 课程最初仍携带 `expectedSequence`，预算常量不存在，事件合同/Blockly/Progress session/route 均先 RED。
2. Playwright 首次注册为 0 项；加入新标签后在原有五项目收集 25 项。
3. 草稿保存失败测试确认数据写入重试后必须解除恢复锁；实际恢复入口统一为“重试保存本次记录”。
4. 首版资产故障测试被浏览器自动重取掩盖，改为首次 URL 持续失败、仅允许用户触发的 `?retry=` 请求恢复。
5. 768 WebKit 暴露共享 CSS specificity 造成 `0px + 738px` 隐式两列；高 specificity 修复后场景、工作区和重试按钮不再重叠。
6. Firefox 返回的 `getAllBlocks()` 非语义数组顺序不同；键盘测试改为逐步验证 block type 多重集合，并继续用最终 canonical trace 严格验证事件内顺序。

## 完成矩阵审计

- Blockly：本关满足输入、真实连接图执行、刷新恢复、删除/错事件/错序与浏览器反馈。
- Parent / saves：本关满足 Progress V3 保存、恢复、损坏源保留、CAS、导入导出与家长报告。
- UI / release：本关满足目标视口、Chromium/Firefox 键盘、reduced motion/mute 语义、资产 gate、cold budget、页面 health 与本地 404；公共部署、线上 404、线上性能和版本匹配未验证。
- Course / 30 levels：仅 w2-m2 单关证据；其余 W2 内容与全站不满足完整矩阵，因此不得上报 Full-content verified。
