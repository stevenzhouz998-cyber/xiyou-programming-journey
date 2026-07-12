import { describe, expect, it } from 'vitest';
import { createInitialProgress } from './progress';
import { migrateProgress, parseProgress } from './schema';

const validMission = {
  status: 'completed' as const,
  stars: 2,
  attempts: 1,
  hintsUsed: 0,
  completedAt: '2026-07-12T00:00:00.000Z',
};

const validV1 = {
  version: 1 as const,
  learnerName: '小行者',
  missions: { 'w1-m1': validMission },
  settings: { muted: true, reducedMotion: true, parentPin: '2580' },
  savedAt: '2026-07-12T00:00:00.000Z',
};

describe('progress schema', () => {
  it('migrates V1 to V2 without losing mission or settings data', () => {
    expect(migrateProgress(validV1)).toEqual({
      ...validV1,
      version: 2,
      schemaRevision: 1,
      settings: { ...validV1.settings, reducedMotionOverride: false },
      privacy: { localDataNoticeSeen: false },
      recovery: { lastRecoveredAt: null, source: null },
    });
  });

  it('round-trips a fresh V2 document through JSON parsing', () => {
    const progress = createInitialProgress();
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });

  it('rejects unsupported versions and malformed JSON with stable messages', () => {
    expect(() => parseProgress('{broken')).toThrow('进度文件无法读取');
    expect(() => migrateProgress({ version: 999 })).toThrow('进度版本不受支持');
  });

  it.each([
    ['unknown mission', { ...validV1, missions: { unknown: validMission } }],
    ['stars below range', { ...validV1, missions: { 'w1-m1': { ...validMission, stars: 0 } } }],
    ['stars above range', { ...validV1, missions: { 'w1-m1': { ...validMission, stars: 4 } } }],
    ['fractional attempts', { ...validV1, missions: { 'w1-m1': { ...validMission, attempts: 1.5 } } }],
    ['negative attempts', { ...validV1, missions: { 'w1-m1': { ...validMission, attempts: -1 } } }],
    ['infinite attempts', { ...validV1, missions: { 'w1-m1': { ...validMission, attempts: Infinity } } }],
    ['fractional hints', { ...validV1, missions: { 'w1-m1': { ...validMission, hintsUsed: 0.5 } } }],
    ['negative hints', { ...validV1, missions: { 'w1-m1': { ...validMission, hintsUsed: -1 } } }],
    ['infinite hints', { ...validV1, missions: { 'w1-m1': { ...validMission, hintsUsed: Infinity } } }],
    ['invalid completion date', { ...validV1, missions: { 'w1-m1': { ...validMission, completedAt: 'not-a-date' } } }],
    ['invalid saved date', { ...validV1, savedAt: 'not-a-date' }],
    ['short PIN', { ...validV1, settings: { ...validV1.settings, parentPin: '123' } }],
    ['non-numeric PIN', { ...validV1, settings: { ...validV1.settings, parentPin: '12ab' } }],
    ['missing field', { ...validV1, learnerName: undefined }],
    ['wrong field type', { ...validV1, settings: { ...validV1.settings, muted: 'no' } }],
  ])('rejects %s', (_label, value) => {
    expect(() => migrateProgress(value)).toThrow(/进度文件/);
  });

  it.each([null, [], new Date(), Object.create(null)])('rejects non-plain document objects', (value) => {
    expect(() => migrateProgress(value)).toThrow('进度文件格式无效');
  });

  it('rejects unknown fields instead of silently trusting them', () => {
    expect(() => migrateProgress({ ...validV1, unexpected: true })).toThrow('进度文件格式无效');
  });

  it.each([
    ['completedAt rollover', { ...validV1, missions: { 'w1-m1': { ...validMission, completedAt: '2026-02-30T00:00:00.000Z' } } }],
    ['completedAt numeric text', { ...validV1, missions: { 'w1-m1': { ...validMission, completedAt: '1' } } }],
    ['savedAt offset', { ...validV1, savedAt: '2026-07-12T08:00:00.000+08:00' }],
    ['savedAt without milliseconds', { ...validV1, savedAt: '2026-07-12T00:00:00Z' }],
    ['recovery date rollover', {
      ...createInitialProgress(),
      recovery: { lastRecoveredAt: '2026-02-30T00:00:00.000Z', source: 'snapshot' },
    }],
    ['recovery date offset', {
      ...createInitialProgress(),
      recovery: { lastRecoveredAt: '2026-07-12T08:00:00.000+08:00', source: 'snapshot' },
    }],
  ])('rejects non-canonical ISO UTC date: %s', (_label, value) => {
    expect(() => migrateProgress(value)).toThrow(/必须是有效ISO UTC日期/);
  });

  it.each([
    ['missing schemaRevision', { ...createInitialProgress(), schemaRevision: undefined }],
    ['unsupported schemaRevision', { ...createInitialProgress(), schemaRevision: 2 }],
    ['invalid privacy flag', {
      ...createInitialProgress(),
      privacy: { localDataNoticeSeen: 'yes' },
    }],
    ['invalid recovery source', {
      ...createInitialProgress(),
      recovery: { lastRecoveredAt: null, source: 'cloud' },
    }],
    ['invalid recovery date type', {
      ...createInitialProgress(),
      recovery: { lastRecoveredAt: 123, source: 'snapshot' },
    }],
    ['invalid recovery date format', {
      ...createInitialProgress(),
      recovery: { lastRecoveredAt: '2026-07-12', source: 'snapshot' },
    }],
    ['missing reduced motion override', {
      ...createInitialProgress(),
      settings: {
        muted: false,
        reducedMotion: false,
        parentPin: '2580',
      },
    }],
    ['unknown privacy field', {
      ...createInitialProgress(),
      privacy: { localDataNoticeSeen: false, tracking: false },
    }],
    ['unknown recovery field', {
      ...createInitialProgress(),
      recovery: { lastRecoveredAt: null, source: null, backup: false },
    }],
    ['unknown settings field', {
      ...createInitialProgress(),
      settings: { ...createInitialProgress().settings, theme: 'dark' },
    }],
    ['unknown top-level field', { ...createInitialProgress(), unexpected: true }],
  ])('rejects invalid V2: %s', (_label, value) => {
    expect(() => migrateProgress(value)).toThrow(/进度文件格式无效/);
  });

  it('returns a fresh V2 tree that is isolated from the mutable V1 input', () => {
    const input = {
      version: 1,
      learnerName: '小行者',
      missions: { 'w1-m1': { ...validMission } },
      settings: { muted: true, reducedMotion: true, parentPin: '2580' },
      savedAt: '2026-07-12T00:00:00.000Z',
    };

    const result = migrateProgress(input);

    expect(result.missions).not.toBe(input.missions);
    expect(result.missions['w1-m1']).not.toBe(input.missions['w1-m1']);
    expect(result.settings).not.toBe(input.settings);

    input.learnerName = '已更改';
    input.settings.muted = false;
    input.missions['w1-m1'].stars = 1;

    expect(result.learnerName).toBe('小行者');
    expect(result.settings.muted).toBe(true);
    expect(result.missions['w1-m1'].stars).toBe(2);
  });
});
