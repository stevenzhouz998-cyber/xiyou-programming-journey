import { DEFAULT_WEEK_FOUR_BOSS_PYTHON } from '../engine/weekFourBossPythonGrammar';
import type { WeekFourBossMissionSession } from './weekFourBossSession';
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export function createWeekFourBossSession(now:string):WeekFourBossMissionSession{if(!UTC.test(now)||new Date(now).toISOString()!==now)throw Error('W4-M5 会话时间必须是标准 UTC ISO。');return{kind:'python-verification-station-v1',pythonCode:DEFAULT_WEEK_FOUR_BOSS_PYTHON,lastCanonicalTrace:[],lastWorkerTrace:[],lastRun:null,failureSnapshot:null,totalRuns:0,identityFailures:0,branchFailures:0,validationFailures:0,runnerInfrastructureFailures:0,conditionObservationUses:[],usedHintTiers:[],firstBlockingConcept:null,lastRunAt:null,savedAt:now};}
