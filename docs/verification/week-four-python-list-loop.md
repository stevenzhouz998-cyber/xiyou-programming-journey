# W4-M4 逐项观察册验收记录

日期：2026-09-09。工作区 `/Users/macmini-zz/.codex/worktrees/5806/少儿编程学习网页`，基线 HEAD `db2188477c233c7366bbe5017573bc80525fb9bd`，分支 `codex/w4-m3-branch-structure`。本次用户授权代理选定方案并完成本地实现与验收；2026-09-11 追加授权提交与推送，未授权合并、安装或部署。

状态：**W4-M4 One-level playable（本地）**。完整五项目 28/28，两个联合验收失败已经修复并复验；2026-09-11 按用户授权进入提交与推送；实际提交及远端状态以 Git 为准，未合并或部署。

## 产品与因果链

W4-M4「第三次变化」升级为正式 Python 列表与循环关卡。默认列表交换前两次变化，循环又每次记录固定“老翁”；两个独立错误需要分别修正。孩子编辑可见 CodeMirror 或同源快捷选择，二者改动同一份代码；公开原著参考提供历史事实，运行观察表只展示真实每轮 item 与记录值。空、重复、漏项、顺序错和固定文字错都是可保存的学习失败，零生命/资源/星级惩罚。

可见代码先保存，经有限 grammar 与独立 Worker AST 允许列表后真正编译执行，记录真实列表值和每轮回调参数；同步语义只用于验证 Worker、存档与导入，不作为执行替代。不依赖 expectedSequence、expectedOutput、stdout 文本或 React 成功标记。最多五项、有界循环；导入、属性/文件/浏览器访问、无限循环和额外调用拒绝执行。

Progress revision 11。独立 session、作品 `w4-m4-list-loop-record`、formal-v3 证明；成功原子保存并持久解锁 W4-M5。前置要求正式 W4-M3。历史完成只迁移 legacy-replay-only，保留原完成时间，真实重玩才升级；正式回放真实执行但不改写作品、证明、进度或次数。新编辑/新运行清除旧观察。家长摘要统计列表与逐项记录困难并分离环境故障。W4-M1/M2/M3 原有作品与证明不被新关改写。

原著被逐情节为固定尾声，既不是孩子命令，也不是学习失败惩罚。复用来源已经核实的白虎岭背景（1280×720、121314 bytes），以真实数据表作为观察结果；没有生成新插画或加入占位素材。

## 已有有效检查

| 检查 | 结果 | 本地记录 |
| --- | --- | --- |
| 最终类型检查 | 通过，5.640 秒 | `artifacts/verification/1788889987943-b7f3d5b8/` |
| 最终 W4-M4 五项目 | **28/28，196.921 秒，workers=1、retries=0，执行前后指纹一致**；完整流程、44px、键盘、保存五故障、跨标签、安全、运行/素材/入口恢复、旧档升级、损坏恢复、静音/减弱动画、五端性能 | `artifacts/verification/1788889965775-c32025ad/` |
| W4-M1–M4 联合浏览器 | 116/118，679.990 秒；M1 26/26、M2 34/34、M3 30/30，M4 26/28。workers=1、retries=0，不能称本次联合全绿 | `artifacts/verification/1788888730205-482d6b06/` |
| 全量单元 | 162 文件，1779/1779，88.869 秒；包含有意先失败再修复的稀疏 trace 回归 | `artifacts/verification/1788888570177-36bbd8ca/` |
| 独立 Python 等价语义 | 覆盖全部 1456 个有界列表/记录组合，实际 Python AST/执行 trace 与 TS 校验一致；属于 native Python 对照，不冒充 Pyodide 浏览器 | `src/engine/weekFourListWorkerParity.test.ts`，同上单元记录 |
| 构建与预算 | 最终工程测试、生产构建、预算通过，15.813 秒；主/备用 W4-M4 closure 含唯一 Worker 约 984.8 KiB raw / 289.0 KiB gzip | `artifacts/verification/1788890044992-1285b375/` |
| 素材发布门禁 | 通过，1.083 秒，新增使用位置仅为背景，旧老妇与路线素材仍只属于 W4-M3 | `artifacts/verification/1788888755042-92a7ead5/` |
| 素材合同 | 56/56，1.911 秒测试耗时 | `artifacts/verification/1788888756326-fefa868d/` |

全量单元完成后只更新了工程预算测试和素材使用清单，未改被测玩家逻辑。联合浏览器启动期间修正了素材清单中两条误附的 W4-M4 使用位置，没有改动源码、实际素材或构建；保守记录器会据此拒绝自动复用，需按实际改动范围区分，不伪称指纹一致。联合命令本身也因下面两项失败返回1，并非只有指纹不一致。修复仅修改本关 select 高度和本关故障测试的入口定位，旧关90项有效证据保留；本关重新完整五项目验收。

## 最终视觉与性能

主代理检查桌面、手机、平板与320px窄屏实际通关截图；五项目截图及测量 JSON 保存于 `artifacts/w4m4-acceptance-final/`。截图中的前置关卡属于隔离测试存档；平板截图拍于刷新后，运行环境短暂显示加载中，随后实际重玩和导出导入继续通过。

| 项目 | 冷首次结果 | 热运行 | 测量环境 |
| --- | --- | --- | --- |
| desktop-chromium-1440x1024 | 13.418 秒 | 185.4 ms | 10mbps-4x-cpu-cdp |
| desktop-firefox-1440x1024 | 7.094 秒 | 184.6 ms | native-engine-compatible-no-cdp |
| mobile-chromium-390x844 | 13.48 秒 | 208.3 ms | 10mbps-4x-cpu-cdp |
| narrow-chromium-320x844 | 13.472 秒 | 219.0 ms | 10mbps-4x-cpu-cdp |
| tablet-webkit-768x1024 | 3.015 秒 | 163.1 ms | native-engine-compatible-no-cdp |

预算分别为20秒与1000ms。Firefox 对 mjs 的性能资源条目不完整，记录如实列出两个 missingCompatibilityFiles；实际兼容文件由同源 HTTP 响应与总字节校验补证，未按缺失条目计算为零。本地固定运行包 13,544,397 bytes，低于15 MiB。

## 开发中发现并解决

- 独立 Worker Python 字符串引号转义错误导致环境失败；实际 harness 执行定位后修复，再通过真实 Worker 测试。
- 快捷选择默认显示值与 print 固定文字不一致；修正显示解析，使控件与当前代码一致。
- 稀疏数组可以使 every 比较跳过缺项；先复现虚假成功，再在本关 trace 边界要求普通、稠密、精确字段数组。运行、导入与作品不得接受缺项轨迹。
- 原课程列表仍保留 legacy W4-M4，导致 31 项；正式注册后移除该旧入口，保持六周30关及 W4-M5 旧配置。
- 导入后家长重新设置测试需等待实际输入稳定；沿用已有稳定填写方法。键盘验收采用可见编辑器真实键入与 Tab 离开，避免把原生 select 的平台 Home 行为当作编辑器故障。

- 联合验收捕获 WebKit 原生 select 忽略 min-height，实测触控高度仅18px；增加明确 height:44px，由原有五端触控尺寸断言验收。
- 懒加载故障拦截使用同名宽泛正则，误拦共享 CSS 依赖包装模块；改由生产 manifest 精确定位主入口，保留备用 URL 独立性断言，仍真实返回503后重试真实模块，不延长超时、不加重试或跳过。

## 验收范围和不成立的外推

完成证据等级为 W4-M4 One-level playable。五项目维持 desktop Chromium 1440×1024、tablet WebKit 768×1024、mobile Chromium 390×844、desktop Firefox 1440×1024、narrow Chromium 320×844，workers=1、retries=0。预算：本关 closure 含 Worker ≤3 MiB，固定同源 Pyodide ≤15 MiB，冷首次结果≤20秒、热结果≤1秒。Chromium 按10Mbps/4×CPU测量；WebKit/Firefox 原生环境另列。

W4-M5、第四周 System loop complete、30关 Full-content verified、全站通过与 Commercial production complete 仍为 not complete。之前全站508项审计473通过/35失败及随后W4-M3专项修正，是历史证据；其余30个已归类实例仍是全站验收缺口，本次不把专项通过或新的单元全绿当作全站绿灯。未执行公开部署/线上验证，未做人工屏幕阅读器朗读。

本地预览由代理启动于 `http://127.0.0.1:4175/xiyou-programming-journey/#/mission/w4-m4` 并在 Codex 浏览器打开。新预览存档按正式前置锁定；浏览器测试只预置前三关的测试前置，不注入本关成功。验收截图不等于用户实际存档。
