# 当前开发入口

更新时间：2026-09-09。本目录以 `7b018ab` 为玩家代码基线，后续仅补充工程入口文档，不包含最新 W4 玩法。

继续开发前读取[当前工作区索引](/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页/docs/engineering/current-work.md)，并在该工作区重新确认 HEAD 和未提交修改。

当前入口：`/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`，分支 `codex/w4-m3-branch-structure`。W4-M3 提交 `b8b7abe` 和工程优化提交 `db21884` 均已推送，继续前重新核实 HEAD。此指针不是合并、清理或覆盖授权。

部署规则：本目录分支的 `.github/workflows/deploy-pages.yml` 仅保留 `workflow_dispatch` 手动触发，普通推送不再自动部署 GitHub Pages。手动部署仍需明确授权，且必须选择经过验收的版本。其他分支可能保留旧配置，合并或部署前应重新核实。历史提交已包含在较新的远端开发分支中，不能将代码备份与上线混为一谈。
