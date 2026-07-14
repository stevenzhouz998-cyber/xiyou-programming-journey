import type { BattleInstruction, BattleRunResult } from '../battle/types';
import type { WorkspaceDraftV1 } from '../blockly/draft';
import type { MissionSession } from './types';

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

function cloneSession(session: MissionSession): MissionSession {
  return structuredClone(session);
}

export function createMissionSession(now: string): MissionSession {
  assertCanonicalIso(now);
  return {
    workspace: { version: 1, blocks: [] },
    lastTrace: [],
    lastRun: null,
    totalRuns: 0,
    runtimeFailures: 0,
    compileFailures: 0,
    usedHintTiers: [],
    conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
    lastRunAt: null,
    savedAt: now,
  };
}

export function updateWorkspaceDraft(
  session: MissionSession,
  workspace: WorkspaceDraftV1,
  now: string,
): MissionSession {
  assertCanonicalIso(now);
  const next = cloneSession(session);
  next.workspace = structuredClone(workspace);
  next.savedAt = now;
  return next;
}

export function recordCompileFailure(
  session: MissionSession,
  concept: 'program-structure',
  now: string,
): MissionSession {
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
  session: MissionSession,
  result: BattleRunResult,
  trace: BattleInstruction[],
  now: string,
): MissionSession {
  assertCanonicalIso(now);
  const next = cloneSession(session);
  next.totalRuns = increment(next.totalRuns);

  if (!result.completed) {
    next.runtimeFailures = increment(next.runtimeFailures);
    if (result.diagnostic.type === 'instruction-rejected') {
      next.conceptFailures.sequencePrecondition = increment(
        next.conceptFailures.sequencePrecondition,
      );
    } else {
      next.conceptFailures.completeness = increment(next.conceptFailures.completeness);
    }
  }

  next.lastTrace = structuredClone(trace);
  next.lastRun = structuredClone(result);
  next.lastRunAt = now;
  next.savedAt = now;
  return next;
}

export function recordHint(
  session: MissionSession,
  tier: HintTier,
  now: string,
): MissionSession {
  assertCanonicalIso(now);
  const next = cloneSession(session);
  if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier);
  next.savedAt = now;
  return next;
}

export function getSessionSupport(session: MissionSession): string[] {
  const support: string[] = [];
  if (session.conceptFailures.programStructure >= 2) support.push('程序结构');
  if (session.conceptFailures.sequencePrecondition >= 2) support.push('顺序与前置条件');
  if (session.conceptFailures.completeness >= 2) support.push('完整性检查');
  if (new Set(session.usedHintTiers).size >= 2) support.push('使用了多个提示层级');
  return support;
}
