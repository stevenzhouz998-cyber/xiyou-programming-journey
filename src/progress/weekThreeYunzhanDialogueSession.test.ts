import { describe, expect, it } from 'vitest';
import { compileYunzhanDialogueDraft, createDefaultYunzhanDialogueDraft, runYunzhanDialogueForDraft } from '../blockly/weekThreeYunzhanDialogueContract';
import { createMissionSession, recordCompileFailure, recordRun, updateWorkspaceDraft } from './session';
import { parseYunzhanDialogueSession } from './yunzhanDialogueSessionSchema';
import { createInitialProgress, migrateProgress } from './schema';

const NOW = '2026-08-27T10:00:00.000Z';

describe('W3-M3 session 保存合同', () => {
  it('结构错误只增加编译失败，不成为有效运行或火眼金睛快照', () => {
    const session = createMissionSession('w3-m3', NOW);
    const invalid = structuredClone(session.workspace); invalid.blocks = invalid.blocks.filter((block) => block.id !== 'yunzhan-condition');
    const changed = updateWorkspaceDraft(session, invalid, NOW);
    const saved = recordCompileFailure(changed, 'program-structure', NOW);
    expect(saved).toMatchObject({ totalRuns: 0, compileFailures: 1, failureSnapshot: null });
  });

  it('有效失败从已保存图重放并得到不可变观察快照；改图会清空旧快照', () => {
    const session = createMissionSession('w3-m3', NOW);
    const trace = compileYunzhanDialogueDraft(session.workspace);
    const result = runYunzhanDialogueForDraft(session.workspace, trace);
    const recorded = recordRun(session, result, trace, NOW);
    expect(recorded.failureSnapshot?.roundId).toBe('wukong-identity');
    const corrected = structuredClone(recorded.workspace);
    const then = corrected.blocks.find((block) => block.id === 'yunzhan-then-action')!;
    const otherwise = corrected.blocks.find((block) => block.id === 'yunzhan-else-action')!;
    [then.branch, otherwise.branch] = [otherwise.branch, then.branch];
    expect(updateWorkspaceDraft(recorded, corrected, NOW)).toMatchObject({ lastRun: null, failureSnapshot: null });
  });

  it('改图后可保留累计失败与观察审计，但当前运行证据必须完整清空', () => {
    const initial = createMissionSession('w3-m3', NOW); const trace = compileYunzhanDialogueDraft(initial.workspace); const failed = recordRun(initial, runYunzhanDialogueForDraft(initial.workspace, trace), trace, NOW);
    const changed = updateWorkspaceDraft(failed, structuredClone(failed.workspace), NOW);
    expect(parseYunzhanDialogueSession(changed)).toMatchObject({ totalRuns: 1, lastRun: null, lastTrace: [], failureSnapshot: null });
  });

  it('严格 parser 拒绝伪造 trace 或 run，并且只接受可重编译重放的保存数据', () => {
    const initial = createMissionSession('w3-m3', NOW);
    const trace = compileYunzhanDialogueDraft(initial.workspace);
    const session = recordRun(initial, runYunzhanDialogueForDraft(initial.workspace, trace), trace, NOW);
    expect(parseYunzhanDialogueSession(structuredClone(session))).toEqual(session);
    const forged = structuredClone(session); forged.lastTrace[0]!.opcode = 'guard-cave';
    expect(() => parseYunzhanDialogueSession(forged)).toThrow(/重新编译|确定性/);
  });

  it('将 revision 4 升至 5，并把既有 W3-M3 完成记录隔离为 legacy-preformal', () => {
    const legacy = createInitialProgress();
    legacy.schemaRevision = 4;
    legacy.missions['w3-m3'] = { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: NOW };
    const migrated = migrateProgress(legacy);
    expect(migrated.schemaRevision).toBe(7);
    expect(migrated.missionCompletionEvidence['w3-m3']).toMatchObject({ kind: 'legacy-preformal', completedAt: NOW });
  });
});
