# W2-M5 天宫信号调度台 Boss 设计规格

## 目标与完成边界

把 `w2-m5 天宫总试炼` 从 `expectedSequence`、`LegacyMissionBuilder` 和 `MissionTools` 兼容路径升级为独立正式 Boss 任务。预选且最高允许报告的等级是 `One-level playable`；五项目真实浏览器闭环、严格 Progress V3、失败恢复、正式资产和 `3 * 1024 * 1024` bytes cold 路径证据任一缺失时必须报告 `not complete`。

本关完成不等于第二周 `System loop complete`、全站 `Full-content verified`、公开部署或 `Commercial production complete`。进入合并前仍需补跑既有 W1 全量 Playwright。本任务不提交、不推送、不部署，也不清理 W1 或 W2-M1～M4 的未提交现场。

## 原著事实与课程边界

第四至七回的相关因果链是：悟空受封弼马温并照料天马，得知未入流后反下天宫；花果山竖齐天大圣旗，天庭随后授予齐天大圣空衔并建府；悟空管理蟠桃园，从七仙女处得知蟠桃会，进入瑶池饮酒，醉后误入兜率宫并吃下金丹；二郎神与太上老君相助擒拿；悟空在八卦炉巽位避火，四十九日后听见炉头声响、看见光明而脱身；最后与如来掌中赌赛，被压在五行山下。

课程不把偷食、刑罚或镇压包装成奖励。孩子的代码复盘止于八卦炉脱身；如来掌中赌赛与五行山作为不可编辑的原著尾声，明确标示为叙事后果而不是孩子编写的“惩罚指令”。尾声不能掩盖不完整程序，也不是隐藏成功条件。

## 已批准玩法：天宫信号调度台

一个真实 Blockly 工作区包含五个可见事件帽：

1. `当 御马监开始值守`；
2. `当 悟空返回花果山`；
3. `当 天庭正式授号`；
4. `当 蟠桃会消息传来`；
5. `当 八卦炉开始锻炼`。

系统按上述原著先后派发五个信号。信号队列只表示外界发生的故事事件，不包含答案；每个事件如何处理，完全来自对应事件帽下的真实连接图。

正确程序结构为：

```text
当 御马监开始值守
  接受弼马温官职
  重复 3 次
    照料下一匹天马
  了解弼马温品级
  离开天庭返回花果山

当 悟空返回花果山
  竖起齐天大圣旗

当 天庭正式授号
  接受齐天大圣名号
  建立齐天大圣府

当 蟠桃会消息传来
  受命看守蟠桃园
  从七仙女处得知蟠桃会
  进入瑶池饮下仙酒
  醉后误入兜率宫
  吃下金丹

当 八卦炉开始锻炼
  被押入八卦炉
  藏到巽位避火
  重复直到【听见炉头声响并看见光明】
    安稳等待七日
    查看炉口
  纵身跳出
  蹬倒八卦炉
```

首次进入时，同一张可见图预置四个真实错误：

1. 天马循环次数为 `2`；
2. `接受齐天大圣名号` 错接在“返回花果山”事件帽下，`竖起齐天大圣旗` 错接在“天庭正式授号”事件帽下；
3. `吃下金丹` 位于 `醉后误入兜率宫` 之前；
4. 八卦炉结束条件为 `眼睛被烟熏红`。

运行只显示并聚焦当前遇到的第一个阻塞错误。孩子逐项修复后重新运行，前缀才会继续推进到下一概念，避免一次展示四条答案或制造认知过载。鼠标、触摸与键盘辅助控件必须修改同一个 Blockly workspace；文字程序树只呈现当前图，不参与执行。

## 独立合同、编译与唯一事实源

W2-M5 使用新的零 UI 合同，不直接拼接 W2-M1～M4 compiler。旧关合同的 mission ID、根结构和容器约束互不兼容；机械组合会产生第二事实源和无法验证的跨图 provenance。

新合同定义：

- 五类事件帽、动作块、固定次数循环、`repeat until` 容器和三个炉内条件传感器；
- workspace block 的稳定 ID、类型、坐标、互惠 `previousId/nextId`、`parentBlockId`、事件帽归属和 condition input 连接；
- event dispatch、handler enter/finish、循环 start/body/finish、condition check 和 action instruction；
- 每条 instruction 的稳定 ID、event ID/type、handler block ID、source block ID、parent block ID、iteration、repeat count、condition source 和累计故事天数。

编译器只遍历当前 Blockly 图，拒绝：未知块、缺失或重复事件帽、空 handler、孤立动作、跨 handler/容器连接、循环体或条件形状错误、非互惠连接、环、重复或遗漏必需动作、工作区边界溢出。坐标只恢复布局，不决定执行顺序。

课程配置、React 数组、动画状态、legacy `expectedSequence` 与尾声事件均不是答案源。完成只能来自正确可见图生成的 canonical trace。

## 确定性运行、状态与原著尾声

主状态依次覆盖：

`awaiting-stable → post-accepted → horses-cared-1/2/3 → rank-learned → returned → flag-raised → title-accepted → residence-built → garden-guarded → banquet-learned → banquet-visited → tusita-entered → elixir-eaten → furnace-entered → sheltered-in-xun → furnace-waiting → furnace-open → escaped`。

正确运行必须产生：

- 三次真实天马循环；
- “返回花果山”和“天庭正式授号”的正确 handler 路由；
- 五步蟠桃、瑶池、兜率宫顺序；
- 七轮等待、四十九日累计和炉门信号退出；
- 最终 `escaped`。

只有已持久化的正确运行到达 `escaped` 后，Scene 才播放 `palm-wager → canon-under-mountain` 尾声。尾声以独立 `canon-epilogue` runtime event 保存，`sourceBlockId=null`，不加入 canonical instruction trace，也不能改变失败 trace 的结果。尾声资源 ready 且播放完毕后才能申请通关保存。

## 失败、诊断与零惩罚

诊断概念包括：`program-structure`、`loop-count`、`event-routing`、`handler-sequence`、`sequence-precondition`、`loop-condition`、`condition-never-met` 和 `completeness`。

- 两次循环在 `repeat` 真块处停止并提示还有天马未照料；
- 错事件在被路由错误的真实动作块处停止；
- 金丹早到在真实金丹块处停止；
- 红眼条件在真实条件块处停止；
- 永不成立的炉内条件在第八次条件检查安全停止，不继续累计天数；
- 结构错误在编译阶段聚焦实际断开、重复或越界块。

所有失败的生命、资源和星级损失固定为 0。帮助只说明当前概念、状态与问题位置；不得添加、删除、替换、移动积木，不得运行、透露完整程序或完成任务。

## Progress V3、恢复与跨系统效果

`sessions['w2-m5']` 保存 workspace、canonical lastTrace、deterministic lastRun、totalRuns、compile/runtime failures、usedHintTiers、conceptFailures、lastRunAt 和 savedAt。workspace 编辑保留累计学习证据，但清除过期 trace/run；相同草稿的 in-flight save 必须合并，晚到保存不得清空刚持久化的 run。

导入解析器从 workspace 重新编译 trace、重跑 runner 并逐字段比较；伪造 event/handler/source/parent/iteration/repeat/condition/day、尾声、run、计数或时间均拒绝。

继续复用 Progress V3 coordinator 的：

- 草稿、运行和完成三类写失败可见重试；
- 刷新、最近运行重播和损坏 current 原始字节保留；
- snapshot 恢复、跨标签 revision CAS 与冲突备份；
- 导出导入和家长报告的概念/运行/失败汇总。

成功保存 W2-M5 后按课程顺序解锁 W3-M1，并在家长报告加入“循环与调试综合”证据。这是单关的跨系统效果，不代表第二周系统矩阵全部满足。

## UI、正式资产与无障碍

页面延续 W2-M1～M4 已批准的明亮 3D 中国儿童绘本方向。计划通过 built-in image generation 新增两张正式 WebP：

1. 天宫信号调度台场景背景，清楚区分御马监、花果山旗台、蟠桃/瑶池/兜率宫、八卦炉和五行山尾声区域，不含文字、UI、伪字或 logo；
2. 综合状态图，覆盖五组 handler 进度、炉内七轮与原著尾声，可通过裁切表现状态且不使用伪透明棋盘格。

资产必须记录完整 prompt、工具、编辑过程、SHA-256、尺寸、slot、provenance 与原尺寸人工 QA；只有 `visual-qa-passed` 才能进入完成证据。禁止复用 legacy world-map/young-hero，禁止 CSS/div/SVG/emoji/代码绘图替代插画。

真实 Blockly SVG 在 320、390、768、1440 均需像素可见、具有离散度证据且无横向溢出。键盘能定位并修改循环次数、交换事件动作、移动金丹和替换炉内条件。静音和减弱动画只改变表现，不改变 trace、状态、天数或结果。Experience、Workspace、Scene 三层懒加载与场景资产失败均有局部可见重试；页面健康检查 fail closed。

## 开工前预算

- W2-M5 cold 路径上限：`3 * 1024 * 1024` bytes；
- entry gzip：`180 * 1024` bytes；
- homepage：`650 * 1024` bytes；
- Phaser raw：`1600 * 1024` bytes；
- scene raw：`1900 * 1024` bytes；
- W1 与 W2-M1～M4 所有既有预算不得提高；
- 单张 raster 与任务媒体总量保持现有门禁。

所有数字必须在第一项生产行为前由 RED 测试锁定。

## 可执行验收

1. 课程合同证明 W2-M5 正式注册、无 `expectedSequence`、不进入 legacy tools，并锁定 3 MiB cold 预算。
2. 合同与编译器从一张真实复合图生成 event/loop/sequence/condition trace；拒绝缺帽、重复帽、空 handler、孤立、跨容器、非互惠连接、未知块、环、重复/遗漏和边界错误。
3. runner 覆盖四个预置错误、其他错误路由/顺序、1/2/4 次循环、红眼早停、永不真安全停止、正确三匹马+五事件+七轮四十九日、尾声、确定性重放和零惩罚。
4. Progress V3 覆盖默认错误草稿、编辑清证据、同草稿并发合并、伪造拒绝、三类写失败、刷新/重播、损坏恢复、CAS、导入导出、家长报告和 W3-M1 解锁。
5. 五项目 Playwright 通过孩子可见操作覆盖失败→四次修复→成功→尾声→刷新→重播，Chromium/Firefox 键盘、320/390/768/1440、静音/减弱动画、Blockly 像素离散度、三层懒加载/asset retry、任务资产 404 与 fail-closed health。
6. unit、source/bundle contracts、asset contracts、TypeScript、production build、bundle gate、asset verify、`git diff --check` 全部使用新鲜输出记录。
7. 验证文档报告准确完成等级、证据、未验证范围与下一阻塞；任一必需证据缺失时结论必须是 `not complete`。

## 模型小队执行边界

- 主代理/Sol：产品判断、规格一致性、风险与最终独立验收；
- Terra：玩法获批后成为唯一写入负责人，按 TDD 实现和运行必要测试；
- Luna：只读核对文件、测试标签、证据矩阵与完成边界；
- 子代理不得继续派生；主代理不得直接采信子代理完成声明。

## 规格自检结果

- 无 `TBD`、`TODO`、占位要求或待选产品规则。
- 五事件、四错误、渐进诊断、正确 trace、原著尾声与完成条件互相一致。
- 尾声明确不属于孩子 canonical instruction trace，不会制造隐藏成功。
- 范围仅覆盖 W2-M5 单关；第二周系统闭环、W1 全量回归、整站验证和部署均不在完成声明内。
- shipping 资产与实现尚未生成，当前仅为书面规格待确认，W2-M5 仍是 `not complete`。
