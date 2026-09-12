import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formalW5M2Prerequisite } from '../../e2e/support/w5m3Prerequisite';
import { DEFAULT_WEEK_FIVE_WEATHER_PYTHON, parseWeekFiveWeatherPython } from '../engine/weekFiveWeatherPythonGrammar';
import { completeMission, getWeekFiveWeatherAccess, isMissionUnlocked, serializeProgress } from './progress';
import { getWeeklyReport } from './weeklyReport';
import { migrateProgress, parseProgress } from './schema';
import { createWeekFiveWeatherSession, recordWeekFiveWeatherObservation, recordWeekFiveWeatherRun, recordWeekFiveWeatherValidationFailure, updateWeekFiveWeatherCode } from './weekFiveWeatherSession';
import { parseWeekFiveWeatherSession } from './weekFiveWeatherSessionSchema';
const NOW='2030-01-02T03:04:05.000Z';const SOLVED=DEFAULT_WEEK_FIVE_WEATHER_PYTHON.replace("record_weather('风')",'record_weather(order)');
function run(session=createWeekFiveWeatherSession(NOW)){const parsed=parseWeekFiveWeatherPython(session.pythonCode);if('state'in parsed)throw Error('fixture');return recordWeekFiveWeatherRun(session,{canonicalTrace:parsed.trace,workerTrace:parsed.trace,run:parsed.run},NOW)}
beforeEach(()=>vi.setSystemTime(new Date(NOW)));
describe('W5-M3 durable parameter chain',()=>{
  it('saves the real fixed-constant failure and clears superseded observation after editing',()=>{const failed=run();expect(failed.lastRun).toMatchObject({state:'parameter-unused',completed:false});expect(failed.parameterFailures).toBe(1);const observed=recordWeekFiveWeatherObservation(failed,NOW);expect(parseWeekFiveWeatherSession(observed)).toEqual(observed);const edited=updateWeekFiveWeatherCode(observed,SOLVED,NOW);expect(edited.lastRun).toBeNull();expect(edited.conditionObservationUses).toEqual([])});
  it('retains invalid drafts and rejects forged trace/count/prototype data',()=>{const invalid=recordWeekFiveWeatherValidationFailure(updateWeekFiveWeatherCode(createWeekFiveWeatherSession(NOW),'import os',NOW),NOW);expect(invalid.totalRuns).toBe(0);expect(parseWeekFiveWeatherSession(invalid)).toEqual(invalid);const failed=run();expect(()=>parseWeekFiveWeatherSession({...failed,totalRuns:0})).toThrow();expect(()=>parseWeekFiveWeatherSession({...failed,lastWorkerTrace:[]})).toThrow();const forged=structuredClone(failed) as any;Object.setPrototypeOf(forged.lastCanonicalTrace,null);expect(()=>parseWeekFiveWeatherSession(forged)).toThrow()});
  it('requires formal W5-M2, seals work/proof, preserves prior chain and unlocks W5-M4',()=>{const base=parseProgress(formalW5M2Prerequisite());expect(getWeekFiveWeatherAccess(base)).toEqual({kind:'formal',upgradingLegacy:false});const solved=run(updateWeekFiveWeatherCode(run(),SOLVED,NOW));expect(()=>completeMission({...parseProgress(formalW5M2Prerequisite()),missionCompletionEvidence:{},sessions:{'w5-m3':solved}},'w5-m3',{stars:3,hintsUsed:0})).toThrow();const completed=completeMission({...base,sessions:{...base.sessions,'w5-m3':solved},savedAt:NOW},'w5-m3',{stars:3,hintsUsed:0});expect(completed.schemaRevision).toBe(21);expect(completed.missionCompletionEvidence['w5-m3']?.kind).toBe('formal-v3');expect(completed.works['w5-m3-weather-parameter-record']?.run.completed).toBe(true);expect(isMissionUnlocked(completed,'w5-m4')).toBe(true);expect(parseProgress(serializeProgress(completed))).toEqual(completed);expect(completeMission(completed,'w5-m3',{stars:1,hintsUsed:3})).toBe(completed);for(const id of ['w5-m1','w5-m2'] as const){expect(completed.sessions[id]).toEqual(base.sessions[id]);expect(completed.missionCompletionEvidence[id]).toEqual(base.missionCompletionEvidence[id])}expect(getWeeklyReport(completed,5).weekFiveWeather).toMatchObject({runs:2,parameterFailures:1,workSaved:true,proof:'formal-v3'})});
  it('migrates revision 14 completion only to legacy provenance',()=>{const current=JSON.parse(formalW5M2Prerequisite());current.schemaRevision=14;current.missions['w5-m3']={status:'completed',stars:2,attempts:1,hintsUsed:0,completedAt:NOW};const migrated=migrateProgress(current);expect(migrated.schemaRevision).toBe(21);expect(migrated.missionCompletionEvidence['w5-m3']).toMatchObject({kind:'legacy-replay-only',sourceSchemaRevision:14});expect(migrated.sessions['w5-m3']).toBeUndefined();expect(getWeekFiveWeatherAccess(migrated)).toEqual({kind:'formal',upgradingLegacy:true})});

  it('rejects array-shaped hint tiers and blockers instead of coercing them to strings', () => {
    const hinted = createWeekFiveWeatherSession(NOW) as any;
    hinted.usedHintTiers = [['observe']];
    expect(() => parseWeekFiveWeatherSession(hinted)).toThrow(/提示层级/);

    const duplicateArrays = createWeekFiveWeatherSession(NOW) as any;
    duplicateArrays.usedHintTiers = [['observe'], ['observe']];
    expect(() => parseWeekFiveWeatherSession(duplicateArrays)).toThrow(/提示层级/);

    const failed = run() as any;
    failed.firstBlockingConcept = ['function-parameter'];
    expect(() => parseWeekFiveWeatherSession(failed)).toThrow(/首次阻塞概念/);
  });
});
