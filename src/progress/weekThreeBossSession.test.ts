import { describe, expect, it } from 'vitest';
import { runWeekThreeBossDraft, WEEK_THREE_BOSS_COORDINATE_LIMIT } from '../blockly/weekThreeBossContract';
import * as Blockly from 'blockly';
import { restoreWeekThreeBossWorkspace, serializeWeekThreeBossWorkspace } from '../blockly/weekThreeBossWorkspaceCompiler';
import { createSolvedWeekThreeBossDraftForTest } from '../blockly/weekThreeBossTestHelpers';
import { createWeekThreeBossSession, parseWeekThreeBossSession, parseWeekThreeBossWorkspace, recordWeekThreeBossRun } from './weekThreeBossSessionSchema';
import { createMissionSession, recordRun, updateWorkspaceDraft } from './session';

describe('W3-M5 会话保存', () => {
  it('通过统一任务会话保存可重放的运行，并在编辑图后清除当前运行证据但保留计数', () => {
    const initial = createMissionSession('w3-m5', '2026-08-30T00:00:00.000Z');
    const trace = runWeekThreeBossDraft(initial.workspace).trace;
    const failed = recordRun(initial, runWeekThreeBossDraft(initial.workspace), trace, '2026-08-30T00:01:00.000Z');
    expect(failed.totalRuns).toBe(1);
    expect(failed.lastRun?.failure?.concept).toBe('manor-help-specificity');
    const edited = updateWorkspaceDraft(failed, createSolvedWeekThreeBossDraftForTest(), '2026-08-30T00:02:00.000Z');
    expect(edited).toMatchObject({ totalRuns: 1, lastTrace: [], lastRun: null, failureSnapshot: null });
  });

  it('保存唯一图的完整运行事实和四类错误计数，且失败不扣减资源', () => {
    const session = createWeekThreeBossSession('2026-08-30T00:00:00.000Z');
    const failed = recordWeekThreeBossRun(session, runWeekThreeBossDraft(session.workspace), '2026-08-30T00:01:00.000Z');
    expect(failed.totalRuns).toBe(1);
    expect(failed.conceptFailures.manorHelpSpecificity).toBe(1);
    expect(failed.lastRun?.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });

    const solved = { ...failed, workspace: createSolvedWeekThreeBossDraftForTest() };
    const complete = recordWeekThreeBossRun(solved, runWeekThreeBossDraft(solved.workspace), '2026-08-30T00:02:00.000Z');
    expect(complete.lastRun?.completed).toBe(true);
    expect(complete.successfulFullRuns).toBe(1);
  });

  it('持久保留第一次运行阻塞概念，之后编辑和成功都不会抹除它', () => {
    const initial = createMissionSession('w3-m5', '2026-08-30T00:00:00.000Z');
    const failed = recordRun(initial, runWeekThreeBossDraft(initial.workspace), runWeekThreeBossDraft(initial.workspace).trace, '2026-08-30T00:01:00.000Z');
    const edited = updateWorkspaceDraft(failed, createSolvedWeekThreeBossDraftForTest(), '2026-08-30T00:02:00.000Z');
    const complete = recordRun(edited, runWeekThreeBossDraft(edited.workspace), runWeekThreeBossDraft(edited.workspace).trace, '2026-08-30T00:03:00.000Z');
    expect(complete.firstBlockingConcept).toBe('manor-help-specificity');
  });

  it('导入坐标拒绝 NaN/Infinity，有限值规范夹紧后经 session、恢复和序列化保持一致', () => {
    const raw = createMissionSession('w3-m5', '2026-08-30T00:00:00.000Z');
    raw.workspace.blocks[0]!.x = 99_999; raw.workspace.blocks[0]!.y = -99_999;
    const parsed = parseWeekThreeBossSession(raw);
    expect(parsed.workspace.blocks[0]).toMatchObject({ x: WEEK_THREE_BOSS_COORDINATE_LIMIT, y: -WEEK_THREE_BOSS_COORDINATE_LIMIT });
    expect(() => parseWeekThreeBossWorkspace({ ...raw.workspace, blocks: raw.workspace.blocks.map((block, index) => index === 0 ? { ...block, x: Number.NaN } : block) })).toThrow();
    expect(() => parseWeekThreeBossWorkspace({ ...raw.workspace, blocks: raw.workspace.blocks.map((block, index) => index === 0 ? { ...block, y: Number.POSITIVE_INFINITY } : block) })).toThrow();
    const workspace = new Blockly.Workspace();
    expect(restoreWeekThreeBossWorkspace(workspace, parsed.workspace)).toMatchObject({ ok: true });
    expect(serializeWeekThreeBossWorkspace(workspace).blocks[0]).toMatchObject({ x: WEEK_THREE_BOSS_COORDINATE_LIMIT, y: -WEEK_THREE_BOSS_COORDINATE_LIMIT });
  });
});
