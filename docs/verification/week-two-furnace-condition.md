# W2-M4 八卦炉循环条件验证记录

## 结论与完成边界

`w2-m4 八卦炉脱身` 达到 **One-level playable**。孩子从可见 Blockly 图的默认错误循环条件开始；运行会持久化失败、定位真实条件积木且零惩罚。孩子用鼠标或键盘替换为“听见炉头声响并看见光明”后，真实连接图编译为七轮四十九日 trace，场景到达 `furnace-toppled`，再由已保存运行结果触发通关。刷新后可以重播同一已保存运行，且不会重复授予奖励。

这不是第二周 `System loop complete`、30 关内容验证、公共部署或商业生产完成的证据。W2-M5 已有独立正式 Blockly 路径，但第二周仍缺少会改变后续选择的真实奖励/掌握度跨系统效果；未执行 commit、push 或 deploy。

## 真实玩法与存档边界

- 可见 Blockly 的主链、循环体和 `CONDITION` 输入是唯一执行事实来源；没有 `expectedSequence`、legacy tools 或隐藏成功状态。
- 默认“眼睛被烟熏红”会保存 `lastRun.completed=false`，显示可理解反馈，不显示成功弹窗，不扣生命、资源或星级。
- 正确条件保存 `elapsedDays=49`、`completedRounds=7`、`furnace-toppled` 与零惩罚；通关后解锁 W2-M5，但不把 W2-M5 本身升级为正式关卡。
- 运行结果在播放和成功前写入 Progress V3；模拟运行保存失败会显示“重试保存本次记录”，未保存前没有播放成功或通关。
- 草稿保存失败在可见重试成功后同时清除 Experience 与 Blockly 工作区两层旧告警、解除锁定，且不会伪造播放或完成。多标签 CAS 冲突提供“下载本页备份”和“载入其他标签页版本”，外部载入恢复获胜标签页的真实可见条件图。
- 场景图片失败时显示“重试加载场景图片”；场景未 ready 时不完成，恢复同一受管资产后才允许已保存的正确运行通关。

## 浏览器证据

- 主路径：`npx playwright test e2e/week-two-furnace-condition.spec.ts --grep @furnace-full`，5/5 通过（25.2 秒）：1440 Chromium、768 WebKit、390 Chromium、1440 Firefox、320 Chromium。
- 覆盖默认失败→可见条件替换→49 天成功→刷新→重播，并断言失败/成功 `lastRun`、trace 末项天数、任务完成和单次奖励。
- 键盘：`--grep @furnace-keyboard`，Chromium 与 Firefox 2/2 通过。
- 保存与冲突故障：`--project=desktop-chromium-1440x1024 --grep @furnace-storage`，3/3 通过，覆盖运行保存失败、草稿保存失败和双标签 CAS 备份/载入。
- 资产故障→重试：`--project=desktop-chromium-1440x1024 --grep @furnace-asset-fault`，1/1 通过。
- 冷加载、3 MiB 预算和任务资产 404：`--grep @furnace-cold`，5/5 通过（17.3 秒）。所有专项页面健康收集器在每个测试后断言未知 console/page/request/HTTP 错误为空。
- 第二周五文件完整矩阵：106/106 通过（5.2 分钟），覆盖原五项目及新增 W2-M4 恢复路径。

## 自动化与资产证据

- `npm run test:unit`：92 files、926 tests 通过。
- `npm run typecheck`：通过。
- `npm run verify:bundle`：通过；entry static JS 119.6 KiB gzip / 180 KiB，首页保守总量 450.8 KiB / 650 KiB。
- source/bundle contracts：150/150 通过，新增草稿故障、冲突备份/载入缺失时 fail-closed 的 W2-M4 门禁。
- asset contracts：40/40 通过；严格 visual QA gate 通过。八卦炉两张已登记 WebP 合计 345,638 bytes / 1,310,720 bytes。

## RED 到 GREEN 记录

1. 原有炉内 E2E 的 `addInitScript` 引用了测试进程闭包，浏览器未写入前置进度，关卡保持锁定并在 60 秒超时。改为显式传入 key/raw 后，真实预置只用于 W2-M3 以前的合法进度。
2. 新增 `fail-furnace-session` 浏览器用例先 RED：测试故障适配器没有 W2-M4 精确运行写入分支。补齐仅匹配 W2-M4 session delta 的测试适配器后 GREEN。
3. 资源恢复用例先 RED：成功弹窗会将背景置为 inert，accessibility role locator 不再可见。改为直接断言实际 scene DOM 的 ready/state 属性；资产请求本身仍由浏览器 503→带 retry 查询的受管资源恢复验证。
4. 全量单测先 RED：响应式静态测试把合法 lazy import 限为单行格式。放宽空白匹配后，仍严格验证相同动态导入，84/898 全绿。
5. 本次可靠性修复的组件 RED 证明：无待播放结果时，草稿重试即使保存成功仍回到 `unsaved`；CAS 冲突没有任何操作按钮。最小修复后组件 3/3 通过。
6. 第一轮浏览器 RED 进一步证明：协调器重试成功后 Blockly 子组件仍残留“积木更改未保存”。以 Experience 的解除锁定作为已持久化 draft 信号清除本地告警后，三类 W2-M4 存储浏览器路径 3/3 通过。

## 未验证范围与下一阻塞

- 没有公开部署、线上 404、线上性能、儿童隐私运营审查或跨设备恢复证据。
- 本关只证明一关完整回路；第二周与 30 关矩阵不因本证据而完成。
- 下一阻塞是为第二周确定并实现会改变后续玩家选择的真实奖励/掌握度效果，再验证跨关获得、使用、刷新、导入导出、失败和移除路径。
