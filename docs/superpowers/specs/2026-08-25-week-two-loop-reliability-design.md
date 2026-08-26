# 第二周业务闭环可靠性修复设计规格

## 目标与完成边界

修复第二周审计确认的两个确定缺陷：

1. `w2-m4 八卦炉脱身` 的草稿保存重试与多标签冲突没有完整可见恢复路径；
2. `w2-m5 天宫总试炼` 被漏出正式任务提示持久化与锁定判断，导致提示使用、星级和家长报告不一致。

本任务同时把散落在任务页中的正式会话任务 ID 判断收敛为一个可穷尽校验的共享能力判断，避免新增正式任务时再次漏项。

本任务不改变课程剧情、Blockly 图、正确答案、失败零惩罚、视觉资产、性能预算、奖励内容、解锁顺序或后续周玩法。最高允许报告的等级仍是 `One-level playable`；第二周奖励及后续玩法尚未形成真实跨系统效果，因此本任务完成也不能直接报告 `System loop complete`。

本任务不提交、不推送、不部署，不清理或搬迁 `codex/week-two-formal` 现有未提交现场。

## 必须保持不变的产品规则

- W2-M4 默认错误条件仍是“眼睛被烟熏红”，正确条件仍是“听见炉头声响并看见光明”，正确运行仍为七轮、四十九日和 `furnace-toppled`。
- W2-M5 仍从同一张可见 Blockly 图逐项修复四类真实错误；帮助不能编辑、运行或完成图。
- 所有错误继续保持生命、资源和星级损失为 0。
- 使用 0、1、2 个及以上不同提示层级时，星级分别为 3、2、1；重复打开同一提示不重复计数。
- 通关结果只有在会话运行和完成记录均持久化后才可显示成功。

## 方案 A：可靠性修复与共享能力判断

### 共享正式会话任务判断

新增零 UI、零运行时依赖的任务能力模块 `src/progress/executableMissionIds.ts`：

- 使用 `Record<ExecutableMissionId, true>` 声明当前所有具有 Progress V3 会话的任务；
- 导出 `isExecutableMissionId(value: string): value is ExecutableMissionId`；
- `Record` 必须在新增 `MissionSessionById` 成员而未同步能力表时产生 TypeScript 错误；
- `MissionPageContent` 使用该判断决定提示是否写入会话和是否随播放/保存锁定；
- `createMissionSession` 复用同一判断，删除其内部重复的长任务 ID 条件。

该模块只判断“是否具有正式会话”，不决定课程是否解锁、任务是否完成或使用哪种玩法。

### W2-M4 保存恢复

W2-M4 的恢复状态继续为 `none | unsaved | conflict`，但行为与 W2-M1、M2、M3、M5 对齐：

- 草稿、编译失败或运行保存失败进入 `unsaved` 后，显示“重试保存本次记录”；
- 重试成功且存在待发布运行结果时，发布该结果并开始播放；
- 重试成功但不存在待发布运行结果时，清除恢复状态、解除会话锁定，不制造新的“未保存”状态；
- 重试仍失败时继续显示 `unsaved`；重试变成 CAS 冲突时进入 `conflict`；
- `conflict` 显示“下载本页备份”和“载入其他标签页版本”；
- 载入外部版本时丢弃仅存于当前内存的待播放结果，刷新 Progress Context，清除恢复状态并解除锁定；
- 下载备份只导出当前协调器备份，不覆盖任一标签页数据。

冲突状态不得提供普通“重试”，避免旧 revision 覆盖新进度。

### W2-M5 提示、星级与家长报告

- W2-M5 的三层提示统一调用 `recordMissionHint('w2-m5', tier)`；
- 提示层级持久化到 `sessions['w2-m5'].usedHintTiers`，刷新和导出导入后保持一致；
- 同一层提示只记录一次；
- 会话保存、运行播放、恢复或通关保存期间禁用提示，防止提示写入与运行/完成证据竞态；
- Boss 结算继续只读取会话中的 `usedHintTiers`，因此一层提示得到 2 星，两层及以上得到 1 星；
- `completeMission` 的 `hintsUsed` 与家长周报读取同一持久化结果，不保留第二套页面临时计数。

## 数据与错误流

```text
孩子修改 Blockly / 打开提示
  -> ProgressContext 协调写入
  -> saved: 更新会话并继续交互
  -> unsaved: 锁定交互并显示重试
  -> conflict: 锁定交互并提供备份或载入外部版本

正确 Blockly 运行
  -> 保存 canonical trace 与 deterministic run
  -> 场景播放
  -> 根据持久化提示层级计算星级
  -> 保存 mission completion
  -> 显示成功
```

任何保存失败都不能提前播放新结果、显示成功、解锁下一关或改变星级。

## 测试先行设计

实现严格按 RED → GREEN → REFACTOR：

1. **共享能力判断 RED**
   - 所有 `MissionSessionById` 键均被识别；未知、legacy 和未来未注册 ID 被拒绝。
   - `MissionPageContent` 的正式提示分支不再出现手工 W1/W2 ID 长条件。

2. **W2-M4 组件 RED**
   - 无待运行结果的草稿保存失败，重试成功后警告消失、工作区重新可用。
   - CAS 冲突显示备份与载入按钮；载入外部版本后解除锁定。
   - 运行保存失败重试后仍只播放一次并只通关一次。

3. **W2-M5 提示组件/路由 RED**
   - 打开一个提示后 `usedHintTiers=['observe']` 持久化；重复打开不重复。
   - 保存/播放/恢复期间三层提示禁用。
   - 使用一层提示通关后保存 `stars=2`、`hintsUsed=1`；刷新和家长周报一致。

4. **真实浏览器 RED**
   - W2-M4 新增草稿写失败恢复和双标签冲突恢复路径，全部通过孩子可见按钮完成。
   - W2-M5 新增提示→修复 Blockly→通关→刷新路径，验证会话、任务星级和家长报告。
   - 浏览器测试不得使用隐藏完成写入或 `page.evaluate` 直接修改 Progress V3；只允许设置既有测试故障模式和读取结果。

## 验证矩阵

- 定向组件、Progress Context、课程与会话测试；
- W2-M4、W2-M5 定向 Playwright，包含桌面 Chromium；键盘与主路径继续覆盖 Firefox；
- 第二周五文件完整 104+新增用例浏览器矩阵；
- 全量 Vitest、TypeScript、source/bundle contracts、asset contracts；
- production build、bundle budget、asset verify 和 `git diff --check`；
- 最后重新核对 Course、Blockly、Parent/saves、UI/release 相关 completion matrix 行。

由于不修改视觉资产，视觉 provenance 只需确认现有 asset verify 未回归，不生成新资产。

## 可执行验收标准

1. W2-M4 的草稿保存失败、运行保存失败、CAS 冲突都有可见且可完成的恢复路径。
2. W2-M5 每个不同提示层级只计一次，提示数据、星级和家长周报在刷新及导出导入后一致。
3. 任务能力判断只有一个运行时事实源；新增 `MissionSessionById` 而遗漏能力注册会导致类型检查失败。
4. 所有新增测试先在未修改生产代码时以预期原因失败，再由最小实现变绿。
5. 所有既有第二周主路径、失败零惩罚、性能预算和资产门禁保持通过。
6. 最终明确报告完成等级、未验证范围和奖励闭环仍需的产品决策；不得把本次可靠性修复表述为第二周 `System loop complete`。

## 规格自检结果

- 无 `TBD`、`TODO`、占位内容或未选技术方案。
- 数据流、恢复按钮、提示计分与完成条件使用同一 Progress V3 事实源，没有第二套隐藏状态。
- 范围没有引入奖励、货币、装备、视觉或课程变化。
- 验收标准覆盖成功、失败、刷新、持久化、恢复、跨标签和家长报告。
- 与已批准 W2-M4、W2-M5 玩法规则一致，且保留 `One-level playable` 完成上限。
