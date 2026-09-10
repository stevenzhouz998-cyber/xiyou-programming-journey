import { completeMission, createInitialProgress, serializeProgress } from '../../src/progress/progress';
import { parseProgress } from '../../src/progress/schema';
import { createMissionSession, recordRun, updateWorkspaceDraft } from '../../src/progress/session';
import {
  createDefaultManorHelpDraft,
  compileManorHelpDraft,
  runManorHelp,
} from '../../src/blockly/weekThreeManorHelpContract';
import {
  compileCuilanBooleanDraft,
  runCuilanBooleanForDraft,
} from '../../src/blockly/weekThreeCuilanBooleanContract';
import {
  createDefaultYunzhanDialogueDraft,
  compileYunzhanDialogueDraft,
  runYunzhanDialogueForDraft,
} from '../../src/blockly/weekThreeYunzhanDialogueContract';
import {
  createDefaultBajieJoiningDraft,
  compileBajieJoiningDraft,
  runBajieJoiningForDraft,
} from '../../src/blockly/weekThreeBajieJoiningContract';
import { compileWeekThreeBossDraft } from '../../src/blockly/weekThreeBossCompiler';
import { runWeekThreeBossDraft } from '../../src/blockly/weekThreeBossContract';
import { createSolvedWeekThreeBossDraftForTest } from '../../src/blockly/weekThreeBossTestHelpers';
import {
  createWeekFourVariableSession,
  recordWeekFourVariableRun,
  updateWeekFourVariableCode,
} from '../../src/progress/weekFourVariableSession';
import {
  parseWeekFourVariablePython,
  SOLVED_WEEK_FOUR_VARIABLE_PYTHON,
} from '../../src/engine/weekFourVariablePythonGrammar';
import { compileWeekFourMappingDraft } from '../../src/blockly/weekFourMappingDraft';
import { compareWeekFourMappingTraces } from '../../src/blockly/weekFourMappingContract';
import {
  parseWeekFourMappingPython,
  SOLVED_WEEK_FOUR_MAPPING_PYTHON,
} from '../../src/engine/weekFourPythonMappingGrammar';
import {
  createWeekFourMappingSession,
  recordWeekFourMappingRun,
  updateWeekFourMappingCode,
} from '../../src/progress/weekFourMappingSession';
import {
  DEFAULT_WEEK_FOUR_BRANCH_PYTHON,
  INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON,
  NESTED_WEEK_FOUR_BRANCH_PYTHON,
  SOLVED_WEEK_FOUR_BRANCH_PYTHON,
} from '../../src/engine/weekFourBranchPythonGrammar';

import { createWeekFourBranchSession, recordWeekFourBranchRun, updateWeekFourBranchCode } from '../../src/progress/weekFourBranchSession';
import { parseWeekFourBranchPython } from '../../src/engine/weekFourBranchPythonGrammar';
export function formalW4M3Prerequisite() {
  let progress = createInitialProgress();
  progress = { ...progress, privacy: { localDataNoticeSeen: true } };
  for (const id of [
    'w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5',
    'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4', 'w2-m5',
  ] as const) progress = completeMission(progress, id, { stars: 3, hintsUsed: 0 });

  const manor = createDefaultManorHelpDraft();
  manor.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help';
  const manorTrace = compileManorHelpDraft(manor);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      'w3-m1': recordRun(
        updateWorkspaceDraft(createMissionSession('w3-m1'), manor, '2026-09-01T00:00:00.000Z'),
        runManorHelp(manorTrace),
        manorTrace,
        '2026-09-01T00:00:01.000Z',
      ),
    },
  };
  progress = completeMission(progress, 'w3-m1', { stars: 3, hintsUsed: 0 });

  const cuilan = createMissionSession('w3-m2');
  const cuilanDraft = structuredClone(cuilan.workspace);
  cuilanDraft.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
  const cuilanTrace = compileCuilanBooleanDraft(cuilanDraft);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      'w3-m2': recordRun(
        updateWorkspaceDraft(cuilan, cuilanDraft, '2026-09-01T00:00:02.000Z'),
        runCuilanBooleanForDraft(cuilanDraft, cuilanTrace),
        cuilanTrace,
        '2026-09-01T00:00:03.000Z',
      ),
    },
  };
  progress = completeMission(progress, 'w3-m2', { stars: 3, hintsUsed: 0 });

  const yunzhan = createDefaultYunzhanDialogueDraft();
  yunzhan.blocks.find((block) => block.id === 'yunzhan-condition')!.type = 'w3_yunzhan_condition_pilgrimage_explicit';
  yunzhan.blocks.find((block) => block.id === 'yunzhan-then-action')!.type = 'w3_yunzhan_explain_guanyin_origin';
  yunzhan.blocks.find((block) => block.id === 'yunzhan-else-action')!.type = 'w3_yunzhan_guard_cave';
  const yunzhanTrace = compileYunzhanDialogueDraft(yunzhan);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      'w3-m3': recordRun(
        updateWorkspaceDraft(createMissionSession('w3-m3'), yunzhan, '2026-09-01T00:00:04.000Z'),
        runYunzhanDialogueForDraft(yunzhan, yunzhanTrace),
        yunzhanTrace,
        '2026-09-01T00:00:05.000Z',
      ),
    },
  };
  progress = completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 });

  const bajie = createDefaultBajieJoiningDraft();
  bajie.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and';
  const bajieTrace = compileBajieJoiningDraft(bajie);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      'w3-m4': recordRun(
        updateWorkspaceDraft(createMissionSession('w3-m4'), bajie, '2026-09-01T00:00:06.000Z'),
        runBajieJoiningForDraft(bajie, bajieTrace),
        bajieTrace,
        '2026-09-01T00:00:07.000Z',
      ),
    },
  };
  progress = completeMission(progress, 'w3-m4', { stars: 3, hintsUsed: 0 });

  const boss = createSolvedWeekThreeBossDraftForTest();
  const bossCompiled = compileWeekThreeBossDraft(boss);
  if (!bossCompiled.ok) throw new Error('formal W3-M5 prerequisite did not compile');
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      'w3-m5': recordRun(
        updateWorkspaceDraft(createMissionSession('w3-m5'), boss, '2026-09-01T00:00:08.000Z'),
        runWeekThreeBossDraft(boss),
        bossCompiled.trace,
        '2026-09-01T00:00:09.000Z',
      ),
    },
  };
  progress = completeMission(progress, 'w3-m5', { stars: 3, hintsUsed: 0 });

  let mappingSession = updateWeekFourMappingCode(
    createWeekFourMappingSession('2026-09-01T00:00:10.000Z'),
    SOLVED_WEEK_FOUR_MAPPING_PYTHON,
    '2026-09-01T00:00:11.000Z',
  );
  const blocklyTrace = compileWeekFourMappingDraft(mappingSession.workspace).trace;
  const pythonTrace = parseWeekFourMappingPython(mappingSession.pythonCode).trace;
  const mappingRun = compareWeekFourMappingTraces(blocklyTrace, pythonTrace);
  mappingSession = recordWeekFourMappingRun(mappingSession, {
    blocklyTrace,
    pythonTrace,
    run: mappingRun,
  }, '2026-09-01T00:00:12.000Z');
  progress.sessions['w4-m1'] = mappingSession;
  progress = completeMission(progress, 'w4-m1', { stars: 3, hintsUsed: 0 });
  let session = updateWeekFourVariableCode(
    createWeekFourVariableSession('2026-09-01T00:00:13.000Z'),
    SOLVED_WEEK_FOUR_VARIABLE_PYTHON,
    '2026-09-01T00:00:14.000Z',
  );
  const parsed = parseWeekFourVariablePython(session.pythonCode);
  session = recordWeekFourVariableRun(session, {
    canonicalTrace: parsed.trace,
    workerTrace: parsed.trace,
    run: parsed.run,
  }, '2026-09-01T00:00:15.000Z');
  progress.sessions['w4-m2'] = session;
  progress = completeMission(progress, 'w4-m2', { stars: 3, hintsUsed: 0 });
  let branch = updateWeekFourBranchCode(createWeekFourBranchSession('2026-09-01T00:00:16.000Z'), SOLVED_WEEK_FOUR_BRANCH_PYTHON, '2026-09-01T00:00:17.000Z');
  const branchParsed = parseWeekFourBranchPython(branch.pythonCode);
  if ('state' in branchParsed) throw Error('bad prerequisite');
  branch = recordWeekFourBranchRun(branch, {canonicalTrace: branchParsed.trace, workerTrace: branchParsed.trace, run: branchParsed.run}, '2026-09-01T00:00:18.000Z');
  progress.sessions['w4-m3'] = branch;
  progress = completeMission(progress, 'w4-m3', {stars: 3, hintsUsed: 0});
  const serialized = serializeProgress(progress);
  const checked = parseProgress(serialized);
  if (checked.missionCompletionEvidence['w4-m2']?.kind !== 'formal-v3'
    || checked.works['w4-m2-variable-evidence-record']?.run.finalState !== 'evidence-sealed') {
    throw new Error('formal W4-M2 prerequisite is incomplete');
  }
  return serialized;
}
