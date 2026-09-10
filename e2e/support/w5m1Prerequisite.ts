import {formalW4M4Prerequisite} from './w4m5Prerequisite';
import {parseProgress} from '../../src/progress/schema';
import {completeMission,serializeProgress} from '../../src/progress/progress';
import {createWeekFourBossSession,updateWeekFourBossCode,recordWeekFourBossRun} from '../../src/progress/weekFourBossSession';
import {parseWeekFourBossPython} from '../../src/engine/weekFourBossPythonGrammar';
export function formalW4M5Prerequisite():string {
 const p=parseProgress(formalW4M4Prerequisite());
 let session=updateWeekFourBossCode(createWeekFourBossSession('2026-09-09T00:00:00.000Z'),'for card in cards:\n    identity = read_identity(card)\n    if identity == "白骨精":\n        keep_observing(card)\n    else:\n        polite_help(card)','2026-09-09T00:00:01.000Z');
 const code=parseWeekFourBossPython(session.pythonCode);if('state' in code)throw Error('fixture');
 session=recordWeekFourBossRun(session,{canonicalTrace:code.trace,workerTrace:code.trace,run:code.run},'2026-09-09T00:00:02.000Z');
 p.sessions['w4-m5']=session;
 return serializeProgress(completeMission(p,'w4-m5',{stars:3,hintsUsed:0}));
}
