import { DEFAULT_WEEK_FIVE_FUNCTION_PYTHON } from '../engine/weekFiveFunctionPythonGrammar';
import type { WeekFiveFunctionMissionSession } from './weekFiveFunctionSession';
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export function createWeekFiveFunctionSession(now:string):WeekFiveFunctionMissionSession{if(!UTC.test(now)||new Date(now).toISOString()!==now)throw Error('W5-M2 会话时间必须是标准 UTC ISO。');return{kind:'python-function-call-v1',pythonCode:DEFAULT_WEEK_FIVE_FUNCTION_PYTHON,lastCanonicalTrace:[],lastWorkerTrace:[],lastRun:null,failureSnapshot:null,totalRuns:0,callFailures:0,bodyFailures:0,validationFailures:0,runnerInfrastructureFailures:0,conditionObservationUses:[],usedHintTiers:[],firstBlockingConcept:null,lastRunAt:null,savedAt:now};}
