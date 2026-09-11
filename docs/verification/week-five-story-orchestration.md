# W5-M5 车迟国故事总编排验收记录

2026-09-11 最终状态：本地 **One-level playable**。可见程序、真实执行、四步失败反馈、存档恢复、正式作品和 W6-M1 解锁已贯通；原先首页包超限与浏览器证据保留缺口均已解决。

## 工作区与完成边界

- 工作区：`/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`
- 分支：`codex/w4-m3-branch-structure`；实施基线及当前 HEAD：`dc81a12fa9f5ebd0f1419399b490560be1d1f93b`。
- Progress revision 17，W5-M4 `formal-v3` 为前置；作品为 `w5-m5-story-orchestration-record`。
- 本结论只覆盖本地 W5-M5。本次没有验证全站全部浏览器路径，没有提交、推送、合并、部署或公网验收，不代表整周或商业全站完成。
- 模型小队：Sol high 子任务 `/root/w5m5_implementation` 实现关卡；主代理独立验收并负责最后的加载边界整改，Sol 对整改作只读复核。没有并发写入共享源码。

## 玩家行为与证明

- 一份可见 CodeMirror Python 程序包含九个函数，每次运行整份程序，函数定义顺序可调整。
- 默认依次诊断循环外登记、三清观漏调用、天气参数未绑定、后续小函数调用顺序；只突出第一个阻塞，真实完整轨迹仍可查看。
- 受限的同源 Pyodide Worker 真正执行程序，主线程独立推导并逐字段核对轨迹。隐藏答案、stdout、React 状态不能决定成功。
- 火眼金睛、提示与失败行定位不改代码、不代运行；失败零惩罚。
- 草稿、运行记录、失败快照、作品、家长摘要、刷新恢复、导入导出和只读真实回放保持一致。
- 只有 W5-M5 正式证明解锁 W6-M1；旧 W5-M5 只保留 `legacy-replay-only` 历史。既有正式证明、作品、装备和历史得到保留。
- 不安全语法、伪造轨迹或证明、加载失败、超时、取消、迟到响应、保存失败与跨标签页冲突均不能误通关。

## 首页体积整改

原先 entry 183.4 KiB gzip 超过 180 KiB。没有提高预算或削弱校验，改为：

1. 家长页面、周报汇总与学习支持文案随家长路由加载。
2. 家长 PIN 操作与启动时所需的存档格式校验分开。
3. 保存操作沿用原有协调器的延迟加载边界；同步读档、队列、Web Locks、CAS、快照、损坏原文保护和回滚顺序保持不变。
4. 家长清理键枚举归入家长数据模块；图片地址函数独立分包，场景不再经它引入整个进度上下文。

16 个移动函数的 AST 函数体与整改前完全一致，见 `artifacts/w5m5-independent/module-move-equivalence.json`。复核发现的 storage 反向导出循环已移除。构建检查同时验证家长汇总与写入模块不进入首页、场景不引入进度上下文，以及 W5-M5 Worker 缺失、重复和超预算时必须拒绝。

最终首页 entry **184168 B / 184320 B（179.9 / 180 KiB）**；首页总资源 **554.2 / 650 KiB**。首页余量仅 152 B，后续课程改动仍必须经过现有硬门禁。

## 最终正式验证

以下记录均来自最终源码状态，使用 `verify:record` 保留原始输出；验收前另以 `verify:reuse` 核对指纹。

| 范围 | 结果 | 耗时 | 本地证据目录（均位于 artifacts/verification/） |
| --- | --- | --- | --- |
| 全量 unit | 186 文件，1973/1973 | 92.64s | `1789137581474-167dc316` |
| Typecheck | exit 0 | 5.29s | `1789137580293-9c24043b` |
| verify:bundle：工程合同、production build、资源预算 | 243/243，构建及全部预算通过 | 11.43s | `1789137544153-a7da3266` |
| 素材合同 | 59/59 | 2.67s | `1789137582656-6cea1ecf` |
| 素材与真实槽位门禁 | exit 0 | 1.66s | `1789137583842-e01888ab` |
| 验证记录工作流 | 5/5 | 0.75s | `1789137585076-10d28854` |
| 浏览器联合矩阵 | 52/52，无跳过、失败、重试 | 340.28s | `1789137763110-f0de4ef2` |

浏览器范围：W5-M5 24 项、W5-M4 24 项、第一关真实 Blockly 完整路径 4 项；W5 两关均覆盖 desktop Chromium、desktop Firefox、tablet WebKit、mobile Chromium、320px narrow Chromium，保持 workers=1、retries=0。每关覆盖完整修错、正式完成、刷新、回放、家长导出清空再导入，以及适用的键盘、保存失败、安全、素材、损坏、外部冲突、运行故障、历史迁移和冷启动检查。

完整报告：`artifacts/w5m5-final-browser-v2/report.json`；HTML：`artifacts/w5m5-final-browser-v2/html/index.html`；截图、冷启动 JSON 与附件：`artifacts/w5m5-final-browser-v2/results/`。这些是本地保留产物，不是已发布站点。

记录命令：

```sh
env PLAYWRIGHT_HTML_OUTPUT_DIR=artifacts/w5m5-final-browser-v2/html PLAYWRIGHT_JSON_OUTPUT_NAME=artifacts/w5m5-final-browser-v2/report.json npm run verify:record -- npx playwright test e2e/week-five-story-orchestration.spec.ts e2e/week-five-problem-decomposition.spec.ts e2e/dragon-palace-code-battle.spec.ts --grep '@w5-m[45]-|@full ' --output artifacts/w5m5-final-browser-v2/results --reporter line,json,html
```

## 独立验证与实际性能

- Parser 1505/1505、CPython 可运行轨迹 1499/1499、真实 Chromium Pyodide Worker 25/25、篡改轨迹 9/9 拒绝。对应核心源码哈希未改变，保留在 `artifacts/w5m5-independent/acceptance-summary.json`。
- 整改后重新构建并执行 proof 探针，17/17 通过，包括正式解锁、幂等、导入导出一致性、旧记录保留、缺少前置证明、篡改源码/作品/轨迹与旧历史迁移。
- 新增家长页面加载检查 5/5：首页未请求家长/写入模块，503 出现可见反馈，原存档不变，重新加载回到真实 PIN 门，授权前无周报 DOM。见 `parent-lazy-browser-result.json` 与 `parent-lazy-recovered.png`。
- W5-M5 路由加真实 Worker 共 1214385 B / 3 MiB，Pyodide 13544397 B / 15 MiB；批准背景与单素材预算通过。
- Chromium 三配置使用 10 Mbps、4 倍 CPU 限速：首次真实结果 13.49–13.52s / 20s，热运行 0.31–0.33s / 1s。Firefox 与 WebKit 属兼容性测量，未施加 Chromium CDP 限速。
- 五配置完整数据见 `artifacts/w5m5-independent/final-cold-metrics.json`，总验收见 `artifacts/w5m5-independent/final-audit.json`。

## 保留的失败与修复历史

初次关卡缺失红灯、语义/Worker 差异与素材旧槽位错误保留在早期记录及 `*-initial-failure.json`。前一阶段浏览器直接运行没有完整保留原报告，故当时不能用作最终正式证据；本次 52 项完整矩阵补齐该缺口。

本次首次浏览器命令因 grep 行首锚点匹配不到带文件名前缀的完整测试名而未运行测试，保留 `1789137702059-b7a2e884` 及 `artifacts/w5m5-final-browser/`；修正选择器后完整执行 52 项。工程合同首次漏计新增 Worker 的测试库存，已补齐并增加 W5-M5 缺失/超限用例。上述失败未覆盖或隐藏。

全站浏览器、人工读屏器与公网部署仍不在本次验证范围；旧关卡未选入本次矩阵的历史 revision 断言维护，不应被解释为全站已绿。测试进程及本次 5195 临时预览已退出，既有服务与原有未跟踪资料保留。
