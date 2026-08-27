# W3-M2 变化高翠兰双闸门验证记录

## 结论

**W3-M2：One-level playable。**

该结论只覆盖 `w3-m2 变化高翠兰` 的一个完整真实浏览器闭环：孩子在同一张可见 Blockly 图中运行默认错误条件，保存失败证据，主动使用稳定解锁的“火眼金睛·条件观察”，把第二道条件改为真实身份判断，经 `true/then → false/else` 到达显出本相与妖怪逃走，并验证持久化、刷新重播、四类写失败、跨标签冲突、损坏恢复、导出导入、家长摘要、键盘、响应式、减少动态、静音、素材和三层懒加载恢复。

这不是第三周或全站完成声明。W3-M3～W3-M5 仍是 legacy；第三周 `System loop complete`、`Full-content verified`、`Commercial production complete` 与 public deployment 均为 **not complete**。

## 执行环境与安全边界

- worktree：`/Users/macmini-zz/.codex/worktrees/3abe/少儿编程学习网页`
- branch：`codex/week-two-formal`
- 起始及当前 HEAD：`4503b97a8b00ad4b12107c323a88dd6dbb142d02`
- upstream：`origin/codex/week-two-formal`
- 所有写入均留在上述保护 worktree；未修改 `/Users/macmini-zz/Documents/少儿编程学习网页` 主工作树。
- 未执行 commit、push、PR、deploy、reset、clean 或 worktree 创建/切换。

## 最终新鲜门禁

| 命令 | 结果 |
| --- | --- |
| `npm test` | exit 0；Vitest **107 files / 1158 tests**，source/bundle contracts **160/160**，asset contracts **44/44**。 |
| `npm run typecheck` | exit 0。 |
| `npm run build` | exit 0；Vite 生产构建完成，4754 modules transformed。 |
| `npm run verify:bundle` | exit 0；entry **130.7 KiB gzip / 180 KiB**，homepage **469.1 KiB / 650 KiB**，W3-M2 closure **1247.0 KiB raw / 341.9 KiB gzip / 3 MiB**。 |
| `npm run verify:assets` | exit 0；W3-M2 **2 files / 522,452 bytes / 1,310,720 bytes**，全部 `visual-qa-passed`。 |
| `npx playwright test e2e/week-three-cuilan-boolean.spec.ts --reporter=line` | 最终版本五项目 **24/24 passed**，约 1.3 分钟。 |
| W2-M1～M5 + W3-M1～M2 统一正式关回归 | **154/154 passed**，约 7.5 分钟；该次运行发生在最后一轮仅涉及 W3-M2 Experience/E2E 的补强之前，W3-M2 最终版本另由上述 24/24 覆盖。 |
| `npm run test:e2e` | **315/340 passed，25 failed，25.5 分钟**；运行发生在最后一轮 W3-M2 同页设置冲突与 E2E 证据补强之前，失败列表没有 W3-M2。 |
| `git diff --check` | exit 0。 |

## W3-M2 浏览器矩阵

| 项目 | 数量 | 覆盖 |
| --- | ---: | --- |
| desktop Chromium 1440×1024 | 15 | 完整失败→观察→修复→正式完成→刷新重播；键盘；draft/run/observation/completion 四类 fault；真实 motion/mute parity；CAS；corrupt 原文下载与 snapshot；parent export-import；cold/404；asset retry；Experience/Scene/Workspace 三层 lazy failure。 |
| tablet WebKit 768×1024 | 2 | 完整路径、cold/404。 |
| mobile Chromium 390×844 | 2 | 完整路径、cold/404。 |
| desktop Firefox 1440×1024 | 3 | 完整路径、键盘、cold/404。 |
| narrow Chromium 320×844 | 2 | 完整路径、cold/404。 |
| 合计 | **24/24** | 五项目全部通过；每个独立 Page 均有 raw browser-health 空数组断言。 |

W3-M2 E2E source contract 使用 TypeScript AST 拒绝常见隐藏成功与健康证据篡改，包括 direct/alias/destructure/Object.assign/Reflect 写入、非内联 browser callback、W3-M2 storage 写、healthEvents direct/alias/destructure mutator、动态执行与原型篡改。浏览器测试不直接注入 W3-M2 session、mission 或 formal proof；先决关卡使用合法 W3-M1 formal fixture，W3-M2 的完成只来自孩子可见操作。

## 玩家输入、状态和失败行为

默认可见图的两道条件都读取 `外形和高翠兰相同`：

1. 第一闸得到 true，进入 then，维持伪装并取得线索；
2. 第二闸也得到 true，错误进入“继续装作高翠兰”，产生可定位失败。

孩子在同一真实 Blockly workspace 中把第二条件替换为 `真实身份是高翠兰`。该事实为 false，因此进入 else 并执行“显出悟空本相”，runner 才从 `revealed` 派生固定结果 `demon-fled`。`demon-fled` 不是儿童 opcode，不能被 trace 伪造。

唯一事实链为：

`visible Blockly workspace → versioned draft → compiler → workspace-bound canonical trace → deterministic runner`

每条 instruction 包含 checkpoint、source/parent block、condition source/kind/label/value、evidence 和 actual branch。正式运行入口会重新编译传入 draft，并逐字段匹配 trace；同步伪造 source、parent、instruction ID、value、branch 或 evidence 均被拒绝。图校验同时拒绝多根、断线、环、未知/孤立/重复块、共享 condition、跨容器 ownership、错误主链和非法字段形状。

所有失败固定为零惩罚：生命、资源和星级均不扣。无论标准动画或减少动态、静音或有声，trace、checkpoint results、finalState 和 penalty 保持一致。

## 火眼金睛、持久化与恢复

- W2-M4 持久完成后获得能力，W2-M5 持久完成后稳定；W3-M2 不重复授予。
- 只有已保存的 W3-M2 正式失败 snapshot 可以观察。显示内容只有当前条件、真/假值、公开依据和实际分支；不推荐替代条件、不改图、不运行、不完成。
- 审计记录为 `{snapshotId, usedAt, workspace}`。导入时从历史 workspace 重编译重放，必须精确得到相同失败 snapshot；观察次数不得超过累计 runtime failure 数。
- 编辑新草稿会清除当前 trace/run/checkpoint/failure snapshot，但保留 totalRuns、累计失败、提示和合法历史观察。parser 只接受“全部当前证据一起清空”，拒绝半清状态。
- 保存发布顺序为：草稿保存 → 运行证据保存 → 场景播放 → completion mission/formal proof 原子保存 → 成功弹窗。四类写失败均有对应重试，未保存内容不会提前播放、观察、完成或解锁。
- revision 4 迁移保留 W1/W2/W3-M1 数据。历史完成的 W3-M2 只生成 `legacy-preformal`，不冒充正式证明；历史用户保留 W3-M3 访问权，新玩家解锁与正式徽标要求 `formal-v3`。
- CAS 冲突提供真实备份下载和显式载入外部进度；同页切换动画/静音不会误判成外部冲突。损坏 current 的原始内容可下载，合法 snapshot 会恢复精确 session 与 formal proof。
- 家长端只显示能力状态、观察次数/时间、运行/调整摘要和正式/历史证明；不展示 block ID、答案条件或完整 trace。导出后通过真实文件控件导入，精确恢复 W3-M2 session、mission、formal proof 与 W3-M3 解锁。

## 正式素材与视觉 QA

两张 shipping WebP 均由内置 `image_gen` 生成，完整 prompt、用途、slot、provenance、技术处理和 rejected checkerboard edit 已记录在 `docs/assets/asset-manifest.md`。

| 资产 | 尺寸 | 字节 | SHA-256 | QA |
| --- | ---: | ---: | --- | --- |
| `cuilan-disguise-background.webp` | 1672×941 | 172,450 | `8955dd2133ff59d8db5ba7d48220cb02207324c339cb1094d0c6b929a2141fad` | visual-qa-passed，无 alpha。 |
| `cuilan-boolean-states.webp` | 2500×700 | 350,002 | `07a6f2aef138c9a5cc0252c61b77197193f3ff86eca879355055f3548d183501` | visual-qa-passed，真实 alpha，五个等宽状态格。 |

状态图只做本地技术性 alpha 去孤立噪点、低 alpha 清理、完整主体连通域分格、半透明边缘 RGB 去污染与 WebP 编码；未重绘角色。一次内置 cleanup edit 因把 checkerboard 烘焙进像素而被拒绝，未 shipping。最终 alpha-edge 指标为 **293 mismatches / 46,513 inspected = 0.63%**，低于既有 **4%** 上限，未放宽门禁。

五项目完整路径各保留 Blockly、failure、success 三张主截图，共 **15** 张；Playwright reporter 同时复制附件，因此目录内为 **30** 张 PNG。主代理已目视检查 15 张主截图：320/390/768/1440 均无横向溢出或区域重叠；Blockly 真实可见；失败画面、观察入口、显形/逃走成功画面和通关弹窗可辨；画面不含卧床、亲密接触或攻击命中内容。

## 全站回归边界

全站 `npm run test:e2e` 为 **315/340 passed、25 failed**。失败中没有 W3-M2：

- desktop Chromium：8 项——legacy MissionTools 旧目标、homepage transfer、W1-M1 cold、Four Seas draft fault、Four Seas cold、Ruyi cold、advanced draft raw/revision、equipment fault。
- tablet WebKit：4 项——homepage transfer、W1-M1 cold、Four Seas cold、Ruyi cold。
- mobile Chromium 390：4 项——homepage transfer、W1-M1 cold、Four Seas cold、Ruyi cold。
- desktop Firefox：5 项——homepage transfer、W1-M1 cold、Four Seas cold、Ruyi cold，以及 W2-M2 keyboard 长跑波动；该 W2 单项随后独立复跑 **1/1 passed**。
- narrow Chromium 320：4 项——homepage transfer、W1-M1 cold、Four Seas cold、Ruyi cold。

代表性数值：homepage **790,417 > 665,600 bytes**；W1-M1 cold **2,869,577 > 2,621,440 bytes**；Four Seas 汇总中的 W1-M3 cold **3,030,384 > 2,883,584 bytes**。其中若干 W1/shared fault 断言也受到 revision 4 迁移后的保存形状影响，不能把它们写成当前全站绿灯。

该全站运行发生在最后一轮仅涉及 W3-M2 Experience 同页设置冲突与 W3-M2 E2E 证据加强的改动之前。最终 W3-M2 代码由之后的新鲜 unit/source/build/bundle/asset 与 **24/24** 专项矩阵验证；全站失败仍阻断 `System loop complete`、`Full-content verified`、商业完成和发布。

## Completion matrix

| 相关行 | 证据 | 结论 |
| --- | --- | --- |
| Course / 30 levels | W3-M2 formal 且无 `expectedSequence`；W3-M3～M5 仍 legacy。 | W3-M2 单关满足；第三周/30关 **not complete**。 |
| Blockly | 可见双闸门图驱动 trace；非法图、删除恢复、键盘、刷新和五项目浏览器均有证据。 | 满足 W3-M2 `One-level playable`；不能外推全站 Blockly loop。 |
| Parent / saves | revision 4、四类 fault、CAS、corrupt、snapshot、export-import、formal proof、家长摘要均有 unit/browser 证据。 | 本关依赖路径满足；全产品家长系统不能由一关外推。 |
| UI / release | 320/390/768/1440、Chromium/WebKit/Firefox、键盘/触摸、motion/mute、三层 lazy、asset retry、404、预算与健康检查通过。 | 本关 UI loop 满足；public deployment 未运行，release/commercial **not complete**。 |

## 剩余风险与下一阻塞

- W3-M3～W3-M5 仍为 legacy；第三周 `System loop complete`：**not complete**。
- 全站仍有 25 项回归失败；`Full-content verified` 与 `Commercial production complete`：**not complete**。
- public deployment 未运行。
- Progress JSON 的严格解析、CAS 和防伪合同提供本地一致性，不是密码学签名或服务端安全保证。
- 下一产品阻塞是正式设计并实现 W3-M3「云栈洞交锋」；下一全站阻塞是修复上述 W1/shared 预算与存储故障回归，并重新跑全站门禁。
