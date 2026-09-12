import { DEFAULT_WEEK_FOUR_BRANCH_PYTHON } from '../engine/weekFourBranchPythonGrammar';
import type { WeekFourBranchMissionSession } from './weekFourBranchSession';
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export function createWeekFourBranchSession(now:string):WeekFourBranchMissionSession{if(!UTC.test(now)||new Date(now).toISOString()!==now)throw Error('W4-M3 会话时间必须是标准 UTC ISO。');return{kind:'python-branch-structure-v1',pythonCode:DEFAULT_WEEK_FOUR_BRANCH_PYTHON,lastCanonicalTrace:[],lastWorkerTrace:[],lastRun:null,failureSnapshot:null,totalRuns:0,branchConflictFailures:0,branchMissingFailures:0,validationFailures:0,runnerInfrastructureFailures:0,conditionObservationUses:[],usedHintTiers:[],firstBlockingConcept:null,lastRunAt:null,savedAt:now};}
