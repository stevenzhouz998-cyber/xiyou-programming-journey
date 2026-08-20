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
  DragonPalaceMissionSession,
  ExecutableMissionId,
  FourSeasRegaliaMissionSession,
  MissionSession,
  MissionSessionById,
  RuyiStaffMissionSession,
  AdvancedWeekOneMissionSession,
} from './types';

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
export function createMissionSession(
  missionIdOrNow: ExecutableMissionId | string,
  suppliedNow?: string,
): MissionSession {
  const missionIdOnly = suppliedNow === undefined
    && (missionIdOrNow === 'w1-m1' || missionIdOrNow === 'w1-m2' || missionIdOrNow === 'w1-m3' || missionIdOrNow === 'w1-m4' || missionIdOrNow === 'w1-m5');
  const now = suppliedNow ?? (missionIdOnly ? new Date(0).toISOString() : missionIdOrNow);
  if (suppliedNow !== undefined
    && missionIdOrNow !== 'w1-m1'
    && missionIdOrNow !== 'w1-m2'
    && missionIdOrNow !== 'w1-m3' && missionIdOrNow !== 'w1-m4' && missionIdOrNow !== 'w1-m5') {
    throw new Error('任务编号无效');
  }
  assertCanonicalIso(now);
  const session = {
    workspace: missionIdOrNow === 'w1-m4' || missionIdOrNow === 'w1-m5'
      ? { version: 1, missionId: missionIdOrNow, blocks: [] }
      : { version: 1, blocks: [] },
    lastTrace: [],
    lastRun: null,
    totalRuns: 0,
    runtimeFailures: 0,
    compileFailures: 0,
    usedHintTiers: [],
    conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
    lastRunAt: null,
    savedAt: now,
  } as MissionSession;
  if (missionIdOrNow === 'w1-m4' || missionIdOrNow === 'w1-m5') {
    Object.assign(session, { equipmentEffectsUsed: [] });
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
export function updateWorkspaceDraft(
  session: MissionSession,
  workspace: WorkspaceDraftV1 | RuyiWorkspaceDraftV1 | FourSeasWorkspaceDraftV1 | AdvancedWeekOneWorkspaceDraftV1,
  now: string,
): MissionSession {
  assertCanonicalIso(now);
  const next = cloneSession(session);
  Object.assign(next, { workspace: structuredClone(workspace), savedAt: now });
  if ('missionId' in workspace) {
    Object.assign(next, { lastTrace: [], lastRun: null, lastRunAt: null });
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
export function recordRun(
  session: MissionSession,
  result: BattleRunResult | RuyiStaffBattleRunResult | FourSeasBattleRunResult | AdvancedWeekOneRunResult,
  trace: DragonPalaceInstruction[] | RuyiStaffInstruction[] | FourSeasInstruction[] | AdvancedWeekOneInstruction[],
  now: string,
): MissionSession {
  assertCanonicalIso(now);
  const next = cloneSession(session);
  next.totalRuns = increment(next.totalRuns);

  if (!result.completed && result.diagnostic !== null) {
    next.runtimeFailures = increment(next.runtimeFailures);
    if (result.diagnostic.type === 'instruction-rejected') {
      next.conceptFailures.sequencePrecondition = increment(
        next.conceptFailures.sequencePrecondition,
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

export function getSessionSupport(session: DragonPalaceMissionSession): string[];
export function getSessionSupport(
  session: DragonPalaceMissionSession,
  missionId: 'w1-m1',
): string[];
export function getSessionSupport(session: AdvancedWeekOneMissionSession, missionId: 'w1-m4' | 'w1-m5'): string[];
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
  if (missionId === 'w1-m4') {
    if (session.conceptFailures.programStructure >= 2 || session.conceptFailures.sequencePrecondition >= 2 || session.conceptFailures.completeness >= 2) support.push('查找与处理');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w1-m5') {
    if (session.conceptFailures.programStructure >= 2 || session.conceptFailures.sequencePrecondition >= 2 || session.conceptFailures.completeness >= 2) support.push('综合算法规划');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (missionId === 'w1-m3') {
    if (
      session.conceptFailures.programStructure >= 2
      || session.conceptFailures.sequencePrecondition >= 2
      || session.conceptFailures.completeness >= 2
    ) support.push('任务分解');
    if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
    return support;
  }
  if (session.conceptFailures.programStructure >= 2) support.push('程序结构');
  if (session.conceptFailures.sequencePrecondition >= 2) {
    support.push(missionId === 'w1-m2' ? '数值比较' : '顺序与前置条件');
  }
  if (session.conceptFailures.completeness >= 2) support.push('完整性检查');
  if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
  return support;
}
