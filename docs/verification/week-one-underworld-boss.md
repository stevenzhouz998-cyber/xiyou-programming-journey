# 第一周幽冥勾名与第三回总试炼验证

## 完成边界

- `w1-m4 幽冥勾名：One-level playable`
- `w1-m5 第三回总试炼：One-level playable`
- `第一周五关内容：已全量验证`，仅指 w1-m1 至 w1-m5 的本地逐关自动路径、独立交互模式、装备跨关循环和边界证据。
- `第一周装备/奖励子系统：System loop complete`，奖励获得、装备/卸下、后续学习作用、持久化、失败恢复和家长报告均有真实浏览器证据。
- `其余25关、全站完整成长/奖励/装备/神兽/伙伴/发布：not complete`
- `整站 Full-content verified / Commercial production complete：not complete`

起点为 detached HEAD `7b018abe16b53d2437a2229d159033b6265035fb`，原仓库 `codex/xiyou-programming` 指向同一提交。本轮未 commit、push、deploy 或改变线上状态。

## 真实玩家闭环

### w1-m4

孩子可见创建、连接、删除并重加真实 Blockly 积木。连接图是唯一指令源，生成带 `instructionId/sourceBlockId/parentBlockId` 的确定性 trace，驱动：

`closed -> opened -> index-read -> monkey-kind-matched -> named-records-collected -> names-handled -> verified`

错序、缺失、非法容器和重复步骤均返回问题积木和可理解反馈；生命、资源、星级惩罚始终为 0/0/0。成功后才解锁 w1-m5。

### w1-m5

Boss 是独立的分层调度程序，由龙宫比较、披挂任务分解、名册查找处理三个容器检查点与顶层因果验证组成。它不读取前四关答案，不使用 `expectedSequence` 或隐藏成功状态。完成后周报为 5/5，重播不增加 attempts 或重复完成。

## Progress V3

- 两关均保存 workspace、trace、run events、失败概念、提示层级、尝试和时间。
- 导入会验证图连接、scope、ID/坐标边界，从 workspace 重编 trace，再从 trace 重放中性 reducer；伪造证据 fail closed。
- 完成后修改可见积木会清除过期 lastTrace/lastRun，保留历史 run 计数。
- 浏览器覆盖 draft/run/completion 三类写失败、可见重试、多标签 CAS、备份/载入外部版本、损坏 current 恢复与原文下载。
- 家长页真实导出，可见修改草稿，再通过文件 input 导入恢复两关精确会话。

## 装备与奖励跨关闭环

- Progress V3 升级到 `schemaRevision: 2`；w1-m2 原子授予如意金箍棒，w1-m3 原子授予凤翅紫金冠、黄金锁子甲、藕丝步云履。重放不重复发放，原始授予时间保留。
- 成长地图增加惰性加载的「装备行囊」，四个栏位可键盘/触控装备与卸下；只使用已审批的 Dragon Palace WebP 精灵图。
- 如意金箍棒在 w1-m5 提供事实型重量资料；紫金冠在 w1-m4/m5 只读汇总孩子自己的任务组；金甲只回放错误运行中已接受的前缀；云履仅增加「再次定位问题积木」。四者都不改积木、不运行、不通关。
- 作用只在其使用证据安全保存后出现；卸下后立即消失。装备写失败、重试、跨标签 CAS、备份/载入外部版本和损坏恢复均通过真实浏览器。
- 家长周报显示授予来源、当前栏位和 w1-m4/m5 主动使用作用；导出→可见卸下→文件导入可精确恢复库存、栏位、授予时间、作用证据和关卡会话。
- m3 默认儿童界面已移除原始 `sourceBlockId` / `parent=`，改为「收下云履」「属于收集任务组」等教学文案；m4/m5 场景不再显示内部状态码。

## 五项目浏览器证据

全量 Playwright 为 **186/186 passed，零跳过，7 个文件**。新增的统一整周用例在每个项目从空进度开始，不注入任何五关 completion/session/inventory/equipped 状态。

| 项目 | 全套 | Advanced | 额外证据 |
| --- | ---: | ---: | --- |
| desktop Chromium 1440x1024 | 71 | 17 + 统一整周 | 全路径、键盘、装备写失败/CAS、存储、家长、chunk/图片 503、cold |
| tablet WebKit 768x1024 | 31 | 6 + 统一整周 | 全路径、语义等价、损坏恢复、图片 503、cold |
| mobile Chromium 390x844 | 29 | 6 + 统一整周 | 全路径、几何/44px、语义等价、图片 503、cold |
| desktop Firefox 1440x1024 | 31 | 6 + 统一整周 | 全路径、键盘、损坏恢复、缓存失败后图片恢复、cold |
| narrow Chromium 320x844 | 24 | 5 + 统一整周 | 全路径、几何/44px、图片 503、cold |

还验证了静音/减弱动画等价、完整可见 Blockly 块均位于 host 内、320/390 无整页水平溢出、local production 静态图片 404，以及未过滤的 console/request/response/page health。

## 固定性能预算

| 路径 | 最大实测 | 上限 | 余量 |
| --- | ---: | ---: | ---: |
| homepage browser response bodies | 661,192 B | 665,600 B | 4,408 B |
| w1-m1 cold | 2,618,304 B | 2,621,440 B | 3,136 B |
| w1-m2 cold | 2,621,268 B | 2,621,440 B | 172 B |
| w1-m3 cold | 2,779,111 B | 2,883,584 B | 104,473 B |
| w1-m4 cold | 2,326,331 B | 3,145,728 B | 819,397 B |
| w1-m5 cold | 2,693,519 B | 3,145,728 B | 452,209 B |

- production entry：**107.3 KiB gzip / 180 KiB**。
- 静态保守 homepage：**429.8 KiB / 650 KiB**。
- production target 为 ESNext；支持边界是本文已实测的当前 Chromium、WebKit 和 Firefox，旧浏览器未验证。

## 资产 provenance

| 资产 | 尺寸 | 字节 | SHA-256 |
| --- | ---: | ---: | --- |
| `underworld-background.webp` | 1600x900 | 144,924 | `7ab2df7030a5980e87b40ced35795fe0f5805bd1e759c3eaa987e04f6439a1b1` |
| `register-states.webp` | 2048x1152 | 252,134 | `a37822649b566098b2cf8813be65b359dc788ce5fd699947ee2925d1ddca8bbd` |
| `boss-journey-background.webp` | 1600x900 | 216,066 | `5137b32c772c0b959717a718a40838cf516b762db6a085130291e309f6a356e7` |
| `boss-checkpoints.webp` | 3072x1152 | 303,388 | `77978522df022c4c04039d831d8c0f9c989bb323058cb0b9e12152cdb4b7c6b0` |

四图均由 OpenAI 内置 image generation 产生/编辑。完整 prompt、透明边缘处理、Sharp 无拉伸缩放/分格和 hash 在 `docs/assets/asset-manifest.md`。原图 QA 拒绝了假透明棋盘背景和明显拖影。无 CSS/div/SVG/emoji 代替正式插画。

## 最终门禁

- `npm run test:unit`：**814/814**。
- `npm run test:bundle-script`：**143/143 bundle/source-contract**。
- `npm run test:assets`：**35/35**。
- `npm run typecheck`：exit 0。
- `npm run verify:assets`：Dragon Palace 8 图；Advanced 4 图，916,512 / 1,310,720 B。
- `npm run verify:bundle`：production build 与全部预算通过。
- `npm audit --registry=https://registry.npmjs.org --audit-level=moderate`：`found 0 vulnerabilities`。默认 npmmirror audit 端点返回 `NOT_IMPLEMENTED`，因此使用官方 registry 完成只读审计。
- E2E 后重建 production `dist`，fault sentinel 扫描为空。
- `dist-e2e` 作为可重建的测试产物已移至 macOS 废纸篓（可恢复），工作树仅保留 E2E 后重建的 production `dist`。
- `git diff --check`：无错误。

## 主要 RED 历史与残余风险

- w1-m4/w1-m5 从 `expectedSequence`/legacy 壳起步；课程、Progress、图编译、reducer、route 和 E2E 都是先 RED 后实现。
- 首次名册资产的假透明背景被拒绝；Boss 精灵使 cold 超 81,785 B 后在不改预算下重编码。
- 首次浏览器发现 `/assets/...` 在 GitHub Pages base 下 404，改为合同锁定的 `assetUrl`。
- 首页与w1-m1冷路径曾超固定预算；通过 Blockly core、中性合约去重和专属 CSS 懒拆分修复，未上调预算。
- 装备状态首轮使 homepage 与 w1-m2 超出既定预算；通过任务 CSS、装备展示和装备操作的惰性分块恢复，未上调任何预算。
- m3 原 E2E 证据只从 UI 读取 trace ID，转为存档真实 trace 后发现草稿写与运行的竞态；现在最新草稿保存未完成时禁止运行，刷新后精确 ID/trace 通过。
- Firefox 会缓存首次 503 图片失败；AdvancedWeekOneScene 重试现使用 cache-busting `srcset`，稳定重新请求生产 WebP。
- w1-m2 cold 余量仅 **172 B**，homepage browser 余量 4,408 B，后续共享依赖变化极易回归，这是当前最主要性能风险。
- Blockly 首次加载仍依赖 `https://static.blockly.com/media/sprites.svg`。
- 既有全站 JPEG/音频 provenance 缺口仍存在，`boss.m4a` 仍非 release-approved。
- 公网部署、公网 404、部署版本匹配和公网性能未验证。
