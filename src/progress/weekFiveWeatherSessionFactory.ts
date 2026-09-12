import { DEFAULT_WEEK_FIVE_WEATHER_PYTHON } from '../engine/weekFiveWeatherPythonGrammar';
import type { WeekFiveWeatherMissionSession } from './weekFiveWeatherSession';
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export function createWeekFiveWeatherSession(now:string):WeekFiveWeatherMissionSession{if(!UTC.test(now)||new Date(now).toISOString()!==now)throw Error('W5-M3 会话时间必须是标准 UTC ISO。');return{kind:'python-function-parameter-v1',pythonCode:DEFAULT_WEEK_FIVE_WEATHER_PYTHON,lastCanonicalTrace:[],lastWorkerTrace:[],lastRun:null,failureSnapshot:null,totalRuns:0,callFailures:0,parameterFailures:0,validationFailures:0,runnerInfrastructureFailures:0,conditionObservationUses:[],usedHintTiers:[],firstBlockingConcept:null,lastRunAt:null,savedAt:now};}
