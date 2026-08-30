# W3-M5 高老庄总试炼状态机验证

## 结论与现场边界

W3-M5「高老庄总试炼」达到 **One-level playable**。这是一关真实 Blockly 单图故事状态机：孩子从同一张保存的可见图、同一个“运行整套试炼”入口开始，逐项修复错误并从头运行；它不是 legacy 顺序关卡，也不是四个可独立完成的小关。

- 当前 HEAD 为 detached `021b551`。本次工作树仍有未提交改动；未 commit、push 或 deploy。
- `npm ci` 已在授权下完成，`package-lock.json` 的 SHA-256 未改变。
- 本地第三周五关统一浏览器闭环已有新鲜证据；但严格的第三周 `System loop complete` 仍为 **not complete**：completion matrix 的 `UI / release` 行要求公开部署后的响应式与保存恢复证据，而 public deployment 既未获授权也未验证。
- 30 关、`Full-content verified`、`Commercial production complete` 与 public deployment 均为 **not complete**。全站长跑仍有 25 项 unexpected 失败，不能据此宣称全站完成。

## 玩家可见行为与唯一事实链

- 默认有效图含四个按顺序阻塞的真实错误：求助条件过宽；第二道伪装闸把外形当作真实身份；云栈洞 THEN/ELSE 动作接反；归队组合条件为 OR 而非 AND。运行时只显示第一个真实阻塞点，孩子修复后必须重新完整运行才会遇到下一个。
- 同一张连接图从庄口求助推进至翠兰伪装、云栈洞对话、八戒归队和第三周复盘完成。练习卡不推进原著状态；固定输入队列与原著回放只是场景数据，不能决定答案或成功。
- 唯一事实链为：`visible Blockly workspace → versioned serialized draft → compiler → workspace-bound canonical trace → deterministic state-machine runner`。保存的可见图重新编译、重新运行，才决定条件、分支连接、动作、状态转移、失败与成功；`expectedSequence`、React 状态、坐标、动画、隐藏前缀或测试注入都不能决定成功。
- 火眼金睛只在有效失败快照保存成功后开放，只展示本次已保存的失败事实，不编辑、运行、重排、泄露答案或完成关卡；所有失败均不扣生命、资源或星级。

## 持久化、进度与跨系统结果

- Progress 已提升到 revision 7。W3-M5 的 draft、run、observation 与 completion 按保存优先顺序写入；任一写入失败均 fail closed，并保留对应的本地重试入口。刷新、重开、导出导入、CAS 冲突和损坏恢复都以保存图重新编译、重放和校验，不只恢复积木外观。
- 所有旧 W3-M5 完成保留为 `legacy-replay-only`，绝不伪造 workspace、trace、run、session 或 formal proof。完整正式重玩可升级为 `formal-v3`，同时保留历史记录。
- 新正式证明要求 W3-M4 `formal-v3` 前置；合规的 W3-M5 `formal-v3` 会持久解锁 W4-M1，并向家长报告写入不泄题的 Boss 综合摘要。它不新增货币或装饰奖励。

## 新鲜自动与浏览器验证

| 项目 | 结果 |
| --- | --- |
| 基础门禁 | 最终 `npm run test:unit` exit 0，**126 files / 1292 unit**；source/bundle contracts **180**；asset contracts **49**。`typecheck`、`build`、`verify:bundle`、`verify:assets`、`git diff --check` 均通过。 |
| 构建与包体 | build 转换 **4779 modules**；entry **143.8 KiB gzip**。W3-M5 closure **1319.0 KiB raw / 358.4 KiB gzip**。 |
| 正式素材 | 两张 W3-M5 WebP 合计 **384,622 bytes**：background **93,974**、states **290,648**。manifest 记录并核验其 SHA-256、尺寸、内建 image generation provenance、活跃场景槽位与原尺寸 visual QA：`week-three-boss-background.webp` 为 `62de44e39f0978dc03933629e65942cf29c2b06c09bd3d73e79a3ce9edae481e`，`week-three-boss-states.webp` 为 `dc3905b48fa147da497b7260e22f62beed3b617de31dd3dd757a31116f03a4f1`。 |
| W3-M5 五项目 Playwright | **28/28 passed**，retries **0**：desktop Chromium **17**、tablet WebKit **2**、mobile Chromium 390 **3**、desktop Firefox **3**、narrow Chromium 320 **3**。五项目各自的 default、failure、success 截图均已目视检查。 |
| W3-M1～M5 本地统一矩阵 | 最终当前工作树 **126/126 passed**，约 **6.0 分钟**。这是第三周五关本地统一闭环的新鲜浏览器证据。 |

## 全站长跑与完成边界

全站 JSON `/tmp/w3m5-full-e2e.json` 记录：**418 total，393 expected，25 unexpected，0 flaky**，耗时约 **29.5 分钟**。25 项全部属于 shared/W1，W2/W3 没有失败：commercial legacy lazy **1**、homepage budget **5**、dragon W1-M1 cold **5**、four seas storage **1** 与 cold **5**、ruyi cold **5**、underworld storage **2**、week-one-system Firefox **1**。该长跑发生在最后一项隔离的 ParentAccess 有效凭据轮换安全修复之前；修复后已重新通过 1292 项单元测试、typecheck、build、bundle/asset 门禁和当前工作树 W3-M1～M5 统一 126/126，但没有再次运行 418 项全站长跑，因此这组全站数字是紧邻最终修复前的审计基线，不冒充最终工作树全站绿灯。

| Completion matrix 相关层级 | 已核实范围 | 结论 |
| --- | --- | --- |
| W3-M5 单关 | 真实输入、状态转移、保存/刷新/恢复、失败零惩罚、家长摘要、W4-M1 解锁、素材、五项目浏览器与截图证据均已覆盖。 | **One-level playable**。 |
| 第三周本地五关 | W3-M1～M5 统一矩阵 126/126 通过。 | 本地统一闭环已有新鲜证据。 |
| 第三周严格系统 | `UI / release` 的 public deployment、部署后响应式和保存恢复尚未授权或验证。 | **System loop complete: not complete**。 |
| 全站 / 30 关 / 商业发布 | 全站 25 项 unexpected 失败仍在；且没有 public deployment 证据。 | **not complete**。 |

## 残余风险与下一阻塞

- 当前证明是本地确定性保存与防伪证据，不是账号同步或服务端签名。
- 要提高第三周完成等级，下一项关键证据是获得部署授权后，在公开版本实际验证 completion matrix 的 `UI / release` 路径（含响应式、保存恢复、运行健康等）。
- 在 shared/W1 的 25 项全站失败被分别定位、修复并通过全站重跑前，不能提升为全站/30关 `Full-content verified` 或商业完成。
