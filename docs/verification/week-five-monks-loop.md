# W5-M1 解救僧众：逐人解困验收

日期：2026-09-11。工作区 `/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`，分支 `codex/w4-m3-branch-structure`，基线 HEAD `37354419b88728b4bcd9102c92e2fda3dfa76b36` 加本次W5-M1变更。用户批准推荐玩法并授权代理决定后续细节。本关达到 **One-level playable**；用户随后明确授权交接并提交推送当前分支，最终提交号及推送结果见Git记录和本次临时交接文件；未合并、安装或部署。

## 可观察行为

孩子编辑真实四行 Python，通过缩进决定末行动作是否逐人重复。默认 release 在循环里、register 在循环外，因此解除三次、只给最后一位登记一次，真实运行不通过。修正后每位都先解除再登记。可以调整名单顺序，接受逻辑等价答案；缺项、重复、固定对象、逆序及重复动作仍失败。公开三人名单与登记流程明确标注教学抽象，不冒充原著人数与具体事件。[原著第四十四回](https://m.gushiwen.cn/guwen/bookv_68f285187377.aspx)只决定固定故事背景与回顾，孩子不编写惩罚命令。

CodeMirror 与三个快捷控件修改同一源码。草稿先保存，独立 AST 白名单及空 builtins 的同源 Pyodide Worker 真实 exec；回调记录当前人、实际对象、动作、源行与循环内外。输入推导语义严格核对 Worker 返回，stdout、动画、UI 状态不决定成功。逐步查看播放已保存的实际记录，不产生新执行或帮助解题。空名单后访问 monk 的真实 NameError 转为可保存学习失败。所有失败零生命/资源/星级惩罚；提示星级规则沿用项目。

Progress revision13 新增独立 session、`w5-m1-monks-rescue-record` 作品和 formal-v3 证明。必须有正式 W4-M5 前置；运行/观察/完成各阶段受协调器保护，完成时作品、证明与任务原子封存，持久解锁 W5-M2。旧完成保留 legacy-replay-only 和历史时间，不伪造运行；真实重玩才升级。正式回放真实执行、提示只读，不更改原作品/证明/次数。家长摘要区分名单覆盖、逐人动作、语法困难和环境故障；所有第四周记录保留。

## 证据

| 验证 | 结果 | 命令耗时 | 原始证据 |
| --- | --- | --- | --- |
| 全量单元 | 170 文件，1867/1867 | 88.813 秒 | [记录](../../artifacts/verification/1789064400093-93329213/evidence.json) |
| 新关与 W4-M5 联合五端浏览器 | 61/61；新关31，前关30；workers=1，retries=0 | 391.757 秒 | [记录](../../artifacts/verification/1789064524872-68fd1a31/evidence.json) |
| 类型检查 | 通过 | 4.356 秒 | [记录](../../artifacts/verification/1789064457260-0647a1fc/evidence.json) |
| 构建预算 | 通过，包含新 Worker 字节 | 0.528 秒 | [记录](../../artifacts/verification/1789064524172-77d81f7e/evidence.json) |
| 工程预算脚本回归 | 232/232 | 7.071 秒 | [记录](../../artifacts/verification/1789064938047-61cd928b/evidence.json) |
| 素材合同 | 56/56 | 1.811 秒 | [记录](../../artifacts/verification/1789064391010-8cdb469b/evidence.json) |
| 素材发布门禁 | 通过 | 0.949 秒 | [记录](../../artifacts/verification/1789064392993-51d6fd86/evidence.json) |

新关定向57项单元包含768种有限合法程序的独立 Python AST/exec 对照；这768组是组合数据，不额外计入1867项测试。覆盖运行代际、稀疏/伪造/迟到结果、取消、加载/超时、安全拒绝及存档证据一致性。修复旧测试对revision12和旧正式关卡集合的固定断言；新关注册先观察到预期失败，再实施。首次桌面完整流程的末尾标题定位歧义已修正，最终五端覆盖同一完整路径。

浏览器覆盖可见控件和代码输入、默认失败、固定对象/空名单/逆序、安全拒绝、逐步查看、刷新、正式成功、只读重玩与提示、家长导出清空导入、前置/后续解锁、旧档真实升级、初次/编辑草稿/运行/观察/作品/完成保存故障、外部标签冲突、损坏源备份/导入拒绝、真实 Worker 加载与超时恢复、执行中编辑取消、场景失败重载、lazy URL重试、404、键盘/静音/减弱动画及性能。未预置本关成功结果；前置使用隔离夹具。

有效性边界：单元、类型和素材记录之后仅修正构建预算 CLI 对新增 Worker 的文件枚举，玩家源码、存档语义、素材与依赖不变；预算 CLI 和工程测试另行通过。全局保守指纹不能说明这些较早证据可跨任意变更自动复用。最终联合浏览器记录开始/结束指纹一致，验收后 verify:reuse 通过。生产构建日志保留在 [开发记录](../../artifacts/w5m1-development/production-build.log)。早期失败日志也保留在同目录。

## 五端与素材

桌面 Chromium/Firefox 1440×1024，平板 WebKit 768×1024，手机 Chromium 390×844，窄屏 Chromium 320×844。检查默认/失败/成功截图，无水平溢出，控件至少44px。主代理查看五端完成画面及桌面默认/失败画面。手机和窄屏纵向较长，需要滚动对照程序与结果，未做新的移动端布局重构。

| 项目 | 首次结果（预算≤20秒） | 热运行（预算≤1秒） | 条件 |
| --- | --- | --- | --- |
| desktop-chromium-1440x1024 | 13.409 秒 | 0.177 秒 | 10mbps-4x-cpu-cdp |
| desktop-firefox-1440x1024 | 6.034 秒 | 0.192 秒 | native-engine-compatible-no-cdp |
| mobile-chromium-390x844 | 13.414 秒 | 0.194 秒 | 10mbps-4x-cpu-cdp |
| narrow-chromium-320x844 | 13.479 秒 | 0.190 秒 | 10mbps-4x-cpu-cdp |
| tablet-webkit-768x1024 | 2.993 秒 | 0.083 秒 | native-engine-compatible-no-cdp |

三种 Chromium 使用10Mbps、4倍CPU降速；Firefox/WebKit 为原生引擎兼容测量，不宣称相同节流条件。lazy closure 1,095,877 字节 + Worker 5,061 字节，合计1,100,938字节，低于3MiB；同源Pyodide五文件13,544,397字节，低于15MiB。场景WebP 316,960字节。素材经内置image_gen生成，原文件和五端场景已检查；精确prompt、SHA-256、尺寸及槽位见[素材清单](../assets/asset-manifest.md)。

截图与各端JSON：[最终浏览器原始输出](../../artifacts/w5m1-acceptance-final)。这些artifacts仅在本机，不在Git提交内。

## 完成边界与下一步

W5-M1 **One-level playable**。第五周 System loop complete、30关 Full-content verified、全站通过及 Commercial production complete 均为 **not complete**。W5-M2到M5仍是兼容旧版内容；本轮未改变这些关卡玩法，也未重新验证所有30关。第四周前四关保留历史验收，当前全量unit保护共享存档，W4-M5真实浏览器回归保护本次跨周边界；不把这次61项当第四周五关或全站联合通过。

人工屏幕阅读器朗读、公开部署及线上存档行为未验证。无新的本关阻塞；下一关从 W5-M2「三清观」的函数定义课程目标开始。后续跨关设计保留本关“两步处理可封装成函数”的衔接，本关提交推送授权不扩大为合并、部署或后续关卡发布授权。

生产预览已启动并在Codex浏览器打开：http://127.0.0.1:4176/xiyou-programming-journey/#/mission/w5-m1 。该独立origin当前0/30，显示正式前置锁定，没有注入用户通关记录。测试截图使用隔离前置存档。
