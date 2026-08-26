# w2-m2 齐天大圣事件触发设计规格

## 目标与完成边界

把 `w2-m2 齐天大圣` 从 `expectedSequence`、`LegacyMissionBuilder` 和 `MissionTools` 兼容路径升级为独立正式任务。预选且最高允许报告的等级是 `One-level playable`；在五项目浏览器闭环、失败保存恢复、资产和 3 MiB cold 路径证据齐全前必须报告 `not complete`。w2-m3～m5、W1 合并前全量回归和整站 `Full-content verified` 不属于本关完成证据。

## 已批准的实现取舍

采用独立的 w2-m2 事件合同、Blockly 编辑器、确定性运行器、场景和会话解析器，同时复用 w2-m1 已验证的 Progress V3 协调保存、CAS、损坏恢复、导入导出和家长报告基础设施。这个边界既保留两关各自清晰的学习模型，也避免复制一套存储系统。

不采用以下方案：

1. 在 `expectedSequence` 上增加事件字段：仍会留下第二真源，不能证明可见连接图驱动运行。
2. 把 w2-m1 与 w2-m2 塞进一个 mission-specific 常量：循环与事件具有不同的图结构、诊断和状态机，会增加错误耦合。
3. 以动画或按钮直接改变成功状态：无法提供 source block provenance，也无法在导入时重编重放。

## 玩家程序与事件模型

工作区提供两个可见事件帽：

- `当 返回花果山`：正确动作只有 `竖起齐天大圣旗`。
- `当 天庭正式授号`：正确动作依次为 `接受齐天大圣名号`、`建立齐天大圣府`。

动作必须真实连接在事件帽的 statement input 中。系统固定派发 `返回花果山`，再派发 `天庭正式授号`。编译器从 Blockly 当前图生成 handler registrations 与 action instructions，每条记录包含 `eventId`、`eventType`、`handlerBlockId`、`sourceBlockId`、`parentBlockId` 和稳定 instruction id。运行器只消费该 trace，不读取课程答案、坐标或隐藏完成值。

中间草稿始终可保存。空图、缺事件帽、重复事件帽、空 handler、孤立动作或非法连接在执行入口被编译器拒绝，不进入运行器。动作接错事件帽和 handler 内错序进入确定性运行并在首个真实问题动作处停止。

## 状态、反馈与零惩罚

状态依次为 `awaiting-return`、`flag-raised`、`title-accepted`、`residence-built`。事件队列产生 event-dispatched、handler-entered、instruction-accepted/rejected、state-changed、handler-finished 和 run-finished 事件。完成条件仅为两次事件派发后到达 `residence-built`。

诊断分为 program-structure、missing-handler、empty-handler、event-routing、handler-sequence 和 completeness。UI 将诊断翻译为儿童可读中文，并选择真实 `sourceBlockId` 聚焦积木。所有失败的生命、资源和星级损失固定为 0。

## Progress V3 与恢复

`sessions['w2-m2']` 保存 workspace、canonical trace、deterministic lastRun、totalRuns、compile/runtime failures、usedHintTiers、conceptFailures、lastRunAt 和 savedAt。workspace 修改会清除旧 trace/run；运行前先保存草稿，运行后先保存 session，场景才播放；通关弹窗只在完成写入成功后出现。

导入时解析 workspace，重新编译 trace，并重放 run；任何伪造 trace、事件来源、run 结果、计数或时间都拒绝。现有 Progress V3 coordinator 继续负责草稿/运行/完成写失败的可见重试、跨标签 CAS、损坏源保留和下载、导出导入及家长报告。

## UI、视觉与无障碍

页面延续 w2-m1 的明亮 3D 儿童绘本风格，但使用新的花果山事件场景背景与四阶段状态图。只使用内置 image generation 生成的 WebP 或已经 provenance-verified 的项目资产；禁止 legacy world-map、young-hero、CSS/div/SVG/emoji/占位画面。Blockly SVG 在 320、390、768、1440 宽度均必须真实可见且不横向溢出。

鼠标、触摸与键盘产生同一 workspace 和 trace。普通/减弱动画、静音/有声只改变呈现，不改变事件、状态或结果。Experience、Scene、Workspace 懒加载和场景图片失败均保留未受影响区域并提供可见恢复入口。

## 开工前固定预算

- w2-m2 cold 路径上限：`3 * 1024 * 1024` bytes。
- homepage、entry、w1-m1～m5 与 w2-m1 既有预算不得上调。
- 单张 raster 与现有资产 gate 保持不变。

## 可执行验收

1. 课程合同证明 w2-m2 正式注册、无 `expectedSequence`、不进入 legacy tools。
2. 编译器测试证明可见 handler 图是唯一真源，包含真实 event/source/parent provenance，并拒绝缺帽、空 handler、孤立块、重复帽和非法图。
3. 运行器测试证明固定事件队列、匹配 handler、错事件、错序、缺动作、确定性重放和零惩罚。
4. Progress V3 测试证明草稿可保存、workspace 变更清除证据、导入重编重放、伪造证据拒绝、保存失败恢复和 CAS。
5. 五项目 Playwright 通过孩子可见操作覆盖错误→修正→成功→刷新→重放、键盘、静音/减弱动画、320/390/768/1440、三层懒加载/资产失败、404 与 fail-closed page health。
6. 资产 manifest 记录完整 prompt、工具、hash、尺寸、slot、provenance 和人工视觉 QA。
