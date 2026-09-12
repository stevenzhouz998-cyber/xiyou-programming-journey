import type { AdvancedWeekOneMissionSession, BajieJoiningMissionSession, CuilanBooleanMissionSession, DragonPalaceMissionSession, FourSeasRegaliaMissionSession, FurnaceConditionMissionSession, HeavenlySignalBossMissionSession, HorseCareMissionSession, ManorHelpMissionSession, MonkeyKingMissionSession, PeachElixirMissionSession, RuyiStaffMissionSession, WeekThreeBossMissionSession, YunzhanDialogueMissionSession, ExecutableMissionId } from './types';
import type { WorkspaceMissionSession } from './session';
import { allMissionOutlines } from '../course/courseOutline';
import { safeCount } from './safeCount';
import type { ProgressV3 } from './types';

export interface WeeklyReport {
  week: number;
  completed: number;
  total: number;
  stars: number;
  hintsUsed: number;
  sessionRuns: number;
  sessionAdjustments: number;
  needsSupport: string[];
  bajieJoining?: {
    runs: number;
    booleanCompositionFailures: number;
    observations: number;
    proof: 'formal-v3' | 'legacy-preformal' | 'none';
    completedAt: string | null;
  };
  weekThreeBoss?: {
    runs: number;
    successfulFullRuns: number;
    conceptFailures: { manorHelpSpecificity: number; disguiseIdentity: number; yunzhanBranch: number; joiningOperator: number };
    firstBlocker: string | null;
    observations: number;
    proof: 'formal-v3' | 'legacy-replay-only' | 'none';
  };
  weekFourMapping?: {
    runs: number;
    mappingDifferences: number;
    validationFailures: number;
    infrastructureFailures: number;
    observations: number;
    workSaved: boolean;
    proof: 'formal-v3' | 'legacy-replay-only' | 'none';
    completedAt: string | null;
  };
  weekFourVariables?: {
    runs: number;
    overwriteFailures: number;
    validationFailures: number;
    infrastructureFailures: number;
    observations: number;
    workSaved: boolean;
    proof: 'formal-v3' | 'legacy-replay-only' | 'none';
    completedAt: string | null;
  };
  weekFourBranches?: {
    runs: number;
    conflicts: number;
    missing: number;
    validation: number;
    infrastructure: number;
    observations: number;
    workSaved: boolean;
    proof: 'formal-v3' | 'legacy-replay-only' | 'none';
    completedAt: string | null;
  };
  weekFiveFunction?: {
    runs: number;
    callFailures: number;
    bodyFailures: number;
    validationFailures: number;
    infrastructureFailures: number;
    observations: number;
    workSaved: boolean;
    proof: 'formal-v3' | 'legacy-replay-only' | 'none';
    completedAt: string | null;
  };
  weekFiveWeather?: { runs:number; callFailures:number; parameterFailures:number; validationFailures:number; infrastructureFailures:number; observations:number; workSaved:boolean; proof:'formal-v3'|'legacy-replay-only'|'none'; completedAt:string|null };
  weekFiveDecomposition?: { runs:number; coordinatorFailures:number; ownershipFailures:number; validationFailures:number; infrastructureFailures:number; observations:number; workSaved:boolean; proof:'formal-v3'|'legacy-replay-only'|'none'; completedAt:string|null };
  weekFiveStoryOrchestration?: { runs:number; monkLoopFailures:number; templeCallFailures:number; weatherBindingFailures:number; laterCallOrderFailures:number; validationFailures:number; infrastructureFailures:number; observations:number; workSaved:boolean; proof:'formal-v3'|'legacy-replay-only'|'none'; completedAt:string|null };
  weekSixRecords?: { runs:number; recordFailures:number; fieldFailures:number; validationFailures:number; infrastructureFailures:number; observations:number; workSaved:boolean; proof:'formal-v3'|'legacy-replay-only'|'none'; completedAt:string|null };
}

export function getWeeklyReport(progress: ProgressV3, week: number): WeeklyReport {
  const missions = allMissionOutlines.filter((mission) => mission.week === week);
  const records = missions.flatMap((mission) => progress.missions[mission.id] ? [progress.missions[mission.id]] : []);
  const missionSupport = missions
    .filter((mission) => (progress.missions[mission.id]?.hintsUsed ?? 0) >= 2)
    .map((mission) => mission.knowledge);
  const dragonSession = week === 1 ? progress.sessions['w1-m1'] : undefined;
  const ruyiSession = week === 1 ? progress.sessions['w1-m2'] : undefined;
  const fourSeasSession = week === 1 ? progress.sessions['w1-m3'] : undefined;
  const underworldSession = week === 1 ? progress.sessions['w1-m4'] : undefined;
  const bossSession = week === 1 ? progress.sessions['w1-m5'] : undefined;
  const horseCareSession = week === 2 ? progress.sessions['w2-m1'] : undefined;
  const monkeyKingSession = week === 2 ? progress.sessions['w2-m2'] : undefined;
  const peachElixirSession = week === 2 ? progress.sessions['w2-m3'] : undefined;
  const furnaceConditionSession = week === 2 ? progress.sessions['w2-m4'] : undefined;
  const heavenlyBossSession = week === 2 ? progress.sessions['w2-m5'] : undefined;
  const manorHelpSession = week === 3 ? progress.sessions['w3-m1'] : undefined;
  const cuilanBooleanSession = week === 3 ? progress.sessions['w3-m2'] : undefined;
  const yunzhanDialogueSession = week === 3 ? progress.sessions['w3-m3'] : undefined;
  const bajieJoiningSession = week === 3 ? progress.sessions['w3-m4'] : undefined;
  const weekThreeBossSession = week === 3 ? progress.sessions['w3-m5'] : undefined;
  const weekFourMappingSession = week === 4 ? progress.sessions['w4-m1'] : undefined;
  const weekFourVariableSession = week === 4 ? progress.sessions['w4-m2'] : undefined;
  const weekFourBranchSession = week === 4 ? progress.sessions['w4-m3'] : undefined;
  const weekFourBossSession = week === 4 ? progress.sessions['w4-m5'] : undefined;
  const weekFiveMonksSession = week === 5 ? progress.sessions['w5-m1'] : undefined;
  const weekFiveFunctionSession = week === 5 ? progress.sessions['w5-m2'] : undefined;
  const weekFiveWeatherSession = week === 5 ? progress.sessions['w5-m3'] : undefined;
  const weekFiveDecompositionSession = week === 5 ? progress.sessions['w5-m4'] : undefined;
  const weekFiveStoryOrchestrationSession = week === 5 ? progress.sessions['w5-m5'] : undefined;
  const weekSixRecordsSession = week === 6 ? progress.sessions['w6-m1'] : undefined;
  const weekFourListSession = week === 4 ? progress.sessions['w4-m4'] : undefined;
  const sessionSupport = [
    ...(dragonSession ? getSessionSupport(dragonSession, 'w1-m1') : []),
    ...(ruyiSession ? getSessionSupport(ruyiSession, 'w1-m2') : []),
    ...(fourSeasSession ? getSessionSupport(fourSeasSession, 'w1-m3') : []),
    ...(underworldSession ? getSessionSupport(underworldSession, 'w1-m4') : []),
    ...(bossSession ? getSessionSupport(bossSession, 'w1-m5') : []),
    ...(horseCareSession ? getSessionSupport(horseCareSession, 'w2-m1') : []),
    ...(monkeyKingSession ? getSessionSupport(monkeyKingSession, 'w2-m2') : []),
    ...(peachElixirSession ? getSessionSupport(peachElixirSession, 'w2-m3') : []),
    ...(furnaceConditionSession ? getSessionSupport(furnaceConditionSession, 'w2-m4') : []),
    ...(heavenlyBossSession ? getSessionSupport(heavenlyBossSession, 'w2-m5') : []),
    ...(manorHelpSession ? getSessionSupport(manorHelpSession, 'w3-m1') : []),
    ...(cuilanBooleanSession ? getSessionSupport(cuilanBooleanSession, 'w3-m2') : []),
    ...(yunzhanDialogueSession ? getSessionSupport(yunzhanDialogueSession, 'w3-m3') : []),
    ...(bajieJoiningSession ? getSessionSupport(bajieJoiningSession, 'w3-m4') : []),
    ...(weekThreeBossSession ? getSessionSupport(weekThreeBossSession, 'w3-m5') : []),
  ];
  const sessionRecords = [dragonSession, ruyiSession, fourSeasSession, underworldSession, bossSession, horseCareSession, monkeyKingSession, peachElixirSession, furnaceConditionSession, heavenlyBossSession, manorHelpSession, cuilanBooleanSession, yunzhanDialogueSession, bajieJoiningSession, weekThreeBossSession, weekFourMappingSession, weekFourVariableSession].filter(
    (session): session is NonNullable<typeof session> => session !== undefined,
  );
  const sessionRuns = safeCount(sessionRecords.reduce(
    (total, session) => safeCount(total, session.totalRuns),
    0,
  ), safeCount(weekFourBranchSession?.totalRuns ?? 0, weekFourListSession?.totalRuns ?? 0));
  const sessionAdjustments = safeCount(sessionRecords.reduce(
    (total, session) => safeCount(
      safeCount(total, session.compileFailures),
      session.runtimeFailures,
    ),
    0,
  ), weekFourBranchSession ? safeCount(
    safeCount(weekFourBranchSession.branchConflictFailures, weekFourBranchSession.branchMissingFailures),
    weekFourBranchSession.validationFailures,
  ) : 0);
  return {
    week,
    completed: records.length,
    total: missions.length,
    stars: records.reduce((sum, record) => safeCount(sum, record.stars), 0),
    hintsUsed: records.reduce((sum, record) => safeCount(sum, record.hintsUsed), 0),
    sessionRuns: safeCount(safeCount(safeCount(safeCount(safeCount(safeCount(safeCount(sessionRuns, weekFourBossSession?.totalRuns ?? 0), weekFiveMonksSession?.totalRuns ?? 0), weekFiveFunctionSession?.totalRuns ?? 0), weekFiveWeatherSession?.totalRuns ?? 0), weekFiveDecompositionSession?.totalRuns ?? 0), weekFiveStoryOrchestrationSession?.totalRuns ?? 0), weekSixRecordsSession?.totalRuns ?? 0),
    sessionAdjustments: [
      sessionAdjustments,
      weekFiveMonksSession ? safeCount(safeCount(weekFiveMonksSession.coverageFailures, weekFiveMonksSession.actionFailures), weekFiveMonksSession.validationFailures) : 0,
      weekFourBossSession ? safeCount(safeCount(weekFourBossSession.identityFailures, weekFourBossSession.branchFailures), weekFourBossSession.validationFailures) : 0,
      weekFourListSession ? safeCount(safeCount(weekFourListSession.listOrderFailures, weekFourListSession.loopValueFailures), weekFourListSession.validationFailures) : 0,
      weekFiveFunctionSession ? safeCount(safeCount(weekFiveFunctionSession.callFailures, weekFiveFunctionSession.bodyFailures), weekFiveFunctionSession.validationFailures) : 0,
      weekFiveWeatherSession ? safeCount(safeCount(weekFiveWeatherSession.callFailures, weekFiveWeatherSession.parameterFailures), weekFiveWeatherSession.validationFailures) : 0,
      weekFiveDecompositionSession ? safeCount(safeCount(weekFiveDecompositionSession.coordinatorFailures, weekFiveDecompositionSession.ownershipFailures), weekFiveDecompositionSession.validationFailures) : 0,
      weekFiveStoryOrchestrationSession ? [weekFiveStoryOrchestrationSession.monkLoopFailures, weekFiveStoryOrchestrationSession.templeCallFailures, weekFiveStoryOrchestrationSession.weatherBindingFailures, weekFiveStoryOrchestrationSession.laterCallOrderFailures, weekFiveStoryOrchestrationSession.validationFailures].reduce((total, value) => safeCount(total, value), 0) : 0,
      weekSixRecordsSession ? [weekSixRecordsSession.recordFailures, weekSixRecordsSession.fieldFailures, weekSixRecordsSession.validationFailures].reduce((total, value) => safeCount(total, value), 0) : 0,
    ].reduce((total, value) => safeCount(total, value), 0),
    needsSupport: [...new Set([...missionSupport, ...sessionSupport, ...(weekFiveFunctionSession?.firstBlockingConcept ? [weekFiveFunctionSession.firstBlockingConcept] : []), ...(weekFiveWeatherSession?.firstBlockingConcept ? [weekFiveWeatherSession.firstBlockingConcept] : []), ...(weekFiveDecompositionSession?.firstBlockingConcept ? [weekFiveDecompositionSession.firstBlockingConcept] : []), ...(weekFiveStoryOrchestrationSession?.firstBlockingConcept ? [weekFiveStoryOrchestrationSession.firstBlockingConcept] : []), ...(weekSixRecordsSession?.firstBlockingConcept ? ['按字段读取记录'] : [])])],
    ...(week !== 3 ? {} : {
      bajieJoining: {
        runs: bajieJoiningSession?.totalRuns ?? 0,
        booleanCompositionFailures: bajieJoiningSession?.conceptFailures.booleanComposition ?? 0,
        observations: bajieJoiningSession?.conditionObservationUses.length ?? 0,
        proof: progress.missionCompletionEvidence['w3-m4']?.kind ?? 'none',
        completedAt: progress.missions['w3-m4']?.completedAt ?? null,
      },
      weekThreeBoss: {
        runs: weekThreeBossSession?.totalRuns ?? 0,
        successfulFullRuns: weekThreeBossSession?.successfulFullRuns ?? 0,
        conceptFailures: weekThreeBossSession?.conceptFailures ?? { manorHelpSpecificity: 0, disguiseIdentity: 0, yunzhanBranch: 0, joiningOperator: 0, programStructure: 0 },
        firstBlocker: weekThreeBossSession?.firstBlockingConcept ?? null,
        observations: weekThreeBossSession?.conditionObservationUses.length ?? 0,
        proof: progress.missionCompletionEvidence['w3-m5']?.kind ?? 'none',
      },
    }),
    ...(week !== 4 ? {} : {
      weekFourMapping: {
        runs: weekFourMappingSession?.totalRuns ?? 0,
        mappingDifferences: weekFourMappingSession?.semanticMismatchFailures ?? 0,
        validationFailures: weekFourMappingSession?.validationFailures ?? 0,
        infrastructureFailures: weekFourMappingSession?.runnerInfrastructureFailures ?? 0,
        observations: weekFourMappingSession?.conditionObservationUses.length ?? 0,
        workSaved: progress.works['w4-m1-first-python-mapping'] !== undefined,
        proof: progress.missionCompletionEvidence['w4-m1']?.kind ?? 'none',
        completedAt: progress.missions['w4-m1']?.completedAt ?? null,
      },
      weekFourVariables: {
        runs: weekFourVariableSession?.totalRuns ?? 0,
        overwriteFailures: weekFourVariableSession?.overwriteFailures ?? 0,
        validationFailures: weekFourVariableSession?.validationFailures ?? 0,
        infrastructureFailures: weekFourVariableSession?.runnerInfrastructureFailures ?? 0,
        observations: weekFourVariableSession?.conditionObservationUses.length ?? 0,
        workSaved: progress.works['w4-m2-variable-evidence-record'] !== undefined,
        proof: progress.missionCompletionEvidence['w4-m2']?.kind ?? 'none',
        completedAt: progress.missions['w4-m2']?.completedAt ?? null,
      },
      weekFourBranches: {
        runs: weekFourBranchSession?.totalRuns ?? 0,
        conflicts: weekFourBranchSession?.branchConflictFailures ?? 0,
        missing: weekFourBranchSession?.branchMissingFailures ?? 0,
        validation: weekFourBranchSession?.validationFailures ?? 0,
        infrastructure: weekFourBranchSession?.runnerInfrastructureFailures ?? 0,
        observations: weekFourBranchSession?.conditionObservationUses.length ?? 0,
        workSaved: progress.works['w4-m3-branch-structure-record'] !== undefined,
        proof: progress.missionCompletionEvidence['w4-m3']?.kind ?? 'none',
        completedAt: progress.missions['w4-m3']?.completedAt ?? null,
      },
    }),
    ...(week !== 5 ? {} : {
      weekFiveFunction: {
        runs: weekFiveFunctionSession?.totalRuns ?? 0,
        callFailures: weekFiveFunctionSession?.callFailures ?? 0,
        bodyFailures: weekFiveFunctionSession?.bodyFailures ?? 0,
        validationFailures: weekFiveFunctionSession?.validationFailures ?? 0,
        infrastructureFailures: weekFiveFunctionSession?.runnerInfrastructureFailures ?? 0,
        observations: weekFiveFunctionSession?.conditionObservationUses.length ?? 0,
        workSaved: progress.works['w5-m2-sanqing-function-record'] !== undefined,
        proof: progress.missionCompletionEvidence['w5-m2']?.kind ?? 'none',
        completedAt: progress.missions['w5-m2']?.completedAt ?? null,
      },
      weekFiveWeather: { runs:weekFiveWeatherSession?.totalRuns??0,callFailures:weekFiveWeatherSession?.callFailures??0,parameterFailures:weekFiveWeatherSession?.parameterFailures??0,validationFailures:weekFiveWeatherSession?.validationFailures??0,infrastructureFailures:weekFiveWeatherSession?.runnerInfrastructureFailures??0,observations:weekFiveWeatherSession?.conditionObservationUses.length??0,workSaved:progress.works['w5-m3-weather-parameter-record']!==undefined,proof:progress.missionCompletionEvidence['w5-m3']?.kind??'none',completedAt:progress.missions['w5-m3']?.completedAt??null},
      weekFiveDecomposition: { runs:weekFiveDecompositionSession?.totalRuns??0,coordinatorFailures:weekFiveDecompositionSession?.coordinatorFailures??0,ownershipFailures:weekFiveDecompositionSession?.ownershipFailures??0,validationFailures:weekFiveDecompositionSession?.validationFailures??0,infrastructureFailures:weekFiveDecompositionSession?.runnerInfrastructureFailures??0,observations:weekFiveDecompositionSession?.conditionObservationUses.length??0,workSaved:progress.works['w5-m4-problem-decomposition-record']!==undefined,proof:progress.missionCompletionEvidence['w5-m4']?.kind??'none',completedAt:progress.missions['w5-m4']?.completedAt??null},
      weekFiveStoryOrchestration: { runs:weekFiveStoryOrchestrationSession?.totalRuns??0,monkLoopFailures:weekFiveStoryOrchestrationSession?.monkLoopFailures??0,templeCallFailures:weekFiveStoryOrchestrationSession?.templeCallFailures??0,weatherBindingFailures:weekFiveStoryOrchestrationSession?.weatherBindingFailures??0,laterCallOrderFailures:weekFiveStoryOrchestrationSession?.laterCallOrderFailures??0,validationFailures:weekFiveStoryOrchestrationSession?.validationFailures??0,infrastructureFailures:weekFiveStoryOrchestrationSession?.runnerInfrastructureFailures??0,observations:weekFiveStoryOrchestrationSession?.conditionObservationUses.length??0,workSaved:progress.works['w5-m5-story-orchestration-record']!==undefined,proof:progress.missionCompletionEvidence['w5-m5']?.kind??'none',completedAt:progress.missions['w5-m5']?.completedAt??null},
    }),
    ...(week !== 6 ? {} : {
      weekSixRecords: { runs:weekSixRecordsSession?.totalRuns??0,recordFailures:weekSixRecordsSession?.recordFailures??0,fieldFailures:weekSixRecordsSession?.fieldFailures??0,validationFailures:weekSixRecordsSession?.validationFailures??0,infrastructureFailures:weekSixRecordsSession?.runnerInfrastructureFailures??0,observations:weekSixRecordsSession?.conditionObservationUses.length??0,workSaved:progress.works['w6-m1-structured-records-table']!==undefined,proof:progress.missionCompletionEvidence['w6-m1']?.kind??'none',completedAt:progress.missions['w6-m1']?.completedAt??null},
    }),
  };
}


function sequencePrecondition(session: WorkspaceMissionSession): number {
  return 'sequencePrecondition' in session.conceptFailures
    ? session.conceptFailures.sequencePrecondition
    : 0;
}

export function getSessionSupport(session: DragonPalaceMissionSession): string[];
export function getSessionSupport(
  session: DragonPalaceMissionSession,
  missionId: 'w1-m1',
): string[];
export function getSessionSupport(session: AdvancedWeekOneMissionSession, missionId: 'w1-m4' | 'w1-m5'): string[];
export function getSessionSupport(session: HorseCareMissionSession, missionId: 'w2-m1'): string[];
export function getSessionSupport(session: MonkeyKingMissionSession, missionId: 'w2-m2'): string[];
export function getSessionSupport(session: PeachElixirMissionSession, missionId: 'w2-m3'): string[];
export function getSessionSupport(session: FurnaceConditionMissionSession, missionId: 'w2-m4'): string[];
export function getSessionSupport(session: HeavenlySignalBossMissionSession, missionId: 'w2-m5'): string[];
export function getSessionSupport(session: ManorHelpMissionSession, missionId: 'w3-m1'): string[];
export function getSessionSupport(session: CuilanBooleanMissionSession, missionId: 'w3-m2'): string[];
export function getSessionSupport(session: YunzhanDialogueMissionSession, missionId: 'w3-m3'): string[];
export function getSessionSupport(session: BajieJoiningMissionSession, missionId: 'w3-m4'): string[];
export function getSessionSupport(session: WeekThreeBossMissionSession, missionId: 'w3-m5'): string[];
export function getSessionSupport(
  session: RuyiStaffMissionSession,
  missionId: 'w1-m2',
): string[];
export function getSessionSupport(
  session: FourSeasRegaliaMissionSession,
  missionId: 'w1-m3',
): string[];
export function getSessionSupport(
  session: WorkspaceMissionSession,
  missionId: ExecutableMissionId = 'w1-m1',
): string[] {
  const support: string[] = [];
  if (missionId === 'w3-m1') {
    const manor = session as ManorHelpMissionSession;
    if (
      manor.conceptFailures.programStructure >= 2
      || manor.conceptFailures.conditionSelection >= 2
      || manor.conceptFailures.branchRouting >= 2
      || manor.conceptFailures.completeness >= 2
    ) support.push('真假条件与分支');
    if (new Set(manor.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w3-m2') {
    const cuilan = session as CuilanBooleanMissionSession;
    if (
      cuilan.conceptFailures.programStructure >= 2
      || cuilan.conceptFailures.conditionSelection >= 2
      || cuilan.conceptFailures.branchRouting >= 2
      || cuilan.conceptFailures.sequencePrecondition >= 2
      || cuilan.conceptFailures.completeness >= 2
    ) support.push('布尔判断与分支');
    if (new Set(cuilan.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w3-m3') {
    const yunzhan = session as YunzhanDialogueMissionSession;
    if (yunzhan.conceptFailures.programStructure >= 2 || yunzhan.conceptFailures.branchRouting >= 2 || yunzhan.conceptFailures.completeness >= 2) support.push('双轮条件分支');
    if (new Set(yunzhan.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w3-m4') {
    const bajie = session as BajieJoiningMissionSession;
    if (bajie.conceptFailures.booleanComposition >= 2) support.push('多条件组合');
    if (bajie.conceptFailures.completeness >= 2) support.push('完整条件核对');
    if (new Set(bajie.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w3-m5') {
    const boss = session as WeekThreeBossMissionSession;
    if (boss.runtimeFailures >= 2 || boss.compileFailures >= 2) support.push('故事状态与条件判断');
    if (new Set(boss.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  const common = session as Exclude<WorkspaceMissionSession, WeekThreeBossMissionSession>;
  if (missionId === 'w2-m3') {
    if (common.conceptFailures.programStructure >= 2 || sequencePrecondition(common) >= 2 || common.conceptFailures.completeness >= 2) support.push('顺序调试');
    if (new Set(common.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w2-m4') {
    if (sequencePrecondition(common) >= 2 || common.conceptFailures.completeness >= 2) support.push('循环结束条件');
    if (new Set(common.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w2-m5') {
    if (common.runtimeFailures >= 2 || common.compileFailures >= 2) support.push('循环与调试综合');
    if (new Set(common.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w2-m2') {
    if (common.conceptFailures.programStructure >= 2 || sequencePrecondition(common) >= 2 || common.conceptFailures.completeness >= 2) support.push('事件触发');
    if (new Set(common.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w2-m1') {
    if (common.conceptFailures.programStructure >= 2 || sequencePrecondition(common) >= 2 || common.conceptFailures.completeness >= 2) support.push('重复与循环');
    if (new Set(common.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w1-m4') {
    if (common.conceptFailures.programStructure >= 2 || sequencePrecondition(common) >= 2 || common.conceptFailures.completeness >= 2) support.push('查找与处理');
    if (new Set(common.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w1-m5') {
    if (common.conceptFailures.programStructure >= 2 || sequencePrecondition(common) >= 2 || common.conceptFailures.completeness >= 2) support.push('综合算法规划');
    if (new Set(common.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w1-m3') {
    if (
      common.conceptFailures.programStructure >= 2
      || sequencePrecondition(common) >= 2
      || common.conceptFailures.completeness >= 2
    ) support.push('任务分解');
    if (new Set(common.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (common.conceptFailures.programStructure >= 2) support.push('程序结构');
  if (sequencePrecondition(common) >= 2) {
    support.push(missionId === 'w1-m2' ? '数值比较' : '顺序与前置条件');
  }
  if (common.conceptFailures.completeness >= 2) support.push('完整性检查');
  if (new Set(common.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
  return support;
}
