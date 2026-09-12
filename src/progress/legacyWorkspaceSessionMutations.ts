import type { BattleRunResult, DragonPalaceInstruction, FourSeasBattleRunResult, FourSeasInstruction, RuyiStaffBattleRunResult, RuyiStaffInstruction } from '../battle/types';
import type { WorkspaceDraftV1 } from '../blockly/draft';
import type { FourSeasWorkspaceDraftV1 } from '../blockly/fourSeasRegaliaDraft';
import type { RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft';
import type { AdvancedWeekOneWorkspaceDraftV1 } from '../blockly/advancedWeekOneDraft';
import type { AdvancedWeekOneInstruction } from '../blockly/advancedWeekOneContract';
import type { AdvancedWeekOneRunResult } from '../battle/advancedWeekOne';
import type { HorseCareInstruction, HorseCareRunResult, HorseCareWorkspaceDraftV1 } from '../blockly/weekTwoHorseContract';
import type { MonkeyKingInstruction, MonkeyKingRunResult, MonkeyKingWorkspaceDraftV1 } from '../blockly/weekTwoMonkeyKingContract';
import type { PeachElixirInstruction, PeachElixirRunResult, PeachElixirWorkspaceDraftV1 } from '../blockly/weekTwoPeachElixirContract';
import type { FurnaceConditionInstruction, FurnaceConditionRunResult, FurnaceConditionWorkspaceDraftV1 } from '../blockly/weekTwoFurnaceConditionContract';
import { compileHeavenlySignalBossDraft, type HeavenlySignalBossInstruction, type HeavenlySignalBossRunResult, type HeavenlySignalBossWorkspaceDraftV1 } from '../blockly/weekTwoHeavenlySignalBossContract';
import { compileManorHelpDraft, runManorHelp, type ManorHelpInstruction, type ManorHelpRunResult, type ManorHelpWorkspaceDraftV1 } from '../blockly/weekThreeManorHelpContract';
import { compileCuilanBooleanDraft, runCuilanBooleanForDraft, type CuilanBooleanInstruction, type CuilanBooleanRunResult, type CuilanBooleanWorkspaceDraftV1 } from '../blockly/weekThreeCuilanBooleanContract';
import { compileYunzhanDialogueDraft, runYunzhanDialogueForDraft, type YunzhanDialogueInstruction, type YunzhanDialogueRunResult, type YunzhanDialogueWorkspaceDraftV1 } from '../blockly/weekThreeYunzhanDialogueContract';
import { compileBajieJoiningDraft, runBajieJoiningForDraft, type BajieJoiningInstruction, type BajieJoiningRunResult, type BajieJoiningWorkspaceDraftV1 } from '../blockly/weekThreeBajieJoiningContract';
import { compileWeekThreeBossDraft } from '../blockly/weekThreeBossCompiler';
import { runWeekThreeBossDraft, type WeekThreeBossInstruction, type WeekThreeBossRunResult, type WeekThreeBossWorkspaceDraftV1 } from '../blockly/weekThreeBossContract';
import type { AdvancedWeekOneMissionSession, BajieJoiningMissionSession, CuilanBooleanMissionSession, DragonPalaceMissionSession, FourSeasRegaliaMissionSession, FurnaceConditionMissionSession, HeavenlySignalBossMissionSession, HorseCareMissionSession, ManorHelpMissionSession, MissionSession, MonkeyKingMissionSession, PeachElixirMissionSession, RuyiStaffMissionSession, WeekThreeBossMissionSession, YunzhanDialogueMissionSession } from './types';

type WorkspaceMissionSession = Extract<MissionSession,{workspace:unknown}>;
type CompileFailureMissionSession = Extract<MissionSession,{compileFailures:number}>;
function assertCanonicalIso(now:string){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(now)||new Date(now).toISOString()!==now)throw Error('会话时间必须是有效ISO UTC日期')}
function increment(value:number){if(!Number.isSafeInteger(value)||value<0||value===Number.MAX_SAFE_INTEGER)throw Error('会话计数超出安全范围');return value+1}
function cloneSession<T extends MissionSession>(session:T):T{return structuredClone(session)}

export function updateWorkspaceDraft(
  session: DragonPalaceMissionSession,
  workspace: WorkspaceDraftV1,
  now: string,
): DragonPalaceMissionSession;
export function updateWorkspaceDraft(
  session: RuyiStaffMissionSession,
  workspace: RuyiWorkspaceDraftV1,
  now: string,
): RuyiStaffMissionSession;
export function updateWorkspaceDraft(
  session: FourSeasRegaliaMissionSession,
  workspace: FourSeasWorkspaceDraftV1,
  now: string,
): FourSeasRegaliaMissionSession;
export function updateWorkspaceDraft(session: AdvancedWeekOneMissionSession, workspace: AdvancedWeekOneWorkspaceDraftV1, now: string): AdvancedWeekOneMissionSession;
export function updateWorkspaceDraft(session: HorseCareMissionSession, workspace: HorseCareWorkspaceDraftV1, now: string): HorseCareMissionSession;
export function updateWorkspaceDraft(session: MonkeyKingMissionSession, workspace: MonkeyKingWorkspaceDraftV1, now: string): MonkeyKingMissionSession;
export function updateWorkspaceDraft(session: PeachElixirMissionSession, workspace: PeachElixirWorkspaceDraftV1, now: string): PeachElixirMissionSession;
export function updateWorkspaceDraft(session: FurnaceConditionMissionSession, workspace: FurnaceConditionWorkspaceDraftV1, now: string): FurnaceConditionMissionSession;
export function updateWorkspaceDraft(session: HeavenlySignalBossMissionSession, workspace: HeavenlySignalBossWorkspaceDraftV1, now: string): HeavenlySignalBossMissionSession;
export function updateWorkspaceDraft(session: ManorHelpMissionSession, workspace: ManorHelpWorkspaceDraftV1, now: string): ManorHelpMissionSession;
export function updateWorkspaceDraft(session: CuilanBooleanMissionSession, workspace: CuilanBooleanWorkspaceDraftV1, now: string): CuilanBooleanMissionSession;
export function updateWorkspaceDraft(session: YunzhanDialogueMissionSession, workspace: YunzhanDialogueWorkspaceDraftV1, now: string): YunzhanDialogueMissionSession;
export function updateWorkspaceDraft(session: BajieJoiningMissionSession, workspace: BajieJoiningWorkspaceDraftV1, now: string): BajieJoiningMissionSession;
export function updateWorkspaceDraft(session: WeekThreeBossMissionSession, workspace: WeekThreeBossWorkspaceDraftV1, now: string): WeekThreeBossMissionSession;
export function updateWorkspaceDraft(
  session: WorkspaceMissionSession,
  workspace: WorkspaceDraftV1 | RuyiWorkspaceDraftV1 | FourSeasWorkspaceDraftV1 | AdvancedWeekOneWorkspaceDraftV1 | HorseCareWorkspaceDraftV1 | MonkeyKingWorkspaceDraftV1 | PeachElixirWorkspaceDraftV1 | FurnaceConditionWorkspaceDraftV1 | HeavenlySignalBossWorkspaceDraftV1 | ManorHelpWorkspaceDraftV1 | CuilanBooleanWorkspaceDraftV1 | YunzhanDialogueWorkspaceDraftV1 | BajieJoiningWorkspaceDraftV1 | WeekThreeBossWorkspaceDraftV1,
  now: string,
): WorkspaceMissionSession {
  assertCanonicalIso(now);
  const next = cloneSession(session);
  Object.assign(next, { workspace: structuredClone(workspace), savedAt: now });
  let preservesBossRun = false;
  if ('missionId' in workspace && workspace.missionId === 'w2-m5' && 'missionId' in session.workspace && session.workspace.missionId === 'w2-m5' && session.lastTrace.length > 0) {
    try { preservesBossRun = JSON.stringify(compileHeavenlySignalBossDraft(workspace)) === JSON.stringify(session.lastTrace); } catch { preservesBossRun = false; }
  }
  if ('missionId' in workspace && workspace.missionId !== 'w3-m1' && !preservesBossRun) {
    Object.assign(next, { lastTrace: [], lastRun: null, lastRunAt: null });
  }
  let preservesManorHelpRun = false;
  if ('missionId' in workspace && workspace.missionId === 'w3-m1' && 'missionId' in session.workspace && session.workspace.missionId === 'w3-m1' && session.lastTrace.length > 0) {
    try { preservesManorHelpRun = JSON.stringify(compileManorHelpDraft(workspace)) === JSON.stringify(session.lastTrace); } catch { preservesManorHelpRun = false; }
    if (!preservesManorHelpRun) Object.assign(next, { lastTrace: [], lastRun: null, scenarioResults: [], failureSnapshot: null, lastRunAt: null });
  }
  if ('missionId' in workspace && workspace.missionId === 'w3-m2') {
    Object.assign(next, { lastTrace: [], lastRun: null, checkpointResults: [], failureSnapshot: null, lastRunAt: null });
  }
  if ('missionId' in workspace && workspace.missionId === 'w3-m3') {
    Object.assign(next, { lastTrace: [], lastRun: null, roundResults: [], failureSnapshot: null, lastRunAt: null });
  }
  if ('missionId' in workspace && workspace.missionId === 'w3-m4') {
    Object.assign(next, { lastTrace: [], lastRun: null, scenarioResults: [], failureSnapshot: null, lastRunAt: null });
  }
  if ('missionId' in workspace && workspace.missionId === 'w3-m5') {
    Object.assign(next, { lastTrace: [], lastRun: null, failureSnapshot: null, lastRunAt: null });
  }
  return next;
}

export function recordCompileFailure<TSession extends CompileFailureMissionSession>(
  session: TSession,
  concept: 'program-structure',
  now: string,
): TSession {
  assertCanonicalIso(now);
  const next = cloneSession(session);
  next.compileFailures = increment(next.compileFailures);
  if (concept === 'program-structure') {
    next.conceptFailures.programStructure = increment(next.conceptFailures.programStructure);
  }
  next.savedAt = now;
  return next;
}

export function recordWeekThreeBossCompileFailure(
  session: WeekThreeBossMissionSession,
  now: string,
): WeekThreeBossMissionSession {
  return recordCompileFailure(session, 'program-structure', now);
}

export function recordRun(
  session: DragonPalaceMissionSession,
  result: BattleRunResult,
  trace: DragonPalaceInstruction[],
  now: string,
): DragonPalaceMissionSession;
export function recordRun(
  session: RuyiStaffMissionSession,
  result: RuyiStaffBattleRunResult,
  trace: RuyiStaffInstruction[],
  now: string,
): RuyiStaffMissionSession;
export function recordRun(
  session: FourSeasRegaliaMissionSession,
  result: FourSeasBattleRunResult,
  trace: FourSeasInstruction[],
  now: string,
): FourSeasRegaliaMissionSession;
export function recordRun(session: AdvancedWeekOneMissionSession, result: AdvancedWeekOneRunResult, trace: AdvancedWeekOneInstruction[], now: string): AdvancedWeekOneMissionSession;
export function recordRun(session: HorseCareMissionSession, result: HorseCareRunResult, trace: HorseCareInstruction[], now: string): HorseCareMissionSession;
export function recordRun(session: MonkeyKingMissionSession, result: MonkeyKingRunResult, trace: MonkeyKingInstruction[], now: string): MonkeyKingMissionSession;
export function recordRun(session: PeachElixirMissionSession, result: PeachElixirRunResult, trace: PeachElixirInstruction[], now: string): PeachElixirMissionSession;
export function recordRun(session: FurnaceConditionMissionSession, result: FurnaceConditionRunResult, trace: FurnaceConditionInstruction[], now: string): FurnaceConditionMissionSession;
export function recordRun(session: HeavenlySignalBossMissionSession, result: HeavenlySignalBossRunResult, trace: HeavenlySignalBossInstruction[], now: string): HeavenlySignalBossMissionSession;
export function recordRun(session: ManorHelpMissionSession, result: ManorHelpRunResult, trace: ManorHelpInstruction[], now: string): ManorHelpMissionSession;
export function recordRun(session: CuilanBooleanMissionSession, result: CuilanBooleanRunResult, trace: CuilanBooleanInstruction[], now: string): CuilanBooleanMissionSession;
export function recordRun(session: YunzhanDialogueMissionSession, result: YunzhanDialogueRunResult, trace: YunzhanDialogueInstruction[], now: string): YunzhanDialogueMissionSession;
export function recordRun(session: BajieJoiningMissionSession, result: BajieJoiningRunResult, trace: BajieJoiningInstruction[], now: string): BajieJoiningMissionSession;
export function recordRun(session: WeekThreeBossMissionSession, result: WeekThreeBossRunResult, trace: WeekThreeBossInstruction[], now: string): WeekThreeBossMissionSession;
export function recordRun(
  session: WorkspaceMissionSession,
  result: BattleRunResult | RuyiStaffBattleRunResult | FourSeasBattleRunResult | AdvancedWeekOneRunResult | HorseCareRunResult | MonkeyKingRunResult | PeachElixirRunResult | FurnaceConditionRunResult | HeavenlySignalBossRunResult | ManorHelpRunResult | CuilanBooleanRunResult | YunzhanDialogueRunResult | BajieJoiningRunResult | WeekThreeBossRunResult,
  trace: DragonPalaceInstruction[] | RuyiStaffInstruction[] | FourSeasInstruction[] | AdvancedWeekOneInstruction[] | HorseCareInstruction[] | MonkeyKingInstruction[] | PeachElixirInstruction[] | FurnaceConditionInstruction[] | HeavenlySignalBossInstruction[] | ManorHelpInstruction[] | CuilanBooleanInstruction[] | YunzhanDialogueInstruction[] | BajieJoiningInstruction[] | WeekThreeBossInstruction[],
  now: string,
): WorkspaceMissionSession {
  assertCanonicalIso(now);
  const next = cloneSession(session);
  if ('missionId' in next.workspace && next.workspace.missionId === 'w3-m5') {
    const compiled = compileWeekThreeBossDraft(next.workspace);
    if (!compiled.ok) throw new Error('W3-M5运行必须来自当前可见图的确定性编译与重放');
    const canonicalRun = runWeekThreeBossDraft(compiled.draft);
    if (JSON.stringify(trace) !== JSON.stringify(compiled.trace) || JSON.stringify(result) !== JSON.stringify(canonicalRun)) throw new Error('W3-M5运行必须来自当前可见图的确定性编译与重放');
    const boss = next as WeekThreeBossMissionSession;
    boss.totalRuns = increment(boss.totalRuns);
    if (canonicalRun.completed) {
      boss.successfulFullRuns = increment(boss.successfulFullRuns);
    } else {
      boss.runtimeFailures = increment(boss.runtimeFailures);
      if (boss.firstBlockingConcept === null) boss.firstBlockingConcept = canonicalRun.failure!.concept;
      const field = canonicalRun.failure?.concept === 'manor-help-specificity' ? 'manorHelpSpecificity'
        : canonicalRun.failure?.concept === 'disguise-identity' ? 'disguiseIdentity'
        : canonicalRun.failure?.concept === 'yunzhan-branch' ? 'yunzhanBranch' : 'joiningOperator';
      boss.conceptFailures[field] = increment(boss.conceptFailures[field]);
    }
    Object.assign(boss, { lastTrace: structuredClone(compiled.trace), lastRun: structuredClone(canonicalRun), failureSnapshot: structuredClone(canonicalRun.failure), lastRunAt: now, savedAt: now });
    return boss;
  }
  if ('missionId' in next.workspace && next.workspace.missionId === 'w3-m4') {
    const canonicalTrace = compileBajieJoiningDraft(next.workspace);
    const canonicalRun = runBajieJoiningForDraft(next.workspace, canonicalTrace);
    if (JSON.stringify(trace) !== JSON.stringify(canonicalTrace) || JSON.stringify(result) !== JSON.stringify(canonicalRun)) throw new Error('W3-M4运行必须来自当前可见图的确定性编译与重放');
    const bajie = next as BajieJoiningMissionSession;
    bajie.totalRuns = increment(bajie.totalRuns);
    if (!canonicalRun.completed) {
      bajie.runtimeFailures = increment(bajie.runtimeFailures);
      if (canonicalRun.diagnostic?.concept === 'invalid-trace') bajie.conceptFailures.completeness = increment(bajie.conceptFailures.completeness);
      else bajie.conceptFailures.booleanComposition = increment(bajie.conceptFailures.booleanComposition);
    }
    Object.assign(bajie, { lastTrace: structuredClone(canonicalTrace), lastRun: structuredClone(canonicalRun), scenarioResults: structuredClone(canonicalRun.scenarioResults), failureSnapshot: structuredClone(canonicalRun.failureSnapshot), lastRunAt: now, savedAt: now });
    return bajie;
  }
  if ('missionId' in next.workspace && next.workspace.missionId === 'w3-m2') {
    const canonicalTrace = compileCuilanBooleanDraft(next.workspace);
    const canonicalRun = runCuilanBooleanForDraft(next.workspace, canonicalTrace);
    if (JSON.stringify(trace) !== JSON.stringify(canonicalTrace) || JSON.stringify(result) !== JSON.stringify(canonicalRun)) throw new Error('W3-M2运行必须来自当前可见图的确定性编译与重放');
    const cuilan = next as CuilanBooleanMissionSession;
    cuilan.totalRuns = increment(cuilan.totalRuns);
    if (!canonicalRun.completed) {
      cuilan.runtimeFailures = increment(cuilan.runtimeFailures);
      const concept = canonicalRun.diagnostic?.concept;
      if (concept === 'condition-selection') cuilan.conceptFailures.conditionSelection = increment(cuilan.conceptFailures.conditionSelection);
      else if (concept === 'branch-routing') cuilan.conceptFailures.branchRouting = increment(cuilan.conceptFailures.branchRouting);
      else if (concept === 'sequence-precondition') cuilan.conceptFailures.sequencePrecondition = increment(cuilan.conceptFailures.sequencePrecondition);
      else cuilan.conceptFailures.completeness = increment(cuilan.conceptFailures.completeness);
    }
    Object.assign(cuilan, { lastTrace: structuredClone(canonicalTrace), lastRun: structuredClone(canonicalRun), checkpointResults: structuredClone(canonicalRun.checkpointResults), failureSnapshot: structuredClone(canonicalRun.failureSnapshot), lastRunAt: now, savedAt: now });
    return cuilan;
  }
  if ('missionId' in next.workspace && next.workspace.missionId === 'w3-m3') {
    const canonicalTrace = compileYunzhanDialogueDraft(next.workspace);
    const canonicalRun = runYunzhanDialogueForDraft(next.workspace, canonicalTrace);
    if (JSON.stringify(trace) !== JSON.stringify(canonicalTrace) || JSON.stringify(result) !== JSON.stringify(canonicalRun)) throw new Error('W3-M3运行必须来自当前可见图的确定性编译与重放');
    const yunzhan = next as YunzhanDialogueMissionSession;
    yunzhan.totalRuns = increment(yunzhan.totalRuns);
    if (!canonicalRun.completed) { yunzhan.runtimeFailures = increment(yunzhan.runtimeFailures); if (canonicalRun.diagnostic?.concept === 'branch-routing') yunzhan.conceptFailures.branchRouting = increment(yunzhan.conceptFailures.branchRouting); else yunzhan.conceptFailures.completeness = increment(yunzhan.conceptFailures.completeness); }
    Object.assign(yunzhan, { lastTrace: structuredClone(canonicalTrace), lastRun: structuredClone(canonicalRun), roundResults: structuredClone(canonicalRun.rounds), failureSnapshot: structuredClone(canonicalRun.failureSnapshot), lastRunAt: now, savedAt: now });
    return yunzhan;
  }
  if ('missionId' in next.workspace && next.workspace.missionId === 'w3-m1') {
    const canonicalTrace = compileManorHelpDraft(next.workspace);
    const canonicalRun = runManorHelp(canonicalTrace);
    if (JSON.stringify(trace) !== JSON.stringify(canonicalTrace) || JSON.stringify(result) !== JSON.stringify(canonicalRun)) {
      throw new Error('W3-M1运行必须来自当前可见图的确定性编译与重放');
    }
    next.totalRuns = increment(next.totalRuns);
    const manor = next as ManorHelpMissionSession;
    if (!canonicalRun.completed) {
      manor.runtimeFailures = increment(manor.runtimeFailures);
      const concept = canonicalRun.diagnostic?.concept;
      if (concept === 'condition-selection') manor.conceptFailures.conditionSelection = increment(manor.conceptFailures.conditionSelection);
      else if (concept === 'branch-routing') manor.conceptFailures.branchRouting = increment(manor.conceptFailures.branchRouting);
      else manor.conceptFailures.completeness = increment(manor.conceptFailures.completeness);
    }
    Object.assign(manor, { lastTrace: structuredClone(canonicalTrace), lastRun: structuredClone(canonicalRun), scenarioResults: structuredClone(canonicalRun.scenarioResults), failureSnapshot: structuredClone(canonicalRun.failureSnapshot), lastRunAt: now, savedAt: now });
    return manor;
  }
  next.totalRuns = increment(next.totalRuns);

  if (!result.completed && 'diagnostic' in result && result.diagnostic !== null) {
    next.runtimeFailures = increment(next.runtimeFailures);
    if ('missionId' in next.workspace && next.workspace.missionId === 'w2-m5') {
      const bossFailures = (next as HeavenlySignalBossMissionSession).conceptFailures;
      const concept = (result as HeavenlySignalBossRunResult).diagnostic?.concept;
      const field = concept === 'loop-count' ? 'loopCount'
        : concept === 'event-routing' ? 'eventRouting'
        : concept === 'handler-sequence' ? 'handlerSequence'
        : concept === 'sequence-precondition' ? 'sequencePrecondition'
        : concept === 'loop-condition' ? 'loopCondition'
        : concept === 'condition-never-met' ? 'conditionNeverMet'
        : 'completeness';
      bossFailures[field] = increment(bossFailures[field]);
    } else if ('type' in result.diagnostic && result.diagnostic.type === 'instruction-rejected') {
      const commonFailures = next.conceptFailures as { sequencePrecondition: number };
      commonFailures.sequencePrecondition = increment(
        commonFailures.sequencePrecondition,
      );
    } else {
      const commonFailures = next.conceptFailures as { completeness: number };
      commonFailures.completeness = increment(commonFailures.completeness);
    }
  }

  Object.assign(next, {
    lastTrace: structuredClone(trace),
    lastRun: structuredClone(result),
    lastRunAt: now,
    savedAt: now,
  });
  return next;
}

export function recordConditionObservationUse(
  session: ManorHelpMissionSession,
  snapshotId: string,
  now: string,
): ManorHelpMissionSession;
export function recordConditionObservationUse(
  session: CuilanBooleanMissionSession,
  snapshotId: string,
  now: string,
): CuilanBooleanMissionSession;
export function recordConditionObservationUse(
  session: YunzhanDialogueMissionSession,
  snapshotId: string,
  now: string,
): YunzhanDialogueMissionSession;
export function recordConditionObservationUse(
  session: BajieJoiningMissionSession,
  snapshotId: string,
  now: string,
): BajieJoiningMissionSession;
export function recordConditionObservationUse(
  session: WeekThreeBossMissionSession,
  snapshotId: string,
  now: string,
): WeekThreeBossMissionSession;
export function recordConditionObservationUse(
  session: ManorHelpMissionSession | CuilanBooleanMissionSession | YunzhanDialogueMissionSession | BajieJoiningMissionSession | WeekThreeBossMissionSession,
  snapshotId: string,
  now: string,
): ManorHelpMissionSession | CuilanBooleanMissionSession | YunzhanDialogueMissionSession | BajieJoiningMissionSession | WeekThreeBossMissionSession {
  assertCanonicalIso(now);
  if (typeof snapshotId !== 'string' || snapshotId.length === 0 || snapshotId.length > 256) throw new Error('条件观察快照编号无效');
  if (session.failureSnapshot === null || session.failureSnapshot.snapshotId !== snapshotId) throw new Error('条件观察快照不是当前失败快照');
  if (session.conditionObservationUses.some((use) => use.snapshotId === snapshotId)) return session;
  const next = cloneSession(session);
  if (next.workspace.missionId === 'w3-m1') {
    (next as ManorHelpMissionSession).conditionObservationUses.push({ snapshotId, usedAt: now, workspace: structuredClone(next.workspace) });
  } else if (next.workspace.missionId === 'w3-m2') {
    (next as CuilanBooleanMissionSession).conditionObservationUses.push({ snapshotId, usedAt: now, workspace: structuredClone(next.workspace) });
  } else if (next.workspace.missionId === 'w3-m3') {
    (next as YunzhanDialogueMissionSession).conditionObservationUses.push({ snapshotId, usedAt: now, workspace: structuredClone(next.workspace) });
  } else if (next.workspace.missionId === 'w3-m4') {
    (next as BajieJoiningMissionSession).conditionObservationUses.push({ snapshotId, usedAt: now, workspace: structuredClone(next.workspace) });
  } else {
    (next as WeekThreeBossMissionSession).conditionObservationUses.push({ snapshotId, usedAt: now, workspace: structuredClone(next.workspace) });
  }
  next.savedAt = now;
  return next;
}

export function recordCuilanConditionObservationUse(
  session: CuilanBooleanMissionSession,
  snapshotId: string,
  now: string,
): CuilanBooleanMissionSession {
  return recordConditionObservationUse(session, snapshotId, now);
}
