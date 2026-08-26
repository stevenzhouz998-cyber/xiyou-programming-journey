# w2-m3 蟠桃与金丹顺序调试设计规格

## 目标与完成边界

把 `w2-m3 蟠桃与金丹` 从 `expectedSequence`、`LegacyMissionBuilder` 和 `MissionTools` 兼容路径升级为独立正式任务。预选且最高允许报告的等级是 `One-level playable`；五项目真实浏览器闭环、失败保存恢复、正式资产和 3 MiB cold 路径证据任一缺失时必须报告 `not complete`。

w2-m4、w2-m5、第二周 `System loop complete`、全站 `Full-content verified`、公开部署和 `Commercial production complete` 不属于本关完成证据。进入合并前仍需补跑既有 W1 全量 Playwright。本任务不提交、不推送、不部署。

## 原著事实与课程修正

第五回原著的相关因果链是：悟空受命管理蟠桃园；从七仙女处得知蟠桃会；进入尚未开席的瑶池并饮酒；醉后走错到兜率宫；最后吃下金丹。

legacy 四步链 `guard_garden → learn_feast → visit_palace → eat_elixir` 省略了“瑶池饮酒”，并把醉后误入兜率宫写成主动“前往”。正式关卡采用五个更准确的 opcode：

1. `guard_peach_garden`：受命看守蟠桃园；
2. `learn_peach_banquet`：从七仙女处得知蟠桃会；
3. `drink_at_banquet`：进入瑶池并饮下仙酒；
4. `stumble_into_tusita`：醉后误入兜率宫；
5. `eat_golden_elixir`：吃下金丹。

课程页面使用儿童可理解的原著摘要，并继续链接维基文库第五回。不会把盗食行为包装成奖励，也不会改写原著结果。

## 已批准玩法：预置错序的真实 Blockly 主链

新会话打开时直接显示一条真实连接的 Blockly 主链：

```text
受命看守蟠桃园
从七仙女处得知蟠桃会
进入瑶池饮下仙酒
吃下金丹                 ← 故意放早的真实问题积木
醉后误入兜率宫
```

孩子必须把“醉后误入兜率宫”移到“吃下金丹”之前。鼠标、触摸与键盘辅助控制均修改同一个 Blockly 工作区；文字摘要只从当前工作区现算，不参与执行。

不采用空白搭建方案，因为它考查的是顺序构造，不是调试。不采用 legacy 四节点方案，因为它缺少原著中连接蟠桃会与兜率宫的关键因果。不使用按钮直接改状态、隐藏答案或自动整理。

## 唯一事实源、编译与确定性运行

独立零 UI 合同定义本关 block type、opcode、workspace draft、instruction、state、runtime event 与 diagnostic。编译器只遍历 Blockly 当前主链，验证双向连接、单一根链、无未知积木、无重复/遗漏、无环和工作区边界，并生成按连接顺序排列的 canonical trace。

每条 instruction 保存稳定 `instructionId`、真实 `sourceBlockId`、`previousBlockId`、`nextBlockId` 与 opcode。坐标只用于恢复视觉位置，不决定执行顺序。课程配置、legacy `expectedSequence`、React 数组和场景动画都不是答案源。

运行器只消费 trace，状态依次为：

`awaiting-garden → garden-guarded → banquet-learned → banquet-visited → tusita-entered → elixir-eaten`。

首个不满足当前状态前置条件的 instruction 产生 `sequence-precondition` 诊断并停止。预置错误会精确指向“吃下金丹”的 source block，儿童反馈为：“这块金丹积木跑得太早了：悟空还没有误入兜率宫。”遗漏动作在链结束时产生 `completeness`；非法图在编译期产生 `program-structure`。所有失败的生命、资源和星级损失固定为 0。

完成只能由正确可见链运行到 `elixir-eaten`，且运行 session 写入成功、正式场景资源就绪并播放结束后触发。点击运行、编译成功、场景加载或重播不得直接通关。

## Progress V3、恢复与跨系统效果

`sessions['w2-m3']` 保存 workspace、canonical lastTrace、deterministic lastRun、totalRuns、compile/runtime failures、usedHintTiers、conceptFailures、lastRunAt 和 savedAt。workspace 修改保留累计学习证据，但清除过期 trace/run。

严格导入解析器从 workspace 重编 trace、重跑 runner并逐字段比较；伪造 opcode、块来源、连接 provenance、run 结果、计数或时间必须拒绝。现有 Progress V3 coordinator 继续负责：

- 草稿、运行和完成三类写失败的可见重试；
- 刷新、最近运行重播和损坏 current 的原始字节保留；
- snapshot 恢复、跨标签 revision CAS、导出导入；
- 家长报告中的运行、失败和“顺序调试”概念；
- 完成本关后解锁 w2-m4。

任何保存失败发生时都不得播放未持久化结果或提前解锁。

## UI、正式资产与无障碍

页面延续已批准的明亮 3D 儿童绘本风格，不重新定义产品视觉方向。新增两张 built-in image generation 正式 WebP：

1. 天宫路线场景背景，清楚区分蟠桃园、瑶池与兜率宫，但不含文字、旗幡伪字或 UI；
2. 六阶段状态图，从等待到金丹事件完成，背景透明或可安全裁切，不含棋盘格伪透明。

资产必须记录完整 prompt、工具、编辑过程、SHA-256、尺寸、slot、provenance 与人工原尺寸 QA；未到 `visual-qa-passed` 不进入完成证据。禁止 legacy world-map/young-hero、CSS/div/SVG/emoji/占位画面。

真实 Blockly SVG 在 320、390、768、1440 均可见且无横向溢出。键盘能选择并上下移动真实块、删除并恢复；焦点反馈落到实际问题块。静音和减弱动画只改变表现，不改变 trace、状态或结果。Experience、Scene、Workspace 三层懒加载以及资产失败都有局部可见恢复入口。

## 开工前预算

- w2-m3 cold 路径上限：`3 * 1024 * 1024` bytes；
- entry、homepage、w1-m1～m5、w2-m1、w2-m2 既有上限不得提高；
- 单张 raster、任务媒体总量和现有正式资产 gate 不变。

## 可执行验收

1. 课程合同证明 w2-m3 正式注册且无 `expectedSequence`，不进入 legacy tools。
2. 编译器从真实连接图生成稳定 trace；重排、删除和断开立即改变 trace，并拒绝非法图。
3. 运行器覆盖预置错序、其他错序、缺动作、重复动作、正确链、确定性重放、真实 source block 定位和零惩罚。
4. Progress V3 覆盖默认错序草稿、编辑保存、运行证据、刷新、重播、伪造拒绝、三类写失败、损坏恢复、CAS、导入导出、家长报告和 w2-m4 解锁。
5. 五项目 Playwright 覆盖真实错误→定位→键盘/指针修正→成功、320/390/768/1440、静音/减弱动画、三层懒加载/资产失败、任务资产 404 和 fail-closed page health。
6. unit、bundle/source contract、asset contract、TypeScript、production build、bundle gate、diff check 与专项 Playwright 全部使用新鲜输出记录。
