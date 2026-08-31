import { expect, it } from 'vitest';
import {
  DEFAULT_WEEK_FOUR_VARIABLE_PYTHON,
  SOLVED_WEEK_FOUR_VARIABLE_PYTHON,
  parseWeekFourVariablePython,
} from '../engine/weekFourVariablePythonGrammar';
import { createInitialProgress, migrateProgress } from './schema';
import {
  createWeekFourVariableSession,
  recordWeekFourVariableRun,
  recordWeekFourVariableValidationFailure,
  updateWeekFourVariableCode,
} from './weekFourVariableSession';
import {
  parseWeekFourVariableEvidence,
  parseWeekFourVariableSession,
  parseWeekFourVariableWork,
} from './weekFourVariableSessionSchema';

const NOW = '2026-08-31T00:00:00.000Z';
const VERIFIED = '2026-08-31T00:00:01.000Z';
const mission = { status: 'completed' as const, stars: 3 as const, attempts: 1, hintsUsed: 0, completedAt: NOW };

function solvedSession() {
  const updated = updateWeekFourVariableCode(createWeekFourVariableSession(NOW), SOLVED_WEEK_FOUR_VARIABLE_PYTHON, NOW);
  const canonical = parseWeekFourVariablePython(updated.pythonCode);
  return recordWeekFourVariableRun(updated, {
    canonicalTrace: canonical.trace,
    workerTrace: canonical.trace,
    run: canonical.run,
  }, VERIFIED);
}

function solvedWork() {
  const session = solvedSession();
  return {
    kind: 'python-variable-evidence-v1' as const,
    workId: 'w4-m2-variable-evidence-record' as const,
    missionId: 'w4-m2' as const,
    title: '第一次变化变量取证记录' as const,
    pythonCode: session.pythonCode,
    canonicalTrace: session.lastCanonicalTrace,
    workerTrace: session.lastWorkerTrace,
    run: session.lastRun!,
    createdAt: NOW,
    verifiedAt: VERIFIED,
  };
}

it('re-derives W4-M2 session and work evidence from Python code', () => {
  const session = solvedSession();
  const work = solvedWork();
  expect(parseWeekFourVariableSession(session)).toEqual(session);
  expect(parseWeekFourVariableWork(work)).toEqual(work);

  const forgedSession = structuredClone(session);
  const assignment = forgedSession.lastCanonicalTrace[1];
  if (!assignment || assignment.kind !== 'assign' || assignment.line !== 2) throw new Error('expected second assignment');
  assignment.target = 'appearance';
  expect(() => parseWeekFourVariableSession(forgedSession)).toThrow(/trace|Python|保存/);
  expect(() => parseWeekFourVariableWork({ ...work, verifiedAt: NOW, createdAt: VERIFIED })).toThrow(/时间/);
  expect(() => parseWeekFourVariableWork({ ...work, extra: true })).toThrow(/未知字段/);
});

it('binds formal W4-M2 proof to one completed mission, current session and exact work', () => {
  const session = solvedSession();
  const work = solvedWork();
  const formal = {
    kind: 'formal-v3' as const,
    completedAt: NOW,
    verifiedAt: VERIFIED,
    pythonCode: session.pythonCode,
    canonicalTrace: session.lastCanonicalTrace,
    workerTrace: session.lastWorkerTrace,
    run: session.lastRun!,
    workId: work.workId,
  };
  expect(parseWeekFourVariableEvidence(formal, { mission, formalWeekFourMapping: true, session, work })).toEqual(formal);
  expect(() => parseWeekFourVariableEvidence(formal, { mission, formalWeekFourMapping: false, session, work })).toThrow(/前置|正式/);
});

it.each([
  { version: 1 as const, sourceVersion: 1, sourceSchemaRevision: null, settings: { muted: false, reducedMotion: false, parentPin: 'unset' } },
  { version: 2 as const, schemaRevision: 1 as const, sourceVersion: 2, sourceSchemaRevision: 1, settings: { muted: false, reducedMotion: false, reducedMotionOverride: false, parentPin: 'unset' }, privacy: { localDataNoticeSeen: false }, recovery: { lastRecoveredAt: null, source: null } },
])('migrates V$version W4-M2 completion into exact legacy provenance without inventing session or work', (legacy) => {
  const { sourceVersion, sourceSchemaRevision, ...source } = legacy;
  const migrated = migrateProgress({
    ...source,
    learnerName: '小行者', missions: { 'w4-m2': mission }, savedAt: NOW,
  });
  expect(migrated).toMatchObject({
    schemaRevision: 9,
    missionCompletionEvidence: { 'w4-m2': { kind: 'legacy-replay-only', sourceVersion, sourceSchemaRevision } },
    sessions: {}, works: {},
  });
  expect(migrateProgress(migrated)).toEqual(migrated);
});

it('upgrades revisions 1 through 8 while preserving W4-M2 as legacy-only and rejects pre-r9 state', () => {
  for (const revision of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
    const base = createInitialProgress() as any;
    const legacyBase = revision === 1
      ? (() => { const { equipment: _equipment, abilities: _abilities, missionCompletionEvidence: _evidence, works: _works, ...rest } = base; return rest; })()
      : revision === 2
      ? (() => { const { abilities: _abilities, missionCompletionEvidence: _evidence, works: _works, ...rest } = base; return rest; })()
      : revision === 8
      ? base
      : (() => { const { works: _works, ...rest } = base; return rest; })();
    const legacy = {
      ...legacyBase,
      schemaRevision: revision,
      missions: { 'w4-m2': mission },
    };
    expect(migrateProgress(legacy).missionCompletionEvidence['w4-m2']).toEqual({
      kind: 'legacy-replay-only', completedAt: NOW, sourceVersion: 3, sourceSchemaRevision: revision,
    });
    expect(() => migrateProgress({ ...legacy, sessions: { 'w4-m2': createWeekFourVariableSession(NOW) } })).toThrow(/W4-M2|session|会话/);
  }
});

it('rejects pre-r9 W4-M2 work or proof and revision-9 orphan work', () => {
  const work = solvedWork();
  const base = createInitialProgress() as any;
  const revisionEight = { ...base, schemaRevision: 8 as const };
  expect(() => migrateProgress({
    ...revisionEight,
    works: { 'w4-m2-variable-evidence-record': work },
  })).toThrow(/revision 9|W4-M2|作品/);

  const proof = {
    kind: 'formal-v3' as const, completedAt: NOW, verifiedAt: VERIFIED,
    pythonCode: work.pythonCode, canonicalTrace: work.canonicalTrace,
    workerTrace: work.workerTrace, run: work.run, workId: work.workId,
  };
  expect(() => migrateProgress({
    ...revisionEight,
    missions: { 'w4-m2': mission },
    missionCompletionEvidence: { 'w4-m2': proof },
  })).toThrow(/revision 9|W4-M2|证明/);
  expect(() => migrateProgress({
    ...createInitialProgress(),
    works: { 'w4-m2-variable-evidence-record': work },
  })).toThrow(/W4-M2|作品/);
});

it('rejects forged zero counters and non-plain serialized data before replaying W4-M2 evidence', () => {
  const failed = recordWeekFourVariableRun(createWeekFourVariableSession(NOW), {
    canonicalTrace: parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON).trace,
    workerTrace: parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON).trace,
    run: parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON).run,
  }, VERIFIED);
  const forgedTotal = structuredClone(failed); forgedTotal.totalRuns = 0;
  const forgedOverwrite = structuredClone(failed); forgedOverwrite.overwriteFailures = 0; forgedOverwrite.conceptFailures.variableOverwrite = 0;
  const forgedTooManyOverwrites = structuredClone(failed); forgedTooManyOverwrites.overwriteFailures = 2; forgedTooManyOverwrites.conceptFailures.variableOverwrite = 2;
  const forgedUnpairedConcept = structuredClone(failed); forgedUnpairedConcept.conceptFailures.variableOverwrite = 2;
  const forgedProgramStructure = structuredClone(failed); forgedProgramStructure.conceptFailures.programStructure = 1;
  const forgedCompleteness = structuredClone(failed); forgedCompleteness.conceptFailures.completeness = 1;
  const validation = recordWeekFourVariableValidationFailure(failed, '2026-08-31T00:00:02.000Z');
  const forgedValidation = structuredClone(validation); forgedValidation.conceptFailures.safeExecution = 0;
  expect(() => parseWeekFourVariableSession(forgedTotal)).toThrow(/运行|计数/);
  expect(() => parseWeekFourVariableSession(forgedOverwrite)).toThrow(/覆盖|计数/);
  expect(() => parseWeekFourVariableSession(forgedTooManyOverwrites)).toThrow(/覆盖|计数/);
  expect(() => parseWeekFourVariableSession(forgedUnpairedConcept)).toThrow(/覆盖|计数/);
  expect(() => parseWeekFourVariableSession(forgedProgramStructure)).toThrow(/结构|计数/);
  expect(() => parseWeekFourVariableSession(forgedCompleteness)).toThrow(/完整|计数/);
  expect(() => parseWeekFourVariableSession(forgedValidation)).toThrow(/验证|安全|计数/);

  const symbolForged = structuredClone(failed); Object.defineProperty(symbolForged, Symbol('hidden'), { value: true, enumerable: false });
  const accessorForged = structuredClone(failed); Object.defineProperty(accessorForged, 'savedAt', { get: () => VERIFIED, enumerable: true, configurable: true });
  const nonEnumerableTrace = structuredClone(failed); Object.defineProperty(nonEnumerableTrace.lastCanonicalTrace[0]!, 'hidden', { value: true, enumerable: false });
  const customPrototype = structuredClone(failed); Object.setPrototypeOf(customPrototype, { inherited: true });
  for (const candidate of [symbolForged, accessorForged, nonEnumerableTrace, customPrototype]) {
    expect(() => parseWeekFourVariableSession(candidate)).toThrow(/普通对象|数据|字段/);
  }
  const nonFourDigit = structuredClone(failed); nonFourDigit.savedAt = '+002026-08-31T00:00:01.000Z';
  expect(() => parseWeekFourVariableSession(nonFourDigit)).toThrow(/ISO/);
});
