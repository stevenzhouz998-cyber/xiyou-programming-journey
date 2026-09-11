# 当前开发入口

更新时间：2026-09-11。此索引定位现场，不代表全项目完成，也不是提交、推送、合并或部署授权。

- 当前工作区：`/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`；分支 `codex/w4-m3-branch-structure`；实施与验收基线 HEAD `ede141d8b8cd`。W5-M4 的本地实现与正式验证已完成。
- 当前成果：W5-M4「后续比试」已实现三个小函数和一个总函数的问题分解正式关。默认表面文字齐全，但有一处记录归属错误和一处漏调用；真实 Pyodide Worker 会按实际调用层级依次暴露两类问题。失败零惩罚，正式完成保存作品与 formal-v3 证明，刷新、恢复、导入导出、家长摘要、只读真实回放和 W5-M5 解锁均已接通。
- Progress revision 16。W5-M1 至 W5-M3 的正式证明和既有任务、作品、装备保持有效；revision 15 的旧 W5-M4 完成只保留为历史来源。课程仍为 30 关且 W5-M4 只有一条 formal 注册。
- [已批准规格](../superpowers/specs/2026-09-11-week-five-problem-decomposition-design.md)；[验收记录](../verification/week-five-problem-decomposition.md)。共同输入指纹 `90bbe0411ac4…` 下，全量 unit 1949/1949、W5-M3 + W5-M4 五项目浏览器 49/49、239/239 工程契约、类型、生产构建、预算、59/59 素材合同、素材发布门禁和 5/5 工作流门禁均通过。联合矩阵首轮 W5-M4 24/24 通过，W5-M3 五项目因旧 revision 断言得到 44/49；断言修正后重录 49/49，失败记录保留。
- 独立专项已完成：CPython 语义 oracle 与生产 harness parity 各 1567/1567，实际浏览器 Worker 17/17，篡改轨迹 6/6 拒绝，证明与迁移 16/16，可见完整链和反馈定位通过，四视口无横向溢出且控制台错误为零。证据在 `artifacts/w5m4-independent/`。
- W5-M4 达到本地 **One-level playable**。W5-M5 仍为兼容旧内容；第五周 System loop complete、30 关 Full-content verified、全站通过和 Commercial production complete 均为 **not complete**。
- 2026-09-11 用户随后明确授权交接并 commit、push 当前分支；不包含 merge 或 deploy。开始任务前已有的未跟踪审计、`node_modules/`、`regression-results/` 与 `visual-results/` 已保留；新增素材及素材清单由主验收者提供并完成视觉验收。

## 恢复入口

恢复时先核对 HEAD、工作树、规格和验收记录。提交前再次核对 9 份正式证据，均为同一输入指纹且 `reusable: true`。指纹包含 HEAD：提交后仅 HEAD 变化也会使严格复用检查失效，不能改写旧记录冒充新验证；应核对提交内容与验收源码是否一致，后续实质变化按范围重新验证。下一关为 W5-M5「车迟国总试炼」，开始前仍需单独批准其正式玩法，不能把当前 legacy 页面或解锁状态当作完成。

提交检查另发现新文件 `weekFiveDecompositionPythonRunner.ts` 末尾多一个空行，已仅删除该空行。无可执行内容变化；旧9份全量证据保持原样，严格指纹从此不再复用，补充类型与该 runner 专项检查均通过（记录：`artifacts/verification/1789116025223-4d585a12/evidence.json`、`artifacts/verification/1789116026420-d4530aec/evidence.json`）。
