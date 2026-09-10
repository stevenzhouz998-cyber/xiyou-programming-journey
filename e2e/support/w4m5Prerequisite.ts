import {formalW4M3Prerequisite} from './w4m4Prerequisite';
import {parseProgress} from '../../src/progress/schema';
import {completeMission,serializeProgress} from '../../src/progress/progress';
import {createWeekFourListSession,updateWeekFourListCode,recordWeekFourListRun} from '../../src/progress/weekFourListSession';
import {parseWeekFourListPython} from '../../src/engine/weekFourListPythonGrammar';
export function formalW4M4Prerequisite():string {
 const p=parseProgress(formalW4M3Prerequisite());
 let session=updateWeekFourListCode(createWeekFourListSession('2026-09-09T00:00:00.000Z'),'appearances = ["女子", "老妇", "老翁"]\nfor item in appearances:\n    print(item)','2026-09-09T00:00:01.000Z');
 const code=parseWeekFourListPython(session.pythonCode);if('state' in code)throw Error('fixture');
 session=recordWeekFourListRun(session,{canonicalTrace:code.trace,workerTrace:code.trace,run:code.run},'2026-09-09T00:00:02.000Z');
 p.sessions['w4-m4']=session;
 return serializeProgress(completeMission(p,'w4-m4',{stars:3,hintsUsed:0}));
}
