# W3-M4 八戒归队多条件组合验证记录

## 结论

W3-M4「八戒归队」达到 **One-level playable**。

该结论只覆盖一关完整的真实浏览器闭环：孩子在同一张可见 Blockly 图中经历默认 OR 的第二卡失败、保存失败证据并使用不泄题的火眼金睛，把真实可见的 operator 改为 AND，依次通过 TT、TF、FT 三张卡，播放准确原著结局，并验证刷新、恢复、导出导入与故障路径。

W3-M5 仍为 legacy；第三周 `System loop complete`、30 关、`Full-content verified`、`Commercial production complete` 与 public deployment 均为 **not complete**。

## 现场与授权边界

- worktree：`/Users/macmini-zz/.codex/worktrees/4ac1/少儿编程学习网页`
- branch：`codex/w3-m4-bajie-joining`
- 起点 HEAD：`fb623c4bcfd4c56891ed9eb34c032e30defae647`
- 本任务实现与本记录均保持未提交、未推送、无 PR、未 merge、未 deploy。
- 本任务没有修改主工作树 `/Users/macmini-zz/Documents/少儿编程学习网页`。

## 玩家可见行为与唯一事实源

- 同一张真实 Blockly 图有三张固定公开卡：原著 TT，以及明确标记“逻辑练习，不改变原著”的 TF、FT 两卡。
- 默认 operator 是 OR：原著 TT 卡暂时通过，第二张 TF 卡错误进入“正式归队”，构成真实可见的有效失败；所有失败均为零惩罚，不扣生命、资源或星级。
- 火眼金睛只在失败快照已保存后出现，只显示当前原子真值、当前 operator、组合结果、实际分支和公开依据；它不泄露 AND、不改图、不运行，也不完成任务。
- 孩子通过真实鼠标 click、触控 `tap()` 或键盘操作同一个可见 Blockly `FieldDropdown`，将 OR 改为 AND；没有页面外答案控件或隐藏成功状态。
- 正确 AND 图按 TT、TF、FT 三卡分别得到正确判断并成功。成功场景依次准确呈现：悟能说明观音此前授戒、唐僧另名八戒、八戒挑担西行；不把这些故事结果做成可排序的儿童指令。
- 唯一事实链为：`visible Blockly workspace → serialized draft → compiler → canonical trace → deterministic runner`。图连接、而非课程配置、React 状态、场景动画、坐标、legacy `expectedSequence` 或隐藏答案，决定 trace、失败和成功。

## 防伪、持久化与恢复

- Progress V3 已升为 revision 6。W3-M4 session 与 formal proof 绑定同一保存 workspace；导入、恢复与完成前都会从图重新编译、重放并核对 proof，伪造 trace、operator、run 或 proof 会被拒绝。
- W3-M4 进入要求 W3-M3 的 `formal-v3` 前置证明；bare completion 或 `legacy-preformal` 不能解锁。正确的 W3-M4 formal proof 只开放 W3-M5 入口，未把 W3-M5 正式化。
- draft、run、observation、completion 四类 save fault 都会 fail closed：保留精确的待重试内容，未保存结果不会播放、观察、完成或解锁。
- 跨标签 CAS 冲突提供当前图备份与显式载入外部进度；损坏 current 会保留原文供下载，再从最后合法 snapshot 恢复。家长 clear 与 export-import 后仍以保存图重建/校验本关状态。
- 历史 W3-M4 完成迁移为 `legacy-preformal`，不伪造 session、trace、run 或新解锁；历史自身已完成的 W3-M5 使用 `legacy-replay-only` marker 保留重玩访问。
- E2E source contract 使用 AST、固定前置 helper 指纹和反篡改 sentinels，拒绝直接写入 W3-M4 storage/proof、动态执行、隐藏健康证据篡改及其他测试捷径。

## 新鲜自动验证

| 项目 | 结果 |
| --- | --- |
| `npm test` | **119 files / 1249 unit** 通过；source/bundle contracts **174**；asset contracts **48**。 |
| `npm run typecheck` | 最终主代理命令 exit 0。 |
| `npm run build` | 最终主代理命令 exit 0，**4770 modules transformed**。 |
| W3-M4 五项目 E2E | 当前实现 **26/26 passed**：desktop Chromium 15、tablet WebKit 2、mobile Chromium 3、desktop Firefox 3、narrow Chromium 3；新增 mouse/touch 三项也通过。 |
| 全站 JSON：`/tmp/w3m4-full-e2e-final.json` | 在新增三项输入证据前的完整生产行为长跑为 **387 total，363 expected pass，24 unexpected，0 flaky**；新增三项随后以当前代码单独纳入 W3-M4 26/26，未改变生产实现或既有失败分类。 |
| W2/W3 正式关过滤回归 | 同一最终 report 的九份 W2/W3 文件合计 **201/201 passed**：W3-M4 23、W3-M2 24、W3-M1 24、W3-M3 24、W2-M4 16、W2-M5 22、W2-M1 18、W2-M2 25、W2-M3 25。 |
| `npm run verify:bundle` | 最终 W3-M4 closure **1289.5 KiB raw / 351.3 KiB gzip**，不高于 3 MiB；entry **138.0 KiB gzip**。 |
| `npm run verify:assets` | 两个 W3-M4 素材合计 **634,078 bytes**，不高于 **1,310,720 bytes**。 |
| `git diff --check` | 最终主代理命令 exit 0。 |

全站最终 JSON 中的 24 项 unexpected 失败不属于 W2/W3 formal：homepage transfer budget 5、W1-M1 cold 5、Four Seas cold 5、Ruyi cold 5、MissionTools legacy lazy 1、Four Seas draft storage 1、Underworld advanced storage 2。它们继续阻断全站 `Full-content verified` 和商业完成声明。

## 正式素材与视觉 QA

| 资产 | 尺寸 | 字节 | SHA-256 | QA |
| --- | ---: | ---: | --- | --- |
| `bajie-joining-background.webp` | 1672×941 | 231,654 | `8214aff1b76717b74baad3f55195ff63c6edc14b7c3a17735ad43b5d6cda0951` | 无 alpha；已纳入正式素材视觉检查。 |
| `bajie-joining-states.webp` | 1500×500 | 402,424 | `408a52ad14ee571c4f3d2ce2b30ba88d06ef5078e44de0feba40f7c3774dc2ec` | 有真实 alpha，三个 500px 状态格；alpha edge `0 / 10,703`。 |

- 状态图三格边界正确，第三格人物、行李和道具均完整，没有 staff 越界；两张素材的总量为 **634,078 bytes**。
- 五项目各留存 default、failure、success 三张主图，共 **15** 张；含 reporter attachments 共 **30** 张。主代理已检查 contact sheet 和 mobile 原图；mouse click、390/320 touch tap 另有可执行浏览器断言。
- Blockly host 在 desktop/tablet 为 520px，mobile/narrow 约 439px，均不低于 360px；每个画面至少可见 7 个 block，root、operator、两个条件与 then/else 都落在 host 内，没有横向溢出。
- 默认、失败、观察、成功和 modal 的卡片/文案均可读；状态比例正确，无伪字、攻击、捆绑或羞辱画面。

## Completion matrix

| 相关行 | 已有证据 | 结论与未验证范围 |
| --- | --- | --- |
| Course / 30 levels | W3-M4 已走 formal Blockly 路径，无 `expectedSequence`；W3-M5 仍 legacy。 | W3-M4 单关满足；第三周系统、30 关 **not complete**。 |
| Blockly | 真实可见图生成 trace；默认失败、AND 成功、非法结构、防伪、刷新、键盘/触控及五项目浏览器路径均有证据。 | 满足本关 `One-level playable`；不能外推为全站 Blockly loop。 |
| Parent / saves | revision 6、session/proof 绑定、四类 save fault、CAS、corrupt、parent clear、export-import、迁移和 proof replay 均有自动/浏览器证据。 | 满足本关依赖路径；本地 proof 不等同服务端签名或账号同步。 |
| UI / release | 1440/768/390/320、Chromium/WebKit/Firefox、reduced motion、mute、lazy/asset failure、404、预算、素材和视觉 QA 有本关证据。 | 本关 UI loop 满足；未验证公开部署，release/commercial **not complete**。 |

## 残余风险与下一阻塞

- 本地 Progress proof 是确定性一致性与防伪机制，不是服务端签名或账号同步。
- W3-M5 仍是 legacy，第三周 system loop 尚未完成。
- 全站仍有上述 24 项 unexpected E2E 失败，故全站/30关 `Full-content verified` 与 `Commercial production complete` 均未达到。
- public deployment 未运行；部署后的真实浏览器、保存恢复和运行健康也尚未验证。
