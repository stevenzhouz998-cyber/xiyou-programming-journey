# 当前开发入口

更新时间：2026-09-11。此索引定位现场，不代表功能已完成。

- 当前工作区：`/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`，分支 `codex/w4-m3-branch-structure`。
- W4-M5 实施基线：`7720af2c4edceeb974fb5bce7969a9ba7e288990`（W4-M4）。W4-M5交付提交号与推送结果见此次交接文档及Git记录；恢复时必须重新检查HEAD、远端与工作树，不覆盖现有文件。
- 最新任务：W4-M5「白骨迷踪总试炼」采用用户已确认的「白虎岭核验站」。同一真实Python程序处理两轮公开卡片；维持第四周视觉方向、历史来源、独立作品、零惩罚失败与原著固定回顾。
- [规格与实施顺序](../superpowers/specs/2026-09-11-week-four-verification-station-design.md)；[验收记录与未闭合项](../verification/week-four-verification-station.md)。本关已达到本地One-level playable：全量单元1810/1810、第四周五关联合浏览器148/148（本关30/30，859.582秒）；类型、构建预算、素材及五端性能通过。
- 当前授权：本地实现与非破坏性验证；2026-09-11用户进一步明确要求做好交接并commit and push，授权本关提交并推送当前分支。未授权合并或部署。
- 主目录 `/Users/macmini-zz/Documents/少儿编程学习网页` 是旧玩家代码入口，不应在那里继续开发。其他工作区、现有node_modules和回归/视觉输出均保留。
- [验证分层与证据复用](verification.md)。新关涉及Progress revision12、独立session/作品/证明、家长摘要、W5-M1解锁；保持W4-M1至M4原作品和证明。

## 恢复时最少检查

在上述工作区运行`git rev-parse HEAD`、`git status --short`。读取当前验收记录及此次涉及文件，有漂移再扩大检查。已确认玩法不重新提问。

## 已有边界

W4-M4 [验收记录](../verification/week-four-python-list-loop.md)保留其One-level playable证据。W4-M3历史全站508项中473通过/35失败、W4-M2旧全站440/471，以及W3-M5 parent历史稳定性问题，都属于既有全站验收缺口；不要把历史失败数冒充当前新测结果。新关联合回归不等于全站通过或商业完成。

Worker公共生命周期暂不提取。各关语法、学习错误、取消、迟到消息和trace校验边界各自保留；避免为少量重复扩大成全局存档重构。
