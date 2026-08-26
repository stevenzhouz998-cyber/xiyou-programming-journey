# W3-M1 庄上求助与火眼金睛验证记录

## 结论

**W3-M1: One-level playable。**

此结论只覆盖一个完整 W3-M1 真实浏览器循环：同一张可见 Blockly 图的儿童输入、默认失败、主动观察、修复、双情境运行、持久化、刷新重放、恢复与跨系统家长摘要。主代理随后重新运行的 W3 专用五项目矩阵为 **24/24 通过**，并目视检查五项目的 **15** 张原始截图（每项目 Blockly/failure/success 各一张），包含修正后的 320 宽度无重叠画面及严格浏览器健康检查。

这不是全站完成声明。此前最终审计的全站 `npm run test:e2e` 为 **316 total / 292 passed / 24 failed / 24.5m**；24 项均为未解决的 shared/W1 路径、无 W3-M1 失败。它不否定单关已满足 One-level 的真实循环定义，但仍阻断 System loop complete、Full-content verified、Commercial production complete 与 public release。

## 本次执行环境与边界

- worktree：`/Users/macmini-zz/.codex/worktrees/3abe/少儿编程学习网页`
- branch：`codex/week-two-formal`
- HEAD：`f0b07ec5cff05b7b3ee5ea94961cf7c015170b97`
- 保留 W1/W2 既有的大型未提交现场；本文件是本任务唯一新增的证据文档。
- 未执行 `commit`、`push`、`deploy`、`reset`、`clean`、worktree 创建/切换，也未修改主工作树。

## 新鲜命令结果

| 命令 | 退出码 | 结果 |
| --- | ---: | --- |
| `npm test` | 0 | Vitest **100 files / 1083 tests** 通过；source/bundle contracts **154/154** 通过；asset contracts **43/43** 通过。 |
| `npm run typecheck` | 0 | `tsc --noEmit` 通过。 |
| `npm run build` | 0 | Vite production build 通过。 |
| `npm run verify:bundle` | 0 | source/bundle contracts **154/154**、生产 build 与 bundle gate 通过。 |
| `npm run verify:assets` | 0 | 八组媒体均通过；W3 manor-help 为 **2 files / 389,422 bytes / 1,310,720-byte** 任务上限。 |
| `W3 Playwright` | 0 | 最终新鲜专用矩阵：**24/24**（desktop 15、tablet 2、mobile 390 2、Firefox 3、narrow 320 2）；15 张原始截图已目视检查，含修正后的 320 宽度无重叠；健康检查通过。 |
| `npm run test:e2e` | **1** | 此前最终全站审计：**316 total / 292 passed / 24 failed / 24.5m**；发生在最终 W3 视觉/无效路径微调之前，失败均为下列仍未解决且与 W3 无关的 shared/W1 类别，不能描述为当前全站全绿。 |
| `git diff --check` | 0 | 无空白错误。 |
| `git status --short --branch`、`git rev-parse HEAD` | 0 | 如上分支与 HEAD；工作树有既有未提交 W1/W2/共享变更。 |

### 此前全站 Playwright 的完整失败清单（不阻断单关，阻断更高等级）

24 个失败均不属于 `e2e/week-three-manor-help-condition.spec.ts`。下表保留完整清单，而不是将全站失败误写为 W3 失败：

| 项目 | 失败用例 |
| --- | --- |
| desktop Chromium 1440×1024 | MissionTools 503 legacy story/objective fallback；homepage transfer 预算；Dragon Palace W1-M1 cold；Four Seas draft-save 可见重试；Four Seas W1-M1/W1-M2/W1-M3 cold；Ruyi W1-M2 cold；advanced W1-M4 draft raw/revision；advanced equipment save alert。 |
| tablet WebKit 768×1024 | homepage transfer 预算；Dragon Palace W1-M1 cold；Four Seas W1-M1/W1-M2/W1-M3 cold；Ruyi W1-M2 cold。 |
| mobile Chromium 390×844 | homepage transfer 预算；Dragon Palace W1-M1 cold；Four Seas W1-M1/W1-M2/W1-M3 cold；Ruyi W1-M2 cold。 |
| desktop Firefox 1440×1024 | homepage transfer 预算；Dragon Palace W1-M1 cold；Four Seas W1-M1/W1-M3 cold（W1-M2 单项在限内，但该用例仍失败）；Ruyi W1-M2 cold。 |
| narrow Chromium 320×844 | homepage transfer 预算；Dragon Palace W1-M1 cold；Four Seas W1-M1/W1-M2/W1-M3 cold；Ruyi W1-M2 cold。 |

数目为 desktop 8 + tablet 4 + mobile 4 + Firefox 4 + narrow 4 = **24**。已知数值包括 homepage **761,452 > 665,600 bytes**、Dragon Palace W1-M1 **2,839,416 > 2,621,440 bytes**。这些 shared/W1 问题尚未修复；本任务没有写入它们。

## W3-M1 专用可执行证据

`npx playwright test e2e/week-three-manor-help-condition.spec.ts --list` 确认五个已配置项目的矩阵为 **24** 项；主代理最终新鲜运行得到 **24/24 通过**。此前全站审计也没有列出任何 W3-M1 失败。

| 项目 | W3 运行数 | 覆盖 |
| --- | ---: | --- |
| desktop Chromium 1440×1024 | 15 | 完整儿童可见路径、键盘、草稿/运行/观察/完成四类写故障、motion/mute、CAS 外部写入、损坏恢复、家长报告/导入导出、cold、asset 与三层 lazy fault。 |
| tablet WebKit 768×1024 | 2 | 完整路径与 cold/404。 |
| mobile Chromium 390×844 | 2 | 完整路径与 cold/404。 |
| desktop Firefox 1440×1024 | 3 | 完整路径、键盘修复、cold/404。 |
| narrow Chromium 320×844 | 2 | 完整路径与 cold/404。 |
| 合计 | **24/24** | 配置的五项目 W3 矩阵；全部通过。 |

### 玩家真实输入与唯一事实链

专用单元、source contract 和浏览器矩阵覆盖一张真实可见 Blockly 图：默认条件“口信提到了高老庄”先运行，`canon-gaocai-help` 的 true/then 表面通过，`practice-manor-directions` 也错误为 true/then，从而失败；孩子主动点击“火眼金睛·条件观察”后，图不被改写，再把同一个条件块改为“口信是在明确请求降妖帮助”。修复后的同图产生 canonical true/then 与 practice false/else，保存成功后才播放、写完成并刷新重放。

执行输入只有 `visible Blockly workspace → serialized draft → compiler → canonical trace → deterministic runtime`；source contract 同时拒绝 `expectedSequence`、`LegacyMissionBuilder`、`MissionTools` 和浏览器中直接写入 `missions['w3-m1']` 的绕行。

专用的 24 项真实浏览器清单覆盖默认失败、主动观察、图不变、修复、双情境成功、持久化、刷新/重播；desktop 覆盖键盘、muted/reduced-motion、四类保存失败重试、损坏 current 原文/合法 snapshot、跨标签 CAS、export/import、parent report、asset/三层 lazy 失败。`test-results/` 是 `.gitignore` 忽略的运行产物：本次其中保留五个项目各三张 W3 原始截图（Blockly、failure、success），即 **5 × 3 = 15** 张；主代理已目视检查，修正后的 320 宽度没有重叠，不加入版本控制。

### 保存、恢复、能力与家长边界

unit 100 files/1083 tests 和 desktop W3 Playwright 路径验证以下行为：

- 草稿、运行、观察审计、完成四类保存失败都保持未发布状态并提供可见重试；完成保存失败时 W3-M2 保持锁定、formal proof 不出现。
- 每次观察使用保存不可变的历史 workspace；导入时必须从该历史图重编译、重放，并与精确 failure snapshot 和 stable ability 一同校验。观察只读取已保存失败快照；同 snapshot 多次看只记一次审计，编辑图后失效；观察不改 Blockly、trace、scenario result、星级或完成状态。
- W2-M4 已持久化完成才获得能力，W2-M5 已持久化完成才稳定解锁；W2-M5 保存失败不能稳定解锁。家长报告只显示稳定能力、一次观察、formal proof、周运行摘要和导入导出恢复，不展示口信内容或完整答案 trace。
- Progress V3 revision 3 解析从 draft 重编译、重放；覆盖 export/import、formal proof、CAS 外部冲突、corrupt raw 下载保留与合法 snapshot 恢复。失败路径统一为 **zero penalty**（生命、资源、星级均不扣）。

上述 fault 注入是测试专用 synthetic fault；它只能证明本地 JSON 记录的一致性与 recovery 行为，并非密码学防伪保证。

## 预算与资产

- bundle gate：W3 `WeekThreeManorHelpExperience` closure 为 **1,224.6 KiB raw / 338.2 KiB gzip**，低于固定 **3 MiB** cold-path 上限；entry、home、Phaser 与既有门限也由 `verify:bundle` 通过。
- W3 媒体合计 **389,422 bytes**，低于 `MAX_MISSION_MEDIA_BYTES = 1,310,720 bytes`；单图也低于 512 KiB raster 上限。
- `manor-help-background.webp`：**197,682 bytes**，SHA-256 `0464a6c9038f79cfe7ddf61a4d3e4272d41d74eef920921686922227620aa4d2`，**1672×941**，无 alpha。
- `manor-message-states.webp`：**191,740 bytes**，SHA-256 `6a27fb45bb269146b4bf08182d872a09b4dc3488f267ee04032b030c2b2cab41`，**1672×941**，有 alpha。
- manifest 两行均记录为 OpenAI built-in image_gen、对应 W3M1 prompt、`WeekThreeManorHelpScene` slot、provenance verified、`visual-qa-passed`；`verify:assets` 已复核文件、hash、尺寸、slot、视觉 QA 和预算。

## Completion matrix 审计

| 相关行 | 当前证据 | 矩阵结论 |
| --- | --- | --- |
| Course / 30 levels | 仅 W3-M1 被正式化；W3-M2～W3-M5 保持 legacy。 | 不满足 System loop complete，也不满足 Full-content verified。 |
| Blockly | 最终 24/24 五项目矩阵加 source contract 覆盖可见图→trace、非法形状反馈、保存后刷新与编辑。 | 满足 W3-M1 的 One-level playable；不能外推为全站 Blockly system loop。 |
| Parent / saves | 专用 session、迁移、四类写失败、CAS、corrupt snapshot、export/import、家长摘要均有 unit/browser 覆盖。 | W3-M1 依赖路径有证据；矩阵整行及全产品的 PIN/works/clear 不能由一关外推。 |
| UI / release | 320/390/768/1440、Chromium/WebKit/Firefox、keyboard、mute/reduced-motion、asset/lazy/404、3 MiB W3 budget 有证据；320 截图已复核无重叠。 | 满足本关 UI loop 所需证据；public deployment 未运行，且全站 browser gate 仍失败，故不满足 release/system/commercial 门槛。 |

## 明确排除与剩余风险

- W3-M2～W3-M5 仍是 legacy；**third-week System loop complete：not complete**。
- **Full-content verified：not complete**；**Commercial production complete：not complete**。
- public deployment 未运行；没有 commit、push 或 deploy。
- `test-results/` 与 HTML report 为忽略输出，不作为版本化证据；浏览器的已保存截图是本地 QA 辅助物。
- 当前工作树还有大量既有未提交 shared scene 改动，必须由后续整合者谨慎处理，不能把本文件新增误解为干净交付。
- asset/chunk retry 的默认恢复是页面 reload，因为 rejected module cache 无法在同页可靠重新加载；这仍是体验风险。
- 本地 Progress JSON 的严格解析、防伪拒绝与 CAS 只提供内部一致性，不是加密签名或服务端安全保障。

## 下一阻塞

先修复本报告列出的 **24** 个 shared/W1 全站 Playwright 失败并重新运行全量门禁；同时把 **W3-M2** 升级为下一位真实条件能力消费者，才能开始建立第三周的真实 system loop 证据。
