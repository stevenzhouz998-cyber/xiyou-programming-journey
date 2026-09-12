import { SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON, parseWeekFiveStoryOrchestrationPython } from '../../src/engine/weekFiveStoryOrchestrationPythonGrammar';
import { completeMission, serializeProgress } from '../../src/progress/progress';
import { parseProgress } from '../../src/progress/schema';
import { createWeekFiveStoryOrchestrationSession, recordWeekFiveStoryOrchestrationRun, updateWeekFiveStoryOrchestrationCode } from '../../src/progress/weekFiveStoryOrchestrationSession';
import { formalW5M4Prerequisite } from './w5m5Prerequisite';
import { SOLVED_WEEK_SIX_RECORDS_PYTHON, parseWeekSixRecordsPython } from '../../src/engine/weekSixRecordsPythonGrammar';
import { createWeekSixRecordsSession, recordWeekSixRecordsRun, updateWeekSixRecordsCode } from '../../src/progress/weekSixRecordsSession';
import { runWeekSixClassification, type WeekSixClassificationInput } from '../../src/engine/weekSixClassificationContract';
import { createWeekSixClassificationSession, recordWeekSixClassificationCheck, updateWeekSixClassificationInput } from '../../src/progress/weekSixClassificationSession';
import { runWeekSixPrompt, type WeekSixPromptInput } from '../../src/engine/weekSixPromptContract';
import { createWeekSixPromptSession, recordWeekSixPromptRun, updateWeekSixPromptInput } from '../../src/progress/weekSixPromptSession';
import { runWeekSixFactCheck, type WeekSixFactCheckInput } from '../../src/engine/weekSixFactCheckContract';
import { createWeekSixFactCheckSession, recordWeekSixFactCheckRun, updateWeekSixFactCheckInput } from '../../src/progress/weekSixFactCheckSession';
import { runWeekSixArchive,type WeekSixArchiveInput } from '../../src/engine/weekSixArchiveContract';
import { createWeekSixArchiveSession,recordWeekSixArchiveRun,updateWeekSixArchiveCode,updateWeekSixArchiveInput } from '../../src/progress/weekSixArchiveSession';

export function formalW5M5Prerequisite(): string {
  const progress = parseProgress(formalW5M4Prerequisite());
  let session = updateWeekFiveStoryOrchestrationCode(
    createWeekFiveStoryOrchestrationSession('2026-09-11T00:00:12.000Z'),
    SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON,
    '2026-09-11T00:00:13.000Z',
  );
  const parsed = parseWeekFiveStoryOrchestrationPython(session.pythonCode);
  if ('state' in parsed) throw Error('W5-M5 prerequisite invalid');
  session = recordWeekFiveStoryOrchestrationRun(
    session,
    { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run },
    '2026-09-11T00:00:14.000Z',
  );
  progress.sessions['w5-m5'] = session;
  progress.savedAt = '2026-09-11T00:00:14.000Z';
  return serializeProgress(completeMission(progress, 'w5-m5', { stars: 3, hintsUsed: 0 }));
}

export function formalW6M1Completion(): string {
  const progress = parseProgress(formalW5M5Prerequisite());
  const now = new Date().toISOString();
  let session = updateWeekSixRecordsCode(createWeekSixRecordsSession(now), SOLVED_WEEK_SIX_RECORDS_PYTHON, now);
  const parsed = parseWeekSixRecordsPython(session.pythonCode);
  if ('state' in parsed) throw Error('W6-M1 completion fixture invalid');
  session = recordWeekSixRecordsRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, now);
  progress.sessions['w6-m1'] = session; progress.savedAt = now;
  return serializeProgress(completeMission(progress, 'w6-m1', { stars: 3, hintsUsed: 0 }));
}

export function formalW6M2Completion(): string {
  const progress = parseProgress(formalW6M1Completion());
  const source = progress.works['w6-m1-structured-records-table'];
  if (!source) throw Error('W6-M2 source fixture invalid');
  const now = new Date().toISOString();
  const input: WeekSixClassificationInput = {
    labels: [
      { attempt: '一调', fanAuthenticity: 'false', fanEvidenceId: 'one-not-real', passageOutcome: 'not-passed', passageEvidenceId: 'one-fire-worse' },
      { attempt: '二调', fanAuthenticity: 'genuine', fanEvidenceId: 'two-true-fan', passageOutcome: 'not-passed', passageEvidenceId: 'two-stolen-back' },
      { attempt: '三调', fanAuthenticity: 'genuine', fanEvidenceId: 'three-true-fan', passageOutcome: 'passed', passageEvidenceId: 'three-fire-cleared' },
    ],
    practiceAuthenticity: 'insufficient',
  };
  let session = createWeekSixClassificationSession({ workId: source.workId, verifiedAt: source.verifiedAt, rows: source.run.rows }, now);
  session = updateWeekSixClassificationInput(session, input, now);
  session = recordWeekSixClassificationCheck(session, input, runWeekSixClassification(input, source.run.rows), now);
  progress.sessions['w6-m2'] = session; progress.savedAt = now;
  return serializeProgress(completeMission(progress, 'w6-m2', { stars: 3, hintsUsed: 0 }));
}

export function formalW6M3Completion(outputFormat:'event-table'|'step-list'='event-table'):string{
  const progress=parseProgress(formalW6M2Completion()),source=progress.works['w6-m2-fan-evidence-classification'];if(!source)throw Error('W6-M3 source fixture invalid');const now=new Date().toISOString();const input:WeekSixPromptInput={task:'organize-second-attempt',factIds:['sun-as-bull-gets-fan','bull-as-bajie-takes-fan','second-not-passed'],constraintIds:['follow-canon','no-invention'],outputFormat};let session=createWeekSixPromptSession(source,now);session=updateWeekSixPromptInput(session,input,now);session=recordWeekSixPromptRun(session,input,runWeekSixPrompt(input,session.source),now);progress.sessions['w6-m3']=session;progress.savedAt=now;return serializeProgress(completeMission(progress,'w6-m3',{stars:3,hintsUsed:0}));
}

export function formalW6M4Completion():string{
  const progress=parseProgress(formalW6M3Completion()),source=progress.works['w6-m3-second-attempt-brief'];if(!source)throw Error('W6-M4 source fixture invalid');const now=new Date().toISOString();const input:WeekSixFactCheckInput={reviews:[
    {statementId:'gained-then-reclaimed',verdict:'supported',evidenceIds:['chapter-60-true-fan','chapter-61-fan-reclaimed'],disposition:'keep-original'},
    {statementId:'gained-therefore-passed',verdict:'conflicting',evidenceIds:['m2-second-not-passed'],disposition:'revise-not-passed'},
    {statementId:'exactly-ten-minutes',verdict:'insufficient',evidenceIds:['provided-material-scope'],disposition:'cannot-confirm'},
  ]};let session=createWeekSixFactCheckSession(source,now);session=updateWeekSixFactCheckInput(session,input,now);session=recordWeekSixFactCheckRun(session,input,runWeekSixFactCheck(input,session.source),now);progress.sessions['w6-m4']=session;progress.savedAt=now;return serializeProgress(completeMission(progress,'w6-m4',{stars:3,hintsUsed:0}));
}

export function formalW6M5Completion(format:'event-table'|'step-list'='event-table'):string{
  const progress=parseProgress(formalW6M4Completion()),source=progress.works['w6-m4-second-attempt-review'];if(!source)throw Error('W6-M5 source fixture invalid');const now=new Date().toISOString();const input:WeekSixArchiveInput={brief:{scope:'all-three',factIds:['attempt-one','attempt-two','attempt-three'],constraintIds:['provided-only','mark-insufficient'],format},reviews:[
    {claimId:'first-and-third',verdict:'supported',evidenceIds:['run-first','run-third'],disposition:'keep-original'},
    {claimId:'second-therefore-passed',verdict:'conflicting',evidenceIds:['m2-second-not-passed'],disposition:'revise-second-result'},
    {claimId:'exactly-thirty-minutes',verdict:'insufficient',evidenceIds:['provided-material-scope'],disposition:'cannot-confirm'},
  ]};let session=createWeekSixArchiveSession(source,now);session=updateWeekSixArchiveCode(session,SOLVED_WEEK_SIX_RECORDS_PYTHON,now);session=updateWeekSixArchiveInput(session,input,now);const parsed=parseWeekSixRecordsPython(session.pythonCode);if('state'in parsed)throw Error('W6-M5 fixture Python invalid');const worker={trace:parsed.trace,run:parsed.run};session=recordWeekSixArchiveRun(session,worker,runWeekSixArchive(session.pythonCode,worker,input,session.source),now);progress.sessions['w6-m5']=session;progress.savedAt=now;return serializeProgress(completeMission(progress,'w6-m5',{stars:3,hintsUsed:0}));
}
