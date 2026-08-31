import { expect, it } from 'vitest';
import { createWeekFourMappingSession, recordWeekFourMappingRun, updateWeekFourMappingCode } from './weekFourMappingSession';
import { parseWeekFourMappingSession, parseWeekFourMappingWork } from './weekFourMappingSessionSchema';
import { SOLVED_WEEK_FOUR_MAPPING_PYTHON, parseWeekFourMappingPython } from '../engine/weekFourPythonMappingGrammar';
import { compileWeekFourMappingDraft } from '../blockly/weekFourMappingCompiler';
import { compareWeekFourMappingTraces } from '../blockly/weekFourMappingContract';
import { createInitialProgress, migrateProgress } from './schema';

it('re-derives W4 session traces from saved inputs and rejects forged traces', () => {
  const now = '2026-08-30T00:00:00.000Z';
  const session = updateWeekFourMappingCode(createWeekFourMappingSession(now), SOLVED_WEEK_FOUR_MAPPING_PYTHON, '2026-08-30T00:00:01.000Z');
  const blocklyTrace = compileWeekFourMappingDraft(session.workspace).trace;
  const pythonTrace = parseWeekFourMappingPython(session.pythonCode).trace;
  const saved = recordWeekFourMappingRun(session, { blocklyTrace, pythonTrace, run: compareWeekFourMappingTraces(blocklyTrace, pythonTrace) }, '2026-08-30T00:00:02.000Z');
  expect(parseWeekFourMappingSession(saved)).toEqual(saved);
  const forged = structuredClone(saved); forged.lastPythonTrace[0]!.value = '伪造';
  expect(() => parseWeekFourMappingSession(forged)).toThrow(/trace|保存输入/);
});

it('migrates an old W4 completion only to legacy replay without inventing session or work', () => {
  const { works: _works, ...oldBase } = createInitialProgress();
  const old = { ...oldBase, schemaRevision: 7 as const, missions: { 'w4-m1': { status: 'completed' as const, stars: 3 as const, attempts: 1, hintsUsed: 0, completedAt: '2026-08-30T00:00:00.000Z' } } };
  const migrated = migrateProgress(old);
  expect(migrated.schemaRevision).toBe(9);
  expect(migrated.missionCompletionEvidence['w4-m1']).toMatchObject({ kind: 'legacy-replay-only' });
  expect(migrated.sessions['w4-m1']).toBeUndefined();
  expect(migrated.works).toEqual({});
  expect(migrateProgress(migrated)).toEqual(migrated);
});

it.each([
  {
    version: 1 as const,
    sourceVersion: 1,
    sourceSchemaRevision: null,
    settings: { muted: true, reducedMotion: false, parentPin: '4826' },
  },
  {
    version: 2 as const,
    schemaRevision: 1 as const,
    sourceVersion: 2,
    sourceSchemaRevision: 1,
    settings: { muted: true, reducedMotion: false, reducedMotionOverride: false, parentPin: '4826' },
    privacy: { localDataNoticeSeen: false },
    recovery: { lastRecoveredAt: null, source: null },
  },
])('migrates a V$version W4 completion into exact legacy-replay-only evidence', (legacy) => {
  const { sourceVersion, sourceSchemaRevision, ...source } = legacy;
  const migrated = migrateProgress({
    ...source,
    learnerName: '小行者',
    missions: { 'w4-m1': { status: 'completed' as const, stars: 3 as const, attempts: 1, hintsUsed: 0, completedAt: '2026-08-30T00:00:00.000Z' } },
    savedAt: '2026-08-30T00:00:00.000Z',
  });
  expect(migrated.missionCompletionEvidence['w4-m1']).toEqual({
    kind: 'legacy-replay-only', completedAt: '2026-08-30T00:00:00.000Z', sourceVersion, sourceSchemaRevision,
  });
  expect(migrateProgress(migrated)).toEqual(migrated);
});

it('rejects a pre-revision-8 W4 session instead of producing an invalid legacy replay save', () => {
  const { works: _works, ...oldBase } = createInitialProgress();
  const old = {
    ...oldBase,
    schemaRevision: 7 as const,
    missions: { 'w4-m1': { status: 'completed' as const, stars: 3 as const, attempts: 1, hintsUsed: 0, completedAt: '2026-08-30T00:00:00.000Z' } },
    sessions: { 'w4-m1': createWeekFourMappingSession('2026-08-30T00:00:00.000Z') },
  };
  expect(() => migrateProgress(old)).toThrow(/W4-M1|session|会话/);
});

it('rejects unknown or forged W4 work instead of accepting it as a raw clone', () => {
  const now = '2026-08-30T00:00:00.000Z';
  const session = updateWeekFourMappingCode(createWeekFourMappingSession(now), SOLVED_WEEK_FOUR_MAPPING_PYTHON, '2026-08-30T00:00:01.000Z');
  const blocklyTrace = compileWeekFourMappingDraft(session.workspace).trace;
  const pythonTrace = parseWeekFourMappingPython(session.pythonCode).trace;
  const run = compareWeekFourMappingTraces(blocklyTrace, pythonTrace);
  const work = {
    kind: 'blockly-python-mapping-v1' as const,
    workId: 'w4-m1-first-python-mapping' as const,
    missionId: 'w4-m1' as const,
    title: '第一份积木与 Python 对照经卷',
    workspace: session.workspace,
    pythonCode: session.pythonCode,
    blocklyTrace,
    pythonTrace,
    run,
    createdAt: now,
    verifiedAt: '2026-08-30T00:00:02.000Z',
  };
  expect(parseWeekFourMappingWork(work)).toEqual(work);
  expect(() => parseWeekFourMappingWork({ ...work, unexpected: true })).toThrow(/未知字段/);
  expect(() => parseWeekFourMappingWork({ ...work, workspace: { ...work.workspace, blocks: work.workspace.blocks.map((block, index) => index === 0 ? { ...block, forged: true } : block) } })).toThrow(/未知字段|积木/);
  expect(() => parseWeekFourMappingWork({ ...work, pythonTrace: structuredClone(blocklyTrace) })).toThrow(/trace|Python/);
});

it('rejects an orphan W4 work during the rev9 progress import', () => {
  const now = '2026-08-30T00:00:00.000Z';
  const session = updateWeekFourMappingCode(createWeekFourMappingSession(now), SOLVED_WEEK_FOUR_MAPPING_PYTHON, '2026-08-30T00:00:01.000Z');
  const blocklyTrace = compileWeekFourMappingDraft(session.workspace).trace;
  const pythonTrace = parseWeekFourMappingPython(session.pythonCode).trace;
  const progress = createInitialProgress();
  progress.works['w4-m1-first-python-mapping'] = {
    kind: 'blockly-python-mapping-v1', workId: 'w4-m1-first-python-mapping', missionId: 'w4-m1', title: '第一份积木与 Python 对照经卷',
    workspace: session.workspace, pythonCode: session.pythonCode, blocklyTrace, pythonTrace,
    run: compareWeekFourMappingTraces(blocklyTrace, pythonTrace), createdAt: now, verifiedAt: '2026-08-30T00:00:02.000Z',
  };
  expect(() => migrateProgress(progress)).toThrow(/work|作品|W4-M1/);
});
