import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formalW5M4Prerequisite } from '../../e2e/support/w5m5Prerequisite';
import { DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON, SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON, parseWeekFiveStoryOrchestrationPython } from '../engine/weekFiveStoryOrchestrationPythonGrammar';
import { completeMission, getWeekFiveStoryOrchestrationAccess, getWeeklyReport, isMissionUnlocked, serializeProgress } from './progress';
import { migrateProgress, parseProgress } from './schema';
import { createWeekFiveStoryOrchestrationSession, recordWeekFiveStoryOrchestrationObservation, recordWeekFiveStoryOrchestrationRun, recordWeekFiveStoryOrchestrationValidationFailure, updateWeekFiveStoryOrchestrationCode } from './weekFiveStoryOrchestrationSession';
import { parseWeekFiveStoryOrchestrationSession } from './weekFiveStoryOrchestrationSessionSchema';

const NOW = '2030-01-02T03:04:05.000Z';
const FIX_LOOP = (code: string) => code.replace('        release(monk)\n    register(monk)', '        release(monk)\n        register(monk)');
const FIX_TEMPLE = (code: string) => code.replace('    rescue_monks()\n    record_weather_sequence()', '    rescue_monks()\n    record_sanqing()\n    record_weather_sequence()');
const FIX_WEATHER = (code: string) => code.replace("    record_weather('风')", '    record_weather(order)');
const FIX_LATER = (code: string) => code.replace('    record_guess()\n    record_meditation()', '    record_meditation()\n    record_guess()');

function run(session = createWeekFiveStoryOrchestrationSession(NOW)) {
  const parsed = parseWeekFiveStoryOrchestrationPython(session.pythonCode);
  if ('state' in parsed) throw Error('fixture');
  return recordWeekFiveStoryOrchestrationRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, NOW);
}

beforeEach(() => vi.setSystemTime(new Date(NOW)));

describe('W5-M5 durable story-orchestration chain', () => {
  it('stores only the current first blocker and clears superseded observations after editing', () => {
    let session = run();
    expect(session.lastRun).toMatchObject({ state: 'monk-loop-conflict', completed: false });
    expect(session).toMatchObject({ monkLoopFailures: 1, templeCallFailures: 0, weatherBindingFailures: 0, laterCallOrderFailures: 0, firstBlockingConcept: 'loop-scope' });
    session = recordWeekFiveStoryOrchestrationObservation(session, NOW);
    expect(parseWeekFiveStoryOrchestrationSession(session)).toEqual(session);
    session = run(updateWeekFiveStoryOrchestrationCode(session, FIX_LOOP(DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON), NOW));
    expect(session.lastRun?.state).toBe('temple-call-conflict');
    expect(session.conditionObservationUses).toEqual([]);
    expect(session.templeCallFailures).toBe(1);
  });

  it('retains invalid drafts and rejects forged trace, counts and array-shaped blockers', () => {
    const invalid = recordWeekFiveStoryOrchestrationValidationFailure(updateWeekFiveStoryOrchestrationCode(createWeekFiveStoryOrchestrationSession(NOW), 'import os', NOW), NOW);
    expect(invalid.totalRuns).toBe(0);
    expect(parseWeekFiveStoryOrchestrationSession(invalid)).toEqual(invalid);
    const failed = run();
    expect(() => parseWeekFiveStoryOrchestrationSession({ ...failed, totalRuns: 0 })).toThrow();
    expect(() => parseWeekFiveStoryOrchestrationSession({ ...failed, lastWorkerTrace: [] })).toThrow();
    expect(() => parseWeekFiveStoryOrchestrationSession({ ...failed, firstBlockingConcept: ['loop-scope'] })).toThrow(/首次阻塞概念/);
  });

  it('requires formal W5-M4, seals work and proof, preserves prior chain and unlocks W6-M1', () => {
    const base = parseProgress(formalW5M4Prerequisite());
    expect(getWeekFiveStoryOrchestrationAccess(base)).toEqual({ kind: 'formal', upgradingLegacy: false });
    let session = run();
    for (const fix of [FIX_LOOP, FIX_TEMPLE, FIX_WEATHER, FIX_LATER]) session = run(updateWeekFiveStoryOrchestrationCode(session, fix(session.pythonCode), NOW));
    expect(session.pythonCode).toBe(SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON);
    expect(() => completeMission({ ...base, missionCompletionEvidence: {}, sessions: { ...base.sessions, 'w5-m5': session } }, 'w5-m5', { stars: 3, hintsUsed: 0 })).toThrow();
    const completed = completeMission({ ...base, sessions: { ...base.sessions, 'w5-m5': session }, savedAt: NOW }, 'w5-m5', { stars: 3, hintsUsed: 0 });
    expect(completed.schemaRevision).toBe(18);
    expect(completed.missionCompletionEvidence['w5-m5']?.kind).toBe('formal-v3');
    expect(completed.works['w5-m5-story-orchestration-record']?.run.completed).toBe(true);
    expect(isMissionUnlocked(completed, 'w6-m1')).toBe(true);
    expect(parseProgress(serializeProgress(completed))).toEqual(completed);
    expect(completeMission(completed, 'w5-m5', { stars: 1, hintsUsed: 3 })).toBe(completed);
    for (const id of ['w5-m1', 'w5-m2', 'w5-m3', 'w5-m4'] as const) {
      expect(completed.sessions[id]).toEqual(base.sessions[id]);
      expect(completed.missionCompletionEvidence[id]).toEqual(base.missionCompletionEvidence[id]);
    }
    expect(completed.equipment).toEqual(base.equipment);
    expect(getWeeklyReport(completed, 5).weekFiveStoryOrchestration).toMatchObject({ runs: 5, monkLoopFailures: 1, templeCallFailures: 1, weatherBindingFailures: 1, laterCallOrderFailures: 1, workSaved: true, proof: 'formal-v3' });
  });

  it('migrates revision 16 completion only to legacy provenance', () => {
    const current = JSON.parse(formalW5M4Prerequisite());
    current.schemaRevision = 16;
    current.missions['w5-m5'] = { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: NOW };
    const migrated = migrateProgress(current);
    expect(migrated.schemaRevision).toBe(18);
    expect(migrated.missionCompletionEvidence['w5-m5']).toMatchObject({ kind: 'legacy-replay-only', sourceSchemaRevision: 16 });
    expect(migrated.sessions['w5-m5']).toBeUndefined();
    expect(getWeekFiveStoryOrchestrationAccess(migrated)).toEqual({ kind: 'formal', upgradingLegacy: true });
  });
});
