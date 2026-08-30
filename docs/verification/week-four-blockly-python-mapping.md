# W4-M1 Blockly 到 Python 映射验证记录

## 范围与完成边界

本记录覆盖 W4-M1「积木变代码」的单关双轨等价循环：可见 Blockly 参考图、受限 Python Worker、保存作品、正式证明、刷新回放、导入恢复、家长摘要和 W4-M2 解锁。它支持的最高证据等级是 **One-level playable**。

W4-M2 至 W4-M5 仍是 legacy；第四周系统闭环、30 关完整验证、商业生产完成和公开部署均为 **not complete**。

## 已核实的本地证据

- 课程：W4-M1 是唯一正式且可执行的第四周关卡；不进入 legacy `expectedSequence`、`expectedOutput`、`MissionTools` 或通用 Python 通关路径。
- 双轨：Blockly 编译与 Python exact allowlist grammar 都按两张公开卡产生 typed trace；成功要求字段、值、真假、动作、场景状态和稳定来源逐项一致。
- Worker：Pyodide `314.0.2` 固定同源目录、五个核心文件、MPL-2.0 与 hash/size inventory 由 runtime contract 校验；Worker 使用 Python AST allowlist、空 builtins、独立卡片环境和 request ID。
- 保存：revision 8 绑定当前 workspace、Python、trace、run、work 与 formal-v3 proof；W1/W2/W3 旧版含 W4-M1 完成迁移为 `legacy-replay-only`，而 revision < 8 伪造 W4 session 会被拒绝。
- 回放：正式完成后的同代码回放真实启动 Worker 并重新比较两张公开卡，但不写入 session、evidence、work 或 attempts。
- 资产：两张 W4-M1 WebP 的精确 inventory、SHA-256、尺寸、alpha、来源记录和实际 `WeekFourMappingScene` slot 已由 asset gate 校验；manifest 的 visual-QA 记录与 prompt record 一致。

## 最新运行结果

- `npm test`：138 个测试文件、1372 个单元测试通过；194 个 bundle/runtime/source contract 通过；50 个素材合同测试通过。
- `npm run typecheck`：通过。
- `npm run verify:bundle`：生产构建与预算通过；首页保守总量 494.6 KiB / 650 KiB，W4-M1 lazy closure 1684.0 KiB / 3 MiB。
- W4-M1 五项目真实浏览器矩阵：26/26 通过，覆盖桌面 Chromium、平板 WebKit、移动 Chromium、桌面 Firefox、320px 窄屏；包含鼠标、键盘、触控、存储故障、跨标签、损坏恢复、资源/懒加载故障、安全探针、父母端、作品与同源 runtime。
- 桌面 Chromium 冷启动实测：本地页面资源 1,107,837 bytes；固定 Pyodide 核心 13,544,397 bytes；冷启动约 12.21 秒，热运行约 217 毫秒。
- 旧 V2 含 W4 完成状态的五项目导入回归：5/5 通过；W3-M4 父母端导出导入定点回归：1/1 通过。
- 首次全站 445 条浏览器回归为 412 通过、33 失败；其中本次新增的 5 条旧 V2 导入失败和 1 条 W3-M4 父母端导入失败已由上述定点回归消除。其余失败集中在既有首页/W1 体积预算与旧关卡存储/键盘偶发项；修复后未再次运行完整 445 条，因此不把全站状态表述为全部通过。

## Completion matrix 摘要

| 相关系统 | 当前证据 | 仍缺少的全局项 |
| --- | --- | --- |
| Course / 30 levels | W4-M1 单关正式路径、前置和解锁可验证 | 其余 29 关与全内容证据 |
| Blockly | 真实 workspace、strict draft/compiler、持久化 trace | 周级系统闭环 |
| Python | 同源 Worker、AST allowlist、grammar/proof 绑定、五项目真实浏览器复验 | 全站旧关卡性能债 |
| Parent / saves | work/proof、迁移、CAS、故障门禁与摘要 | 全站导出导入审计 |
| UI / release | 响应式/键盘/触控/素材/预算合同 | 公开部署、全站性能与可访问性证据 |

## 残余风险与待复验

- W4 五项目、生产构建与本次跨周回归均已独立复验；完整 445 条全站回归没有在修复后再次运行，残留的旧首页/W1 性能预算与少数旧关卡偶发失败仍需单独治理。
- 本记录不构成公开部署验证；部署、404、线上性能与儿童隐私发布检查仍未完成。
