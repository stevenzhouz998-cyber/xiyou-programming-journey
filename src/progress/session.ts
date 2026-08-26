import type {
  BattleRunResult,
  DragonPalaceInstruction,
  FourSeasBattleRunResult,
  FourSeasInstruction,
  RuyiStaffBattleRunResult,
  RuyiStaffInstruction,
} from '../battle/types';
import type { WorkspaceDraftV1 } from '../blockly/draft';
import type { FourSeasWorkspaceDraftV1 } from '../blockly/fourSeasRegaliaDraft';
import type { RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft';
import type { AdvancedWeekOneWorkspaceDraftV1 } from '../blockly/advancedWeekOneDraft';
import type { AdvancedWeekOneInstruction } from '../blockly/advancedWeekOneContract';
import type { AdvancedWeekOneRunResult } from '../battle/advancedWeekOne';
import type {
  HorseCareInstruction,
  HorseCareRunResult,
  HorseCareWorkspaceDraftV1,
} from '../blockly/weekTwoHorseContract';
import type {
  MonkeyKingInstruction,
  MonkeyKingRunResult,
  MonkeyKingWorkspaceDraftV1,
} from '../blockly/weekTwoMonkeyKingContract';
import {
  createDefaultPeachElixirDraft,
  type PeachElixirInstruction,
  type PeachElixirRunResult,
  type PeachElixirWorkspaceDraftV1,
} from '../blockly/weekTwoPeachElixirContract';
import {
  createDefaultFurnaceConditionDraft,
  type FurnaceConditionInstruction,
  type FurnaceConditionRunResult,
  type FurnaceConditionWorkspaceDraftV1,
} from '../blockly/weekTwoFurnaceConditionContract';
import {
  compileHeavenlySignalBossDraft,
  createDefaultHeavenlySignalBossDraft,
  type HeavenlySignalBossInstruction,
  type HeavenlySignalBossRunResult,
  type HeavenlySignalBossWorkspaceDraftV1,
} from '../blockly/weekTwoHeavenlySignalBossContract';
import {
  compileManorHelpDraft,
  createDefaultManorHelpDraft,
  runManorHelp,
  type ManorHelpInstruction,
  type ManorHelpRunResult,
  type ManorHelpWorkspaceDraftV1,
} from '../blockly/weekThreeManorHelpContract';
import type {
  DragonPalaceMissionSession,
  ExecutableMissionId,
  FourSeasRegaliaMissionSession,
  MissionSession,
  MissionSessionById,
  RuyiStaffMissionSession,
  AdvancedWeekOneMissionSession,
  HorseCareMissionSession,
  MonkeyKingMissionSession,
  PeachElixirMissionSession,
  FurnaceConditionMissionSession,
  HeavenlySignalBossMissionSession,
  ManorHelpMissionSession,
} from './types';
import { isExecutableMissionId } from './executableMissionIds';

type HintTier = MissionSession['usedHintTiers'][number];

function assertCanonicalIso(now: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(now)) {
    throw new Error('会话时间必须是有效ISO UTC日期');
  }
  const parsed = new Date(now);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== now) {
    throw new Error('会话时间必须是有效ISO UTC日期');
  }
}

function increment(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
    throw new Error('会话计数超出安全范围');
  }
  return value + 1;
}

function cloneSession<TSession extends MissionSession>(session: TSession): TSession {
  return structuredClone(session);
}

export function createMissionSession<TMissionId extends ExecutableMissionId>(
  missionId: TMissionId,
): MissionSessionById[TMissionId];
export function createMissionSession(now: string): DragonPalaceMissionSession;
export function createMissionSession(
  missionId: 'w1-m1',
  now: string,
): DragonPalaceMissionSession;
export function createMissionSession(
  missionId: 'w1-m2',
  now: string,
): RuyiStaffMissionSession;
export function createMissionSession(
  missionId: 'w1-m3',
  now: string,
): FourSeasRegaliaMissionSession;
export function createMissionSession(missionId: 'w1-m4', now: string): AdvancedWeekOneMissionSession;
export function createMissionSession(missionId: 'w1-m5', now: string): AdvancedWeekOneMissionSession;
export function createMissionSession(missionId: 'w2-m1', now: string): HorseCareMissionSession;
export function createMissionSession(missionId: 'w2-m2', now: string): MonkeyKingMissionSession;
export function createMissionSession(missionId: 'w2-m3', now: string): PeachElixirMissionSession;
export function createMissionSession(missionId: 'w2-m4', now: string): FurnaceConditionMissionSession;
export function createMissionSession(missionId: 'w2-m5', now: string): HeavenlySignalBossMissionSession;
export function createMissionSession(missionId: 'w3-m1', now: string): ManorHelpMissionSession;
export function createMissionSession(
  missionIdOrNow: ExecutableMissionId | string,
  suppliedNow?: string,
): MissionSession {
  const missionIdOnly = suppliedNow === undefined && isExecutableMissionId(missionIdOrNow);
  const now = suppliedNow ?? (missionIdOnly ? new Date(0).toISOString() : missionIdOrNow);
  if (suppliedNow !== undefined && !isExecutableMissionId(missionIdOrNow)) {
    throw new Error('任务编号无效');
  }
  assertCanonicalIso(now);
  const session = {
    workspace: missionIdOrNow === 'w3-m1'
      ? createDefaultManorHelpDraft()
      : missionIdOrNow === 'w2-m5'
      ? createDefaultHeavenlySignalBossDraft()
      : missionIdOrNow === 'w2-m4'
      ? createDefaultFurnaceConditionDraft()
      : missionIdOrNow === 'w2-m3'
      ? createDefaultPeachElixirDraft()
      : missionIdOrNow === 'w1-m4' || missionIdOrNow === 'w1-m5' || missionIdOrNow === 'w2-m1' || missionIdOrNow === 'w2-m2'
        ? { version: 1, missionId: missionIdOrNow, blocks: [] }
      : { version: 1, blocks: [] },
    lastTrace: [],
    lastRun: null,
    totalRuns: 0,
    runtimeFailures: 0,
    compileFailures: 0,
    usedHintTiers: [],
    conceptFailures: missionIdOrNow === 'w3-m1'
      ? { programStructure: 0, conditionSelection: 0, branchRouting: 0, completeness: 0 }
      : missionIdOrNow === 'w2-m5'
      ? { programStructure: 0, loopCount: 0, eventRouting: 0, handlerSequence: 0, sequencePrecondition: 0, loopCondition: 0, conditionNeverMet: 0, completeness: 0 }
      : { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
    lastRunAt: null,
    savedAt: now,
  } as MissionSession;
  if (missionIdOrNow === 'w1-m4' || missionIdOrNow === 'w1-m5') {
    Object.assign(session, { equipmentEffectsUsed: [] });
  }
  if (missionIdOrNow === 'w3-m1') {
    Object.assign(session, { scenarioResults: [], failureSnapshot: null, conditionObservationUses: [] });
  }
  return session as MissionSessionById[ExecutableMissionId];
}

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
export function updateWorkspaceDraft(
  session: MissionSession,
  workspace: WorkspaceDraftV1 | RuyiWorkspaceDraftV1 | FourSeasWorkspaceDraftV1 | AdvancedWeekOneWorkspaceDraftV1 | HorseCareWorkspaceDraftV1 | MonkeyKingWorkspaceDraftV1 | PeachElixirWorkspaceDraftV1 | FurnaceConditionWorkspaceDraftV1 | HeavenlySignalBossWorkspaceDraftV1 | ManorHelpWorkspaceDraftV1,
  now: string,
): MissionSession {
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
  return next;
}

export function recordCompileFailure<TSession extends MissionSession>(
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
export function recordRun(
  session: MissionSession,
  result: BattleRunResult | RuyiStaffBattleRunResult | FourSeasBattleRunResult | AdvancedWeekOneRunResult | HorseCareRunResult | MonkeyKingRunResult | PeachElixirRunResult | FurnaceConditionRunResult | HeavenlySignalBossRunResult | ManorHelpRunResult,
  trace: DragonPalaceInstruction[] | RuyiStaffInstruction[] | FourSeasInstruction[] | AdvancedWeekOneInstruction[] | HorseCareInstruction[] | MonkeyKingInstruction[] | PeachElixirInstruction[] | FurnaceConditionInstruction[] | HeavenlySignalBossInstruction[] | ManorHelpInstruction[],
  now: string,
): MissionSession {
  assertCanonicalIso(now);
  const next = cloneSession(session);
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

  if (!result.completed && result.diagnostic !== null) {
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
      next.conceptFailures.completeness = increment(next.conceptFailures.completeness);
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
): ManorHelpMissionSession {
  assertCanonicalIso(now);
  if (typeof snapshotId !== 'string' || snapshotId.length === 0 || snapshotId.length > 256) throw new Error('条件观察快照编号无效');
  if (session.failureSnapshot === null || session.failureSnapshot.snapshotId !== snapshotId) throw new Error('条件观察快照不是当前失败快照');
  if (session.conditionObservationUses.some((use) => use.snapshotId === snapshotId)) return session;
  const next = cloneSession(session);
  next.conditionObservationUses.push({
    snapshotId,
    usedAt: now,
    workspace: structuredClone(session.workspace),
  });
  next.savedAt = now;
  return next;
}

export function recordHint<TSession extends MissionSession>(
  session: TSession,
  tier: HintTier,
  now: string,
): TSession {
  assertCanonicalIso(now);
  const next = cloneSession(session);
  if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier);
  next.savedAt = now;
  return next;
}

function sequencePrecondition(session: MissionSession): number {
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
export function getSessionSupport(
  session: RuyiStaffMissionSession,
  missionId: 'w1-m2',
): string[];
export function getSessionSupport(
  session: FourSeasRegaliaMissionSession,
  missionId: 'w1-m3',
): string[];
export function getSessionSupport(
  session: MissionSession,
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
  if (missionId === 'w2-m3') {
    if (session.conceptFailures.programStructure >= 2 || sequencePrecondition(session) >= 2 || session.conceptFailures.completeness >= 2) support.push('顺序调试');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w2-m4') {
    if (sequencePrecondition(session) >= 2 || session.conceptFailures.completeness >= 2) support.push('循环结束条件');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w2-m5') {
    if (session.runtimeFailures >= 2 || session.compileFailures >= 2) support.push('循环与调试综合');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w2-m2') {
    if (session.conceptFailures.programStructure >= 2 || sequencePrecondition(session) >= 2 || session.conceptFailures.completeness >= 2) support.push('事件触发');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w2-m1') {
    if (session.conceptFailures.programStructure >= 2 || sequencePrecondition(session) >= 2 || session.conceptFailures.completeness >= 2) support.push('重复与循环');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w1-m4') {
    if (session.conceptFailures.programStructure >= 2 || sequencePrecondition(session) >= 2 || session.conceptFailures.completeness >= 2) support.push('查找与处理');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w1-m5') {
    if (session.conceptFailures.programStructure >= 2 || sequencePrecondition(session) >= 2 || session.conceptFailures.completeness >= 2) support.push('综合算法规划');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w1-m3') {
    if (
      session.conceptFailures.programStructure >= 2
      || sequencePrecondition(session) >= 2
      || session.conceptFailures.completeness >= 2
    ) support.push('任务分解');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (session.conceptFailures.programStructure >= 2) support.push('程序结构');
  if (sequencePrecondition(session) >= 2) {
    support.push(missionId === 'w1-m2' ? '数值比较' : '顺序与前置条件');
  }
  if (session.conceptFailures.completeness >= 2) support.push('完整性检查');
  if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
  return support;
}
