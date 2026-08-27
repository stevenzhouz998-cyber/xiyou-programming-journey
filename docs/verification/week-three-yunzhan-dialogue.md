# W3-M3 云栈洞交锋正式 Blockly 验证

## 结论

W3-M3「云栈洞交锋」达到 **One-level playable**。

这一结论只覆盖 W3-M3 单关。W3-M4/W3-M5 仍为 legacy；第三周 `System loop complete`、全站 `Full-content verified`、`Commercial production complete` 与 public deployment 均为 **not complete**。

## 现场与授权边界

- worktree：`/Users/macmini-zz/.codex/worktrees/3abe/少儿编程学习网页`
- 分支：`codex/week-two-formal`
- 起始 HEAD：`bd33056855768b27180099e726bc88ecb9d3e80f`
- 实现保持未提交、未推送、未创建 PR、未合并、未部署。
- 主工作树 `/Users/macmini-zz/Documents/少儿编程学习网页` 未被本任务修改。

## 玩家可见行为

- 同一张真实 Blockly 图固定显示条件“当前话语明确说明唐三藏正在西行取经”和两个可移动动作。
- 默认图故意接反：THEN 守洞、ELSE 说明受观音点化；默认运行是一次有效失败且零惩罚。
- 第一轮公开话语只说明悟空身份，得到 false/ELSE；第二轮明确说明保护唐三藏西行取经，得到 true/THEN。
- 点击、触控、Enter 或 Space 都通过同一个可见 workspace 交换分支连接。正确图得到“守洞 → 放下钉耙并说明受观音点化”的 canonical trace。
- Scene 按 runtime events 依次显示两轮输入、守洞动作、说明西行使命和猪刚鬣放下钉耙的终态；不进入拜师或获名八戒。
- 结构缺失只记录 compile failure，不算有效运行，也不开放火眼金睛。
- 火眼金睛只在失败快照保存成功后显示条件、真假、公开依据、实际分支和实际动作；不显示正确动作、不改图、不重跑。
- 完成证明由当前保存 workspace 重编译重放后原子写入，随后解锁 W3-M4 入口。

## 防伪、持久化与恢复

- `weekThreeYunzhanDialogueContract` 校验真实连接、唯一条件、两个分支、必需块、孤儿/重复/未知块与伪造 trace。
- 坐标不参与 canonical trace 或成功判定；异常大但有限的导入坐标只在可见恢复时安全夹紧。
- Progress V3 schema revision 从 4 升到 5，同时保留 revision 1–4 解析与迁移。
- 历史 W3-M3 完成只迁移为 `legacy-preformal`；新玩家进入 W3-M3 需要当前 W3-M2 formal proof。
- session 与 formal proof 使用 exact keys，并从 workspace 重编译重放；编辑图会全量清除当前 trace/run/round/failure snapshot，同时保留累计运行、失败与合法观察历史。
- draft、run、observation、completion 四类写失败均 fail closed 并提供可见重试；CAS 提供备份和显式载入外部进度。
- 损坏 current 原文可下载，最后合法 snapshot 精确恢复 W3-M3 session 与 formal proof；家长导出导入后 W3-M4 仍解锁。
- 家长与第三周报告显示运行/调整/观察和 formal/legacy 摘要，不显示 raw block ID、完整 trace 或答案图。

## 新鲜自动验证

| 命令 | 结果 |
| --- | --- |
| `npm test` | **112 files / 1181 unit passed**；**164** source/bundle contracts passed；**45** asset contracts passed。 |
| `npm run typecheck` | exit 0。 |
| `npm run build` | exit 0；4762 modules transformed。 |
| `npm run verify:bundle` | exit 0；W3-M3 Experience closure **1259.1 KiB raw / 343.5 KiB gzip**，低于 3 MiB。 |
| `npm run verify:assets` | exit 0；W3-M3 **2 files / 460,658 bytes / 1,310,720-byte** 上限。 |
| `git diff --check` | exit 0。 |
| `npx playwright test e2e/week-three-yunzhan-dialogue.spec.ts --reporter=line` | 五项目 **24/24 passed**。 |
| W2-M1～M5 + W3-M1～M3 统一回归 | **178/178 passed**。 |
| `npm run test:e2e -- --reporter=line` | 全站 **339/364 passed、25 failed**；没有 W2/W3 正式关失败。 |

五项目专项包含：desktop Chromium、tablet WebKit、mobile Chromium 390、desktop Firefox、narrow Chromium 320。覆盖 full、keyboard、四类 storage、motion/mute、external CAS、corrupt、parent export-import、cold/404、asset fault、Experience/Scene/Workspace lazy recovery。

## 正式素材与视觉 QA

| 资产 | 尺寸 | 字节 | SHA-256 | QA |
| --- | ---: | ---: | --- | --- |
| `yunzhan-dialogue-background.webp` | 1672×941 | 165,720 | `3e7e5974898301531369a7904cb84b0177937155b152e753a87b2af1811658dc` | visual-qa-passed，无 alpha。 |
| `yunzhan-dialogue-states.webp` | 2048×768 | 294,938 | `898d041b589871267719aa3746ebd6b36aabae4cb71d818a7e30214de254db39` | visual-qa-passed，真实 alpha，四格状态。 |

状态图的 alpha-edge 指标为 **324 mismatches / 18,321 inspected = 1.77%**，低于既有 4% 上限。直接透明编辑因烘焙棋盘格被拒绝；绿色色键因与青绿色衣服冲突也被拒绝。最终只使用洋红色键做技术性 alpha 提取、边缘 RGB 去污染与 WebP 编码，没有重绘人物。

五项目各保留 default/failure/success 三张主截图，共 **15** 张；Playwright reporter 同时复制附件，因此 test-results 内为 30 张 PNG。主代理逐张确认：

- 320/390/768/1440 无横向溢出或区域重叠；四个 Blockly 块全部落在 host 内。
- 默认接反图、失败入口、火眼金睛、正确图和成功弹窗均可辨。
- Firefox 保存后不再重建错位；Enter/Space 各只触发一次原生按钮操作。
- 失败与成功终态均显示猪刚鬣放下钉耙，文案与角色一致。
- 无伪字、命中攻击、拜师、受戒或获名八戒画面。

## 全站失败边界

全站 25 项失败与历史基线数量一致：

- 首页 transfer budget：5 项。
- W1-M1 cold-load budget：5 项。
- Four Seas cold-load budget：5 项。
- Ruyi Staff cold-load budget：5 项。
- desktop legacy / W1/shared storage：4 项。
- Firefox advanced keyboard 长跑失败：1 项。

这些失败不属于 W3-M3，也没有出现在 178 项 W2/W3 统一正式关回归中；它们继续阻断全站完成声明。

## Completion matrix

| 相关行 | 证据 | 结论 |
| --- | --- | --- |
| Course / 30 levels | W3-M3 formal 且无 `expectedSequence`；W3-M4/M5 仍 legacy。 | W3-M3 单关满足；第三周/30关 **not complete**。 |
| Blockly | 可见连接图驱动 canonical trace；删除/非法结构、坐标防伪、键盘、触控、刷新和五项目浏览器有证据。 | 满足 W3-M3 `One-level playable`。 |
| Parent / saves | revision 5、proof replay、四类 fault、CAS、corrupt、snapshot、export-import、家长/周报均有测试。 | 本关依赖路径满足；不能外推全产品家长系统。 |
| UI / release | 320/390/768/1440、Chromium/WebKit/Firefox、motion/mute、三层 lazy、asset retry、404、预算、健康与视觉 QA 通过。 | 本关 UI loop 满足；public deployment 未运行，release/commercial **not complete**。 |

## 剩余风险与下一阻塞

- W3-M4/W3-M5 正式化与第三周统一三关浏览器闭环尚未完成。
- 全站 25 项 W1/shared 回归失败尚未修复。
- public deployment 未运行。
- 本地 Progress proof 提供确定性一致性与防伪门禁，不是服务端签名或账号同步。
