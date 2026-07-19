import * as Blockly from 'blockly';
import { describe, expect, it } from 'vitest';
import { runFourSeasRegalia } from '../battle/fourSeasRegalia';
import {
  completeMission,
  createInitialProgress,
  getWeeklyReport,
  importProgress,
  isMissionUnlocked,
  serializeProgress,
} from './progress';
import { runRuyiStaffBattle } from '../battle/ruyiStaff';
import type { RuyiStaffInstruction } from '../battle/types';
import { registerFourSeasRegaliaBlocks } from '../blockly/fourSeasRegaliaBlocks';
import { compileFourSeasRegaliaWorkspace } from '../blockly/fourSeasRegaliaCompiler';
import { loadFourSeasWorkspaceDraft, type FourSeasWorkspaceDraftV1 } from '../blockly/fourSeasRegaliaDraft';
import { createMissionSession, recordRun, updateWorkspaceDraft } from './session';

const NOW = '2026-07-15T06:00:00.000Z';
const wrongWeaponTrace: RuyiStaffInstruction[] = [
  { instructionId: 'instruction:inspect', sourceBlockId: 'inspect', opcode: 'inspect_weights' },
  { instructionId: 'instruction:sabre', sourceBlockId: 'sabre', opcode: 'choose_sabre' },
];

function recordedFourSeasSession() {
  const draft: FourSeasWorkspaceDraftV1 = {
    version: 1,
    blocks: [
      { id: 'request', type: 'xiyou_request_regalia', nextId: 'collect', parentBlockId: null, x: 0, y: 0 },
      { id: 'collect', type: 'xiyou_collect_gifts', nextId: 'equip', parentBlockId: null, x: 10, y: 10 },
      { id: 'boots-gift', type: 'xiyou_receive_cloud_boots', nextId: 'armor-gift', parentBlockId: 'collect', x: 20, y: 20 },
      { id: 'armor-gift', type: 'xiyou_receive_golden_armor', nextId: 'crown-gift', parentBlockId: 'collect', x: 30, y: 30 },
      { id: 'crown-gift', type: 'xiyou_receive_purple_crown', nextId: null, parentBlockId: 'collect', x: 40, y: 40 },
      { id: 'equip', type: 'xiyou_equip_regalia', nextId: 'verify', parentBlockId: null, x: 50, y: 50 },
      { id: 'crown-wear', type: 'xiyou_wear_crown', nextId: 'armor-wear', parentBlockId: 'equip', x: 60, y: 60 },
      { id: 'armor-wear', type: 'xiyou_wear_armor', nextId: 'boots-wear', parentBlockId: 'equip', x: 70, y: 70 },
      { id: 'boots-wear', type: 'xiyou_wear_boots', nextId: null, parentBlockId: 'equip', x: 80, y: 80 },
      { id: 'verify', type: 'xiyou_verify_regalia', nextId: null, parentBlockId: null, x: 90, y: 90 },
    ],
  };
  registerFourSeasRegaliaBlocks();
  const workspace = new Blockly.Workspace();
  try {
    loadFourSeasWorkspaceDraft(workspace, draft);
    const compiled = compileFourSeasRegaliaWorkspace(workspace);
    if (!compiled.ok) throw new Error('expected w1-m3 fixture to compile');
    const initial = updateWorkspaceDraft(createMissionSession('w1-m3', NOW), draft, NOW);
    return recordRun(initial, runFourSeasRegalia(compiled.trace), compiled.trace, NOW);
  } finally {
    workspace.dispose();
  }
}

describe('progress rules', () => {
  it('persists completed w1-m3 and unlocks w1-m4 across export-import without replay attempts', () => {
    let progress = createInitialProgress();
    progress = completeMission(progress, 'w1-m1', { stars: 2, hintsUsed: 0 });
    progress = completeMission(progress, 'w1-m2', { stars: 2, hintsUsed: 0 });
    progress = { ...progress, sessions: { ...progress.sessions, 'w1-m3': recordedFourSeasSession() } };
    expect(progress.missions['w1-m3']).toBeUndefined();
    progress = completeMission(progress, 'w1-m3', { stars: 3, hintsUsed: 1 });

    const reopened = importProgress(serializeProgress(progress));
    expect(reopened.sessions['w1-m3']).toEqual(progress.sessions['w1-m3']);
    expect(reopened.missions['w1-m3']).toMatchObject({ attempts: 1, hintsUsed: 1 });
    expect(isMissionUnlocked(reopened, 'w1-m4')).toBe(true);

    const replaySaved = { ...reopened, sessions: { ...reopened.sessions, 'w1-m3': recordedFourSeasSession() } };
    expect(replaySaved.missions['w1-m3']).toEqual(reopened.missions['w1-m3']);
  });

  it('aggregates all three week-one sessions and maps repeated w1-m3 failures to task decomposition', () => {
    const progress = createInitialProgress();
    progress.sessions['w1-m1'] = {
      ...createMissionSession('w1-m1', NOW),
      totalRuns: 2,
      compileFailures: 1,
    };
    progress.sessions['w1-m2'] = {
      ...createMissionSession('w1-m2', NOW),
      totalRuns: 3,
      runtimeFailures: 2,
    };
    progress.sessions['w1-m3'] = {
      ...recordedFourSeasSession(),
      totalRuns: 4,
      runtimeFailures: 3,
      compileFailures: 2,
      conceptFailures: { programStructure: 2, sequencePrecondition: 2, completeness: 2 },
    };

    expect(getWeeklyReport(progress, 1)).toMatchObject({
      sessionRuns: 9,
      sessionAdjustments: 8,
      needsSupport: ['任务分解'],
    });
  });
  it('unlocks missions in order and requires the boss before the next week', () => {
    let progress = createInitialProgress();
    expect(isMissionUnlocked(progress, 'w1-m1')).toBe(true);
    expect(isMissionUnlocked(progress, 'w1-m2')).toBe(false);

    for (let order = 1; order <= 4; order += 1) {
      progress = completeMission(progress, `w1-m${order}`, { stars: 2, hintsUsed: 1 });
    }
    expect(isMissionUnlocked(progress, 'w1-m5')).toBe(true);
    expect(isMissionUnlocked(progress, 'w2-m1')).toBe(false);

    progress = completeMission(progress, 'w1-m5', { stars: 3, hintsUsed: 0 });
    expect(isMissionUnlocked(progress, 'w2-m1')).toBe(true);
  });

  it('keeps the best star score while making repeated completion counters idempotent', () => {
    let progress = createInitialProgress();
    progress = {
      ...progress,
      privacy: { localDataNoticeSeen: true },
      recovery: { lastRecoveredAt: '2026-07-12T00:00:00.000Z', source: 'snapshot' },
    };
    progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress = completeMission(progress, 'w1-m1', { stars: 1, hintsUsed: 2 });

    expect(progress.missions['w1-m1']).toMatchObject({ stars: 3, attempts: 1, hintsUsed: 0, status: 'completed' });
    expect(progress).toMatchObject({
      version: 3,
      schemaRevision: 1,
      sessions: {},
      privacy: { localDataNoticeSeen: true },
      recovery: { lastRecoveredAt: '2026-07-12T00:00:00.000Z', source: 'snapshot' },
    });
  });

  it('preserves the first completion counters and timestamp across a repeated success', () => {
    const first = completeMission(createInitialProgress(), 'w1-m1', { stars: 1, hintsUsed: 2 });
    const firstRecord = structuredClone(first.missions['w1-m1']);
    const repeated = completeMission(first, 'w1-m1', { stars: 3, hintsUsed: 2 });

    expect(repeated.missions['w1-m1']).toEqual({
      ...firstRecord,
      stars: 3,
      attempts: 1,
      hintsUsed: 2,
    });
  });

  it('normalizes completion input so the returned V3 remains schema-valid', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: Number.NaN, hintsUsed: 1.5 });
    expect(() => importProgress(serializeProgress(progress))).not.toThrow();
  });

  it('rejects an unknown mission id', () => {
    expect(() => completeMission(createInitialProgress(), 'unknown-mission', { stars: 2, hintsUsed: 0 }))
      .toThrow('任务编号无效');
  });

  it('rejects attempts overflow instead of returning an invalid V3', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 0 });
    progress.missions['w1-m1'].attempts = Number.MAX_SAFE_INTEGER;
    expect(() => completeMission(progress, 'w1-m1', { stars: 2, hintsUsed: 0 }))
      .toThrow('任务进度计数超出安全范围');
  });

  it('rejects hints overflow instead of returning an invalid V3', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 0 });
    progress.missions['w1-m1'].hintsUsed = Number.MAX_SAFE_INTEGER;
    expect(() => completeMission(progress, 'w1-m1', { stars: 2, hintsUsed: 1 }))
      .toThrow('任务进度计数超出安全范围');
  });

  it('builds a parent report from local progress', () => {
    let progress = createInitialProgress();
    progress = completeMission(progress, 'w1-m1', { stars: 2, hintsUsed: 2 });
    progress = completeMission(progress, 'w1-m2', { stars: 3, hintsUsed: 0 });

    expect(getWeeklyReport(progress, 1)).toMatchObject({ completed: 2, total: 5, stars: 5, hintsUsed: 2 });
  });

  it('merges the first real mission session support into the week-one parent report', () => {
    const progress = createInitialProgress();
    progress.sessions['w1-m1'] = {
      ...createMissionSession('2026-07-15T06:00:00.000Z'),
      totalRuns: 3,
      runtimeFailures: 1,
      compileFailures: 1,
      conceptFailures: { programStructure: 2, sequencePrecondition: 0, completeness: 0 },
    };

    expect(getWeeklyReport(progress, 1)).toMatchObject({
      needsSupport: ['程序结构'],
    });
    expect(getWeeklyReport(progress, 2).needsSupport).toEqual([]);
  });

  it('aggregates both implemented week-one sessions and preserves mission-specific support wording', () => {
    const progress = createInitialProgress();
    progress.sessions['w1-m1'] = {
      ...createMissionSession('w1-m1', NOW),
      totalRuns: 3,
      runtimeFailures: 2,
      compileFailures: 1,
      conceptFailures: { programStructure: 0, sequencePrecondition: 2, completeness: 0 },
    };
    let ruyi = createMissionSession('w1-m2', NOW);
    ruyi = recordRun(ruyi, runRuyiStaffBattle(wrongWeaponTrace), wrongWeaponTrace, NOW);
    ruyi = recordRun(ruyi, runRuyiStaffBattle(wrongWeaponTrace), wrongWeaponTrace, NOW);
    progress.sessions['w1-m2'] = ruyi;

    expect(getWeeklyReport(progress, 1)).toMatchObject({
      sessionRuns: 5,
      sessionAdjustments: 5,
      needsSupport: ['顺序与前置条件', '数值比较'],
    });
    expect(getWeeklyReport(progress, 2)).toMatchObject({ sessionRuns: 0, sessionAdjustments: 0 });
  });

  it('fails closed when weekly session run aggregation exceeds the safe integer range', () => {
    const progress = createInitialProgress();
    progress.sessions['w1-m1'] = {
      ...createMissionSession('w1-m1', NOW),
      totalRuns: Number.MAX_SAFE_INTEGER,
    };
    progress.sessions['w1-m2'] = {
      ...createMissionSession('w1-m2', NOW),
    };

    expect(getWeeklyReport(progress, 1).sessionRuns).toBe(Number.MAX_SAFE_INTEGER);
    progress.sessions['w1-m2'].totalRuns = 1;
    expect(() => getWeeklyReport(progress, 1)).toThrow('任务进度计数超出安全范围');
  });

  it('fails closed when weekly session adjustment aggregation exceeds the safe integer range', () => {
    const progress = createInitialProgress();
    progress.sessions['w1-m1'] = {
      ...createMissionSession('w1-m1', NOW),
      compileFailures: Number.MAX_SAFE_INTEGER,
    };
    progress.sessions['w1-m2'] = {
      ...createMissionSession('w1-m2', NOW),
    };

    expect(getWeeklyReport(progress, 1).sessionAdjustments).toBe(Number.MAX_SAFE_INTEGER);
    progress.sessions['w1-m2'].runtimeFailures = 1;
    expect(() => getWeeklyReport(progress, 1)).toThrow('任务进度计数超出安全范围');
  });

  it('persists exact w1-m2 session evidence, unlocks w1-m3 only on completion, and does not count replay as an attempt', () => {
    let progress = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 0 });
    const session = recordRun(
      createMissionSession('w1-m2', NOW),
      runRuyiStaffBattle(wrongWeaponTrace),
      wrongWeaponTrace,
      NOW,
    );
    progress = { ...progress, sessions: { ...progress.sessions, 'w1-m2': session } };

    expect(progress.missions['w1-m2']).toBeUndefined();
    expect(isMissionUnlocked(progress, 'w1-m3')).toBe(false);
    const roundTripped = importProgress(serializeProgress(progress));
    expect(roundTripped.sessions['w1-m2']).toEqual(session);

    const completed = completeMission(roundTripped, 'w1-m2', { stars: 3, hintsUsed: 1 });
    expect(completed.missions['w1-m2']).toMatchObject({ attempts: 1 });
    expect(completed.sessions['w1-m2']).toEqual(session);
    expect(isMissionUnlocked(completed, 'w1-m3')).toBe(true);
  });

  it('round-trips valid exports and rejects corrupted data', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 1 });
    expect(importProgress(serializeProgress(progress))).toEqual(progress);
    expect(() => importProgress('{broken')).toThrow('进度文件无法读取');
    expect(() => importProgress('{"version":999}')).toThrow('进度版本不受支持');
  });

});
