# w2-m4 八卦炉脱身循环条件设计规格

## 目标与完成边界

把 `w2-m4 八卦炉脱身` 从 `expectedSequence`、`LegacyMissionBuilder` 和 `MissionTools` 兼容路径升级为独立正式任务。预选且最高允许报告的等级是 `One-level playable`；五项目真实浏览器闭环、失败与恢复、正式资产和 `3 * 1024 * 1024` bytes cold 路径证据任一缺失时必须报告 `not complete`。

W2-M5、第二周 `System loop complete`、全站 `Full-content verified`、公开部署和 `Commercial production complete` 不属于本关完成证据。进入合并前仍需补跑既有 W1 全量 Playwright。本任务不提交、不推送、不部署，也不清理 W1 或 W2-M1～M3 的未提交现场。

## 原著事实与课程边界

第六回中，悟空与二郎神赌斗变化，太上老君以金刚琢击中悟空，二郎神的细犬又将他扯倒，众圣才将其擒住。第七回中，刀砍、火烧和雷打均不能伤悟空，太上老君把他推入八卦炉；悟空钻入巽位，借风避火但被烟熏成火眼金睛。七七四十九日火候俱全后，悟空听见炉头声响、看见光明，才跳出并蹬倒八卦炉。

课程故事层保留“二郎神与老君相助擒拿”作为进入本关的因果背景，实际编程玩法集中在第七回的巽位避火、四十九日等待、开炉信号和脱身。不会把擒拿、刑罚或破坏包装成奖励，也不会让 legacy 五步顺序链冒充循环条件玩法。

## 已批准玩法：默认错误条件的真实 `repeat until`

首次进入时显示一张真实连接的 Blockly 图：

```text
被押入八卦炉
藏到巽位避火
重复直到【眼睛被烟熏红】       ← 默认错误条件
    安稳等待七日
    查看炉口
纵身跳出
蹬倒八卦炉
```

循环条件必须是连接在 `重复直到` 布尔输入槽里的真实 Blockly 条件块。提供三个互斥的故事传感器块：

1. `眼睛被烟熏红`：默认错误条件，第一轮后即为真，会让悟空过早尝试跳炉；
2. `听见炉头声响并看见光明`：正确条件，七轮、四十九日后为真；
3. `烟雾完全散去`：永不为真，用于理解错误结束条件和安全停止。

正确条件被封装为一个故事传感器积木，不要求孩子自行组合 `并且`，避免提前侵入第三周布尔组合课程。鼠标、触摸和键盘辅助控制必须修改同一个 Blockly 工作区；任何文字程序树或辅助按钮只呈现或操作这张图，不得成为第二执行源。

## 唯一事实源与图合同

独立零 UI 合同定义本关 block type、condition type、opcode、workspace draft、instruction、state、runtime event 与 diagnostic。workspace 草稿保存：

- 每个块的稳定 ID、类型、坐标和真实连接；
- 顶层 `previousId`、`nextId`；
- 循环体的真实 `parentBlockId` 与同层连接；
- 条件块连接到哪一个循环的 `conditionParentBlockId`。

编译器只读取 Blockly 当前可见图，拒绝未知块、多条顶层主链、重复或遗漏必需动作、空循环体、循环体越界、条件块孤立、多个条件接入、错误输入形状、跨容器连接、环和超出工作区边界。坐标只用于恢复布局，不决定执行结果。

编译产物包含稳定 instruction ID、真实 source block ID、parent block ID、迭代编号、累计故事天数和 condition source block ID。条件检查也必须成为 canonical trace 的显式指令，保证保存、重放、反馈和导入校验都能追溯到孩子真正连接的条件块。

## 确定性运行与状态机

状态依次为：

`captured → furnace-entered → sheltered-in-xun → furnace-waiting → furnace-open → escaped → furnace-toppled`。

运行语义如下：

1. 执行入炉与巽位避火；
2. 在每次循环开始时执行可见条件块；
3. 条件为假时，执行“等待七日”和“查看炉口”，累计一轮和七日；
4. 第七轮观察后，状态转为 `furnace-open`；下一次条件检查为真并退出循环；
5. 只有 `furnace-open` 状态允许“纵身跳出”和“蹬倒八卦炉”。

`眼睛被烟熏红` 在第一轮后变真，退出循环后会触发 `escape-precondition`。诊断必须把儿童反馈和焦点落到导致过早退出的条件块，而不是只责怪后面的跳炉动作。

`烟雾完全散去` 永不为真。运行器采用确定性的八次条件检查安全上限；超过七个有效等待轮次后拒绝继续累加故事天数，产生 `condition-never-met`，停止播放且保留完整 trace。安全上限不是隐藏成功条件，也不得改变正确程序的七轮结果。

所有失败的生命、资源和星级损失固定为 0。正确完成只能来自可见图编译出的 trace 到达 `furnace-toppled`，且运行 session 成功保存、正式场景资源就绪并播放结束后才能触发通关保存。

## 儿童反馈与帮助边界

反馈使用可理解的故事语言：

- 过早退出：`眼睛变红只说明烟很大，炉门还没有打开。换一个真正表示可以脱身的条件。`
- 永不退出：`这个条件一直没有发生，循环已安全停下。想想悟空听到和看到了什么才跳出炉门。`
- 结构错误：说明缺少条件、循环体或连接位置，并聚焦真实问题积木。

帮助分为观察、思考和局部提示，只能解释当前状态、条件真假和问题所在；不得添加或替换条件块、调整连接、透露完整有序程序、运行或完成任务。

## Progress V3、恢复与跨系统效果

`sessions['w2-m4']` 保存 workspace、canonical lastTrace、deterministic lastRun、totalRuns、compile/runtime failures、usedHintTiers、conceptFailures、lastRunAt 和 savedAt。workspace 修改保留累计学习证据，但清除过期 trace 与 run。

导入解析器必须从 workspace 重新编译 trace、重跑 runner 并逐字段比较；伪造 opcode、condition provenance、parent provenance、迭代、天数、run 结果、计数或时间均拒绝。继续复用并重新验证 W2-M3 的同草稿 in-flight save 合并模式，防止晚到的重复草稿保存清空刚写入的运行证据。

现有 Progress V3 coordinator 继续负责：

- 草稿、运行和完成三类写失败的可见重试；
- 刷新、最近运行重播和损坏 current 的原始字节保留；
- snapshot 恢复、跨标签 revision CAS 和冲突备份；
- 导出导入和家长报告中的运行、失败、循环条件概念；
- 完成本关后解锁 W2-M5，但不把 W2-M5 标记为正式或完成。

任何保存失败发生时都不得播放未持久化结果、显示通关或提前解锁。

## UI、正式资产与无障碍

页面延续 W2-M1～M3 已批准的明亮 3D 儿童绘本风格，不重新定义全站视觉方向。计划新增或编辑两张 built-in image generation 正式 WebP：

1. 八卦炉内部场景背景，明确表现巽位、炉火、烟和炉门，但不含文字、伪字或 UI；
2. 炉内等待到开炉脱身的状态图或透明角色状态资产，可表现七轮进度而不复制七张近似大图。

生成前先核对已有 W2 资产是否可以 provenance-verified 地复用；所有 shipping asset 必须记录 prompt/source、编辑过程、SHA-256、尺寸、slot、provenance 和原尺寸人工 QA，达到 `visual-qa-passed` 才进入完成证据。禁止 legacy world-map/young-hero、CSS/div/SVG/emoji/占位画面。

真实 Blockly SVG 在 320、390、768、1440 宽度均需像素可见、具有离散度证据且无横向溢出。键盘可以选中和替换真实条件块、删除并恢复连接；鼠标、触摸和键盘产生相同 trace。静音和减弱动画只改变呈现，不改变条件、轮次、状态或结果。Experience、Scene、Workspace 三层懒加载与任务资产失败均提供局部可见恢复入口，页面健康检查 fail closed。

## 开工前预算

- W2-M4 cold 路径上限：`3 * 1024 * 1024` bytes；
- entry、homepage、W1、W2-M1～M3 的既有预算不得提高；
- 单张 raster、任务媒体总量和严格 visual asset gate 保持现值；
- 在实施第一项行为前写下预算 RED，不能事后补记。

## 可执行验收

1. 课程合同证明 W2-M4 正式注册且无 `expectedSequence`，不进入 legacy tools；W2-M5 仍保持 legacy。
2. 编译器从真实条件输入、循环体和主链生成稳定 trace；条件替换、断开、删除、跨容器和非法形状立即改变结果或被拒绝。
3. 运行器覆盖默认早退、永不满足、缺条件、空循环体、错误动作位置、正确七轮四十九日、确定性重放、真实 condition/source provenance 和零惩罚。
4. Progress V3 覆盖默认错误草稿、编辑保存、同草稿 in-flight 合并、运行证据、刷新、重播、伪造拒绝、三类写失败、损坏恢复、CAS、导入导出、家长报告和 W2-M5 解锁。
5. 五项目 Playwright 使用孩子可见操作覆盖默认失败→定位条件→鼠标/键盘替换→七轮成功→刷新→重播，并覆盖 Chromium/Firefox 键盘、320/390/768/1440、静音/减弱动画、Blockly 像素离散度、三层懒加载/资产失败、任务资产 404 与 fail-closed page health。
6. unit、bundle/source contract、asset contract、TypeScript、production build、bundle gate、`git diff --check` 和专项 Playwright 全部使用新鲜输出记录。
7. 验证文档明确记录达到的完成等级、证据、未验证范围和下一阻塞；任一必需证据缺失时结论必须是 `not complete`。

## 规格自检结果

- 无 `TBD`、`TODO` 或占位要求。
- 正确条件、错误条件、安全上限、循环检查时机、七轮四十九日和完成状态互相一致。
- 范围只覆盖 W2-M4 单关，不实现 W2-M5、第二周系统闭环、公开部署或整站验证。
- shipping 资产尚未生成，因此当前仍是 `Design complete` 之前的书面待确认状态，不能报告关卡完成。
