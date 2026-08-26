# W2-M5 天宫总试炼验证记录

## 结论与边界

`w2-m5 天宫总试炼`达到 **One-level playable**。孩子从一张真实、可见的 Blockly 复合图开始：默认的天马次数、齐天事件路由、金丹顺序和八卦炉条件各有一处真实错误。每一次运行都由当前连接图重新编译；前一个实际阻塞点以真实积木定位，修复后才进入下一类错误。正确图运行出三次天马循环、五道事件、七轮四十九日和 `escaped`，在运行存档成功、场景资源 ready、原著尾声播放完毕后才保存通关。

这不是第二周 `System loop complete`、全课程 `Full-content verified`、公开部署或商业生产完成。既有 W1 全量 Playwright、第二周跨关系统矩阵、线上 404/性能/隐私与跨设备恢复仍没有本记录覆盖；它们均为 **not complete**。本次没有 commit、push、deploy、reset、clean 或清理既有现场。

## 真实玩法、来源与状态

- 只有 Blockly workspace 的稳定 block ID、互惠 previous/next、parent、handler、循环次数和条件插槽可生成 instruction trace；课程数组、坐标、React 显示和 legacy `expectedSequence` 都不是答案源。
- 复合程序依序派发御马监、花果山、齐天授号、蟠桃会与八卦炉五个外界信号。正确 trace 有 `caredHorses=3`、`furnaceRounds=7`、`elapsedDays=49`，尾声是独立 `canon-epilogue`，其 `sourceBlockId=null`，不参与孩子程序的成功判断。
- 失败固定为生命、资源、星级 `0/0/0`。循环次数、事件路由、处理器顺序、金丹前置、炉内条件、永不成立条件和不完整 trace 都保存为可复核诊断。
- 工作区编辑保留累计学习统计，但语义变更会清除过期 trace/run；仅布局变更在重新编译 trace 完全相同的前提下保留最新运行。相同草稿的 in-flight 保存会合并，晚到的保存不能覆盖刚持久化的运行。
- Progress V3 对 W2-M5 保存 `programStructure`、`loopCount`、`eventRouting`、`handlerSequence`、`sequencePrecondition`、`loopCondition`、`conditionNeverMet`、`completeness` 八个精确桶。`compileFailures=programStructure`；`runtimeFailures` 只等于其余七个运行桶之和，因此不会把一次运行错误双算。
- 三层提示使用统一正式会话路径；每个层级只记录一次。浏览器用一层“观察提示”完成 Boss 后持久化 `usedHintTiers=['observe']`、`stars=2`、`hintsUsed=1`，刷新、家长周报和导出导入保持一致。

## 新鲜自动化证据

| 门禁 | 新鲜结果 |
| --- | --- |
| `npm run test:unit` | 92 files、926 tests 通过。 |
| source/bundle contracts | 150/150 通过；包含 W2-M4 恢复证据和 W2-M5 提示/星级证据的 fail-closed 门禁。 |
| asset contracts | 40/40 通过。 |
| `npm run typecheck` | 通过。 |
| `npm run verify:bundle` | 通过；entry static JS `119.6 KiB / 180 KiB gzip`，保守首页总量 `450.8 KiB / 650 KiB`。W2-M5 cold 上限固定为 `3 MiB`，由浏览器 cold 用例在所有项目实际断言。 |
| `npm run verify:assets` | 通过；W2-M5 两张批准 WebP 共 `507,768 / 1,310,720 bytes`，均已通过 `visual-qa-passed`。 |
| `npx playwright test e2e/week-two-heavenly-signal-boss.spec.ts` | 22/22 通过，5 个既有项目均按其 grep 配置收集并执行。 |
| 第二周五文件完整 Playwright | 106/106 通过（5.2 分钟），包含新增 W2-M4 草稿/冲突恢复和 W2-M5 提示计分闭环。 |
| `git diff --check` | 通过。 |

W2-M5 资产 SHA-256：

- `signal-dispatch-background.webp`：`7de0fd49cf2bf49af546e8a8e6302179ee4fc2fe798b64d379015ee820bac21d`
- `heavenly-boss-states.webp`：`646fbeb3f965ff5a6b868bf0d6f613329c485bd658489e8b4556db8099168bc8`

## 五项目浏览器证据

- 主路径 `@boss-full` 与 cold/404 `@boss-cold`：5 个项目各通过 2 条，共 10/10：1440 Chromium、768 WebKit、390 Chromium、1440 Firefox、320 Chromium。
- 键盘：1440 Chromium 与 1440 Firefox 的 `@boss-keyboard` 共 2/2，通过相同可见辅助控件修改同一 Blockly 图并保存 canonical trace。
- desktop Chromium 扩展覆盖共 13/13：主路径、键盘、三类写入失败、cold、损坏恢复、跨标签 CAS、导出导入与家长报告、503 资产恢复、Experience/Scene/Workspace 三层懒加载故障。
- `@boss-parent` 通过真实提示按钮写入一层提示，再修复四类可见 Blockly 错误；通关得到 2 星/1 次提示，刷新后家长周报显示第二周 14 星/1 次提示，导出导入恢复完全相同的 mission 与 session。
- 三类保存失败都要求可见重试；草稿未保存时运行被锁，运行未保存时不播放结果，通关未保存时不解锁。损坏 current 原字节保存到 corrupt 槽后从 snapshot 恢复。CAS 冲突不覆盖外部版本，并提供本页备份下载和载入外部版本。
- 场景首次 503 时，成功弹窗不出现；可见重试带 query 再取同一受管资源，`data-scene-ready=true` 后才允许已存运行完成。三层 lazy chunk 503 各自显示局部 alert 与重载入口，未受影响部分仍可见。
- 每个专项页面均保持原始 console/page/request/HTTP 健康事件数组为空。缺失 W2-M5 raster 用真实图像 `Accept: image/webp` 请求得到 404；无图像 Accept 的 Vite SPA fallback 不代表资源存在，未被作为资产成功证据。

## RED 到 GREEN 审计

1. 预算、正式路由、零 UI 合同、复合 compiler、Progress session、workspace/scene/Experience 和 E2E 均先以缺少常量、模块或行为断言失败建立测试，再做最小实现。
2. 条件语义由 block `type` 而非随机 Blockly ID 驱动；回归测试用随机 ID 仍分别得到红眼、炉门开启和永不成立的确定性结果，并保存 `conditionSourceBlockId`。
3. parser 的三态编辑合同：零运行、完整 trace/run/时间、以及编辑后有累计次数但当前证据全清除；任一半套 evidence、伪造 event/condition/epilogue/run 或新增字段都会被拒绝。
4. 同草稿竞态测试先固定保存尚未完成时的重复编辑；GREEN 后同一 serialized draft 只共享一次保存，运行不被晚到草稿清空。草稿写失败的可见 retry 保留同一修复图，未发布 run。
5. 新增恢复/CAS/lazy/asset E2E 首轮 RED 暴露 W2-M5 缺少 corrupt 注入、冲突下载/载入入口和三层局部 boundary；按 W2-M3 已验证模式窄接后通过。cold 用例另发现测试漏传图像 Accept，根因是 Vite fallback 返回 HTML 200；补成真实图像请求后 404 门禁通过。
6. 最终审查的两项 RED：原 validate 只计全局 type，孤立 action/loop/额外条件插槽可逃逸；并且 Boss 运行诊断只落入泛化桶。现要求除五个事件帽外每个 action/loop/condition 都被唯一 handler/container 遍历、handler 归属一致；并以七个 runtime 概念桶与严格 parser 总和验证 GREEN。
7. 本次提示回归先 RED：W2-M5 打开提示后 `sessions['w2-m5']` 仍不存在或 `usedHintTiers=[]`，证明任务页手工 ID 列表漏掉 Boss。新增可穷尽 `ExecutableMissionId` 能力判断并同时替换提示记录/锁定白名单后，路由/App 49/49 和 Boss 家长浏览器闭环 1/1 通过。

## 完成矩阵审计

- **Blockly：满足本关 One-level 可玩闭环。** 可见图生成可执行 trace；默认错误、断开/孤立结构、错误条件和顺序均有真实反馈；刷新恢复同一可执行 trace。浏览器验证的是可见修复控件与键盘操作同一 workspace，**没有把自由拖拽积木表述为已验证证据**。
- **Parent / saves：满足本关相关项。** 保存前门禁、刷新、重播、损坏源保留、snapshot、CAS、导出导入、严格重编重放、概念统计、提示/星级一致性及家长“循环与调试综合”均有 unit 或浏览器证据。
- **UI / release：满足本关本地证据，不满足发布项。** 五目标项目、键盘、静音/减弱动画语义、三层 lazy、任务资产 404、3 MiB cold、正式 asset provenance 和本地 health 都有证据；线上部署、生产 CDN 404、公共性能、儿童隐私运营与跨设备恢复没有证据。
- **Course / 30 levels：不满足系统或内容级别。** W2-M5 成功后可推导 W3-M1 解锁，且仅在通关持久化后成立；但一关的证据不能外推为第二周系统循环或 30 关验证。

## 现场与残余风险

- 验收现场仍是 `codex/week-two-formal`，HEAD `f0b07ec5cff05b7b3ee5ea94961cf7c015170b97`，并保留 W1/W2-M1～M4 的既有未提交改动。
- 残余阻塞：第二周还没有会改变后续选择的真实奖励/掌握度效果；W1 全量 Playwright、第二周 System loop、30 关 Full-content、部署、线上监测以及商业发布矩阵均为 **not complete**。
