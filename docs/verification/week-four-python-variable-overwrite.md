# W4-M2 Python 变量覆盖验证记录

## 范围、现场与完成边界

本记录覆盖第四周第二关「第一次变化：两只证据匣，别让变量被覆盖」的单关正式 Python 学习闭环。记录现场为工作树 `/Users/macmini-zz/.codex/worktrees/b3d1/少儿编程学习网页`，开始核对时 `HEAD` 为 `5fcdc3ac3f9b7de7ac31fd1aa0d54abf80c53c3a`，工作树已有本关实现与未提交的协作变更；本次不提交、不推送、不部署。

此关支持的最高完成等级是 **One-level playable**：孩子在可见 Python 编辑器中修正变量名，真实 Worker 运行，保存失败或成功事实，刷新/导入后恢复，完成时持久化正式作品与证明、供家长查看并解锁 W4-M3。它不证明第四周系统闭环、30 关全内容、公开部署或商业生产完成；这些均为 **not complete**。

## 玩家可见的真实因果链

默认程序只有三条严格受限的语句：

```python
appearance = ordinary_eyes()
appearance = fiery_eye_check()
seal_record(appearance, identity)
```

第一行把普通观察的“送斋女子”写入 `appearance`；第二行错误地以火眼核验的“白骨精”覆盖同一变量；第三行真正需要的 `identity` 从未赋值，因此真实运行得到缺失身份变量的 NameError 型失败。该失败不是静态提示或隐藏答案：保存后的 canonical trace、Worker trace、failure snapshot 与状态机共同决定“外形匣被覆盖、身份匣为空”。

孩子只可将第二行的目标变量由 `appearance` 改为 `identity`。受限 grammar、Worker 请求/响应核验和确定性 runner 要求两条独立记录后才能封存；正确运行保持普通观察，独立写入火眼核验，再执行 `seal_record(appearance, identity)`。帮助只展示已保存的覆盖事实和问题行，不能编辑、运行、排序或泄露可照抄的答案。

## 保存、迁移与安全

- Progress schema revision 9 引入 W4-M2 session、`w4-m2-variable-evidence-record` work 与 formal-v3 completion proof。revision 1–8 的历史 W4-M2 完成只迁移为 `legacy-replay-only`，不伪造 session、trace、run、work 或正式证明；历史记录只能通过一次完整的当前正式回放升级。
- 成功 proof 精确绑定 formal-v3 的 W4-M1 前置、当前 Python、canonical/Worker trace、sealed run 和同一 work。裸完成标志、过期 run、失败 run、缺 work、伪造计数或 revision 9 孤儿数据均拒绝。
- 草稿必须先保存再交给 Worker；运行、观察、作品/proof 与完成都有 fail-closed 的保存重试。双标签 CAS 冲突不覆盖另一标签的进度；迟到 Worker 结果、卸载和重复运行不产生额外完成或重放写入。
- 覆盖失败、结构验证失败、Worker 加载/超时/错误、素材加载和 lazy chunk 故障都有单独可恢复路径。学习错误不扣生命、资源或星级；基础设施错误也不被记为学习错误。
- 损坏存档先保留并提供下载原文；合法快照用于恢复。家长“备份并清空”先下载 JSON，再按项目既有 clear 合同恢复初始 V3：删除 W4-M2 session/work/proof/完成，重置 settings 与 privacy，并重新锁定 W4-M3。
- Python 运行限定为同源 Pyodide Worker、固定 runtime inventory 与精确三句 grammar；没有 imports、文件/浏览器访问、动态代码或任意 Python 执行面。Worker 返回必须与当前保存代码重新解析出的 trace 完全一致。

## 本次已核实证据

- 新增视觉回归先在缺少 `.week-four-variable-scene-props` 时明确失败，随后通过：该包装同时容纳完整来客图和方形状态 sprite；来客图为 `contain`，状态图逐格裁切。桌面布局让场景占左栏两行、只读复习和编辑器分别在右栏，消除复习卡被场景高度拉出的空白；900px 以下遵循 DOM 顺序 scene → review → editor，520px 以下素材纵向排列。
- 临时依赖镜像的组件、响应式与类型验证为 **3 个测试文件 / 29 个测试通过**，并通过 `tsc --noEmit`。这组测试锁定 wrapper、完整人物图、方形 sprite、桌面 grid span 和窄屏单列规则。
- W4-M2 专项真实浏览器矩阵 fresh **34/34 通过**、零失败：桌面 Chromium 19、平板 WebKit 5、移动 Chromium 3、桌面 Firefox 3、320px 窄屏 Chromium 4。覆盖默认覆盖失败→观察→修复→封存、W4-M1 只读回看前后 Progress 深相等、刷新回放、清空后导入精确重建并真实 Worker 回放、家长摘要、W4-M3 解锁、键盘/鼠标/触控/语义与焦点、五类保存故障重试、CAS、损坏原文字节精确下载与快照恢复、清空、Worker 安全探针、runtime/asset/lazy fault、健康事件、窄屏 overflow 与五项目冷/热路径。
- 主代理人工复核五项目各默认态和封存态截图共 10 张：1440 Chromium、768 WebKit、390 Chromium、1440 Firefox、320 Chromium。确认桌面无巨型空白，来客头部与全身未裁切，状态格正确；平板、移动与窄屏无横向溢出，内容顺序和封存层可读。
- 素材合同测试 **53/53 通过**；当前 manifest 的 `check` 和 `verify --require-visual-qa` 都通过。共享白虎岭背景 121,314 bytes、来客 119,994 bytes、状态图 178,420 bytes，合计 **419,728 / 1,310,720 bytes**；SHA-256、尺寸、真实 alpha、唯一 `assetUrl` scene slots、生成来源与五项目 visual QA 均受 gate 验证，三项均为 `visual-qa-passed`。
- 最终本地验证：`npm test` 为 **148 个测试文件 / 1,486 个测试通过**；bundle/runtime/source contracts 为 **204/204 通过**；素材合同 **53/53 通过**；`npm run typecheck`、`npm run build`、`npm run verify:bundle` 与 `npm run verify:assets` 通过。
- 首次全站真实浏览器回归为 **471 项：440 通过、31 失败**。其中 W3-M4 parent 失败确认由本关曾错误改变 clear 语义引起；恢复初始 V3 清空合同后，W3-M4 parent、W4-M2 clear 与 commercial foundation backup-and-clear 定点通过，storage/context 单元 111/111 通过。W3-M5 parent 单次隔离运行曾通过，但 `repeat-each=3` 为 2 通过/1 失败，仍是未稳定的全站残余路径。修复后未重跑全部 471 项，其余首次失败也未在本任务中修改，因此不把定点结果表述为全站通过。

截图由 Playwright 留在 `test-results/week-four-python-variable--bf365-rt-parent-summary-and-W4-M3-*` 下，每个项目均有 `w4m2-default-*.png` 与 `w4m2-sealed-*.png`。

## 性能与后续总验收记录

W4-M2 冷路径在 10 Mbps 下行、4× CPU 节流的真实 Chromium 场景中要求：完整本地 lazy closure 加 Worker 不超过 3 MiB、固定 Pyodide 五文件传输不超过 15 MiB、首次失败结果不超过 20 秒、修正后的热运行不超过 1 秒；专项 34/34 已在五项目执行 cold/warm gate。Chromium 项目使用真实 CDP 限速；WebKit/Firefox 使用原生引擎时延与实际同源请求体计量，Firefox 对两个不可见 Worker module response 额外执行明示的 compatibility fetch，不冒充 CDP 限速。桌面 Chromium 附件记录：保守 manifest closure **964,045 bytes**，Worker **5,629 bytes**，二者合计 **969,674 bytes / 3 MiB**；实际浏览器已加载其中 **959,762 bytes**。固定 Pyodide 五文件 **13,544,397 bytes**，Worker ready **12,488.988 ms**，首次失败结果 **12,603.654 ms**，修正后的热运行 **276.119 ms**。

最终 `npm run verify:bundle` 已通过：204 个 bundle/runtime/source-contract 测试通过，并完成生产构建与预算检查。入口静态 JavaScript 为 **152.0 KiB gzip / 180 KiB**，保守首页总量为 **501.3 KiB / 650 KiB**，W4-M2 lazy closure 为 **913.2 KiB raw、270.9 KiB gzip / 3 MiB**。全站浏览器 E2E 仍不是本单关证据的一部分，不能由上述专项矩阵外推为全站通过。

## Completion matrix 摘要

| 相关系统 | 已有单关证据 | 仍缺少的更高等级证据 |
| --- | --- | --- |
| Course / 30 levels | W4-M2 前置、真实输入、封存与 W4-M3 解锁 | 其余关卡和全内容矩阵 |
| Blockly 依赖 | W4-M1 只读回看前后 Progress 深相等，W4-M2 未重建或修改 Blockly 系统 | 全站 Blockly 回归与 Course 全内容仍 **not complete** |
| Python | 受限 Worker、可见代码、保存 trace、真实 NameError 型失败和成功 proof | 其他 Python 学习模式及整站性能 |
| Growth / reward / equipment | 本关明确零货币、零装备、零装饰奖励，失败不扣资源 | reward mastery、成长闭环与第四周系统完成均 **not complete** |
| Parent / saves | CAS、故障重试、损坏恢复、空白存储导出导入、备份后清空、家长摘要 | Parent clear 单关已覆盖；全站存档/家长矩阵仍 **not complete** |
| UI / assets / deployment | 五项目浏览器、键盘/触控、窄屏、自动语义/焦点、三项 provenance/visual QA | 屏幕阅读器人工实测、UI public deployment、线上 404/性能/儿童隐私发布检查均 **not complete** |

## 残余风险

- 本关的截图和自动化路径已覆盖五个目标浏览器/宽度，但屏幕阅读器实际朗读体验仍未做人工验证。
- 未做公开部署验证：线上版本、404、部署后性能和儿童隐私发布检查不能由本单关证据推导；首次全站浏览器回归仍有 31 项失败且未在本次定点修复后全量重跑。
- W4-M3 至 W4-M5、第四周系统循环和 30 关商业交付仍未完成；本关不产生装饰货币或奖励，也不改变该边界。
