import { describe, expect, it } from 'vitest';
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
import { createMissionSession, recordRun } from './session';

const NOW = '2026-07-15T06:00:00.000Z';
const wrongWeaponTrace: RuyiStaffInstruction[] = [
  { instructionId: 'instruction:inspect', sourceBlockId: 'inspect', opcode: 'inspect_weights' },
  { instructionId: 'instruction:sabre', sourceBlockId: 'sabre', opcode: 'choose_sabre' },
];

describe('progress rules', () => {
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
