import { describe, expect, it } from 'vitest';
import {
  completeMission,
  createInitialProgress,
  getWeeklyReport,
  importProgress,
  isMissionUnlocked,
  serializeProgress,
} from './progress';

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

  it('keeps the best star score while counting attempts and hints', () => {
    let progress = createInitialProgress();
    progress = {
      ...progress,
      privacy: { localDataNoticeSeen: true },
      recovery: { lastRecoveredAt: '2026-07-12T00:00:00.000Z', source: 'snapshot' },
    };
    progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress = completeMission(progress, 'w1-m1', { stars: 1, hintsUsed: 2 });

    expect(progress.missions['w1-m1']).toMatchObject({ stars: 3, attempts: 2, hintsUsed: 2, status: 'completed' });
    expect(progress).toMatchObject({
      version: 2,
      schemaRevision: 1,
      privacy: { localDataNoticeSeen: true },
      recovery: { lastRecoveredAt: '2026-07-12T00:00:00.000Z', source: 'snapshot' },
    });
  });

  it('normalizes completion input so the returned V2 remains schema-valid', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: Number.NaN, hintsUsed: 1.5 });
    expect(() => importProgress(serializeProgress(progress))).not.toThrow();
  });

  it('rejects an unknown mission id', () => {
    expect(() => completeMission(createInitialProgress(), 'unknown-mission', { stars: 2, hintsUsed: 0 }))
      .toThrow('任务编号无效');
  });

  it('rejects attempts overflow instead of returning an invalid V2', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 0 });
    progress.missions['w1-m1'].attempts = Number.MAX_SAFE_INTEGER;
    expect(() => completeMission(progress, 'w1-m1', { stars: 2, hintsUsed: 0 }))
      .toThrow('任务进度计数超出安全范围');
  });

  it('rejects hints overflow instead of returning an invalid V2', () => {
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

  it('round-trips valid exports and rejects corrupted data', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 1 });
    expect(importProgress(serializeProgress(progress))).toEqual(progress);
    expect(() => importProgress('{broken')).toThrow('进度文件无法读取');
    expect(() => importProgress('{"version":999}')).toThrow('进度版本不受支持');
  });

});
