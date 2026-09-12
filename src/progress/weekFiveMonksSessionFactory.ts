import { DEFAULT_WEEK_FIVE_MONKS_PYTHON } from '../engine/weekFiveMonksPythonGrammar';
import type { WeekFiveMonksMissionSession } from './weekFiveMonksSession';

const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export function createWeekFiveMonksSession(now:string):WeekFiveMonksMissionSession{
 if(!UTC.test(now)||new Date(now).toISOString()!==now)throw Error('W5-M1 会话时间必须是标准 UTC ISO。');
 return{kind:'python-monks-loop-v1',pythonCode:DEFAULT_WEEK_FIVE_MONKS_PYTHON,lastCanonicalTrace:[],lastWorkerTrace:[],lastRun:null,failureSnapshot:null,totalRuns:0,coverageFailures:0,actionFailures:0,validationFailures:0,runnerInfrastructureFailures:0,conditionObservationUses:[],usedHintTiers:[],firstBlockingConcept:null,lastRunAt:null,savedAt:now};
}
