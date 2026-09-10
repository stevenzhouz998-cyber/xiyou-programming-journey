import {
  DEFAULT_WEEK_FOUR_BOSS_PYTHON,
  parseWeekFourBossDraftEnvelope,
  parseWeekFourBossPython,
  type WeekFourBossPythonRunnable,
} from '../engine/weekFourBossPythonGrammar';
import type {
  WeekFourBossFailureSnapshot,
  WeekFourBossRunResult,
  WeekFourBossTraceItem,
} from '../engine/weekFourBossContract';

export interface WeekFourBossMissionSession {
  kind: 'python-verification-station-v1';
  pythonCode: string;
  lastCanonicalTrace: WeekFourBossTraceItem[];
  lastWorkerTrace: WeekFourBossTraceItem[];
  lastRun: WeekFourBossRunResult | null;
  failureSnapshot: WeekFourBossFailureSnapshot | null;
  totalRuns: number;
  identityFailures: number;
  branchFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  conditionObservationUses: Array<{
    snapshotId: WeekFourBossFailureSnapshot['snapshotId'];
    pythonCode: string;
    canonicalTrace: WeekFourBossTraceItem[];
    workerTrace: WeekFourBossTraceItem[];
    run: WeekFourBossRunResult;
    usedAt: string;
  }>;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  firstBlockingConcept: 'identity-source' | 'branch-action' | 'python-structure' | null;
  lastRunAt: string | null;
  savedAt: string;
}

type WeekFourBossRunInput = {
  canonicalTrace: WeekFourBossTraceItem[];
  workerTrace: WeekFourBossTraceItem[];
  run: WeekFourBossRunResult;
};

const UTC_ISO_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function parseIso(value: string): number {
  const parsed = typeof value === 'string' && UTC_ISO_MILLISECONDS.test(value) ? new Date(value) : null;
  if (parsed === null || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error('W4-M5 会话时间必须是标准 UTC ISO。');
  }
  return parsed.getTime();
}

function assertMutationTime(session: WeekFourBossMissionSession, now: string): void {
  if (parseIso(now) < parseIso(session.savedAt)) throw new Error('W4-M5 会话时间不得倒退。');
}

function increment(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
    throw new Error('W4-M5 会话计数超出安全范围。');
  }
  return value + 1;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function runnableFor(code: string): WeekFourBossPythonRunnable {
  const parsed = parseWeekFourBossPython(code);
  if ('state' in parsed) {
    throw new Error('W4-M5 当前 Python 结构无效，不是 runnable 输入。');
  }
  return parsed;
}

export function createWeekFourBossSession(now: string): WeekFourBossMissionSession {
  parseIso(now);
  parseWeekFourBossDraftEnvelope(DEFAULT_WEEK_FOUR_BOSS_PYTHON);
  return {
    kind: 'python-verification-station-v1',
    pythonCode: DEFAULT_WEEK_FOUR_BOSS_PYTHON,
    lastCanonicalTrace: [],
    lastWorkerTrace: [],
    lastRun: null,
    failureSnapshot: null,
    totalRuns: 0,
    identityFailures: 0,
    branchFailures: 0,
    validationFailures: 0,
    runnerInfrastructureFailures: 0,
    conditionObservationUses: [],
    usedHintTiers: [],
    firstBlockingConcept: null,
    lastRunAt: null,
    savedAt: now,
  };
}

export function updateWeekFourBossCode(
  session: WeekFourBossMissionSession,
  code: string,
  now: string,
): WeekFourBossMissionSession {
  assertMutationTime(session, now);
  parseWeekFourBossDraftEnvelope(code);
  if (code === session.pythonCode) return structuredClone(session);
  return {
    ...structuredClone(session),
    pythonCode: code,
    lastCanonicalTrace: [],
    lastWorkerTrace: [],
    lastRun: null,
    failureSnapshot: null,
    conditionObservationUses: [],
    lastRunAt: null,
    savedAt: now,
  };
}

export function recordWeekFourBossRun(
  session: WeekFourBossMissionSession,
  input: WeekFourBossRunInput,
  now: string,
): WeekFourBossMissionSession {
  assertMutationTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  if (!input || !same(input.canonicalTrace, parsed.trace)
    || !same(input.workerTrace, parsed.trace) || !same(input.run, parsed.run)) {
    throw new Error('W4-M5 运行 trace 与结果必须来自当前保存的 Python 输入。');
  }
  const next = structuredClone(session);
  next.lastCanonicalTrace = structuredClone(parsed.trace);
  next.lastWorkerTrace = structuredClone(parsed.trace);
  next.lastRun = structuredClone(parsed.run);
  next.failureSnapshot = structuredClone(parsed.run.failureSnapshots[0] ?? null);
  // A new execution supersedes the observed run, even when its code and trace match.
  next.conditionObservationUses = [];
  next.totalRuns = increment(next.totalRuns);
  const conflict = parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'identity-conflict');
  const missing = parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'branch-conflict');
  if (conflict) next.identityFailures = increment(next.identityFailures);
  if (missing) next.branchFailures = increment(next.branchFailures);
  if (next.firstBlockingConcept === null) {
    if (conflict) next.firstBlockingConcept = 'identity-source';
    else if (missing) next.firstBlockingConcept = 'branch-action';
  }
  next.lastRunAt = now;
  next.savedAt = now;
  return next;
}

export function recordWeekFourBossValidationFailure(
  session: WeekFourBossMissionSession,
  now: string,
): WeekFourBossMissionSession {
  assertMutationTime(session, now);
  const parsed = parseWeekFourBossPython(session.pythonCode);
  if (!('state' in parsed)) {
    throw new Error('W4-M5 只有当前结构无效的草稿才能记录验证失败。');
  }
  const next = structuredClone(session);
  next.validationFailures = increment(next.validationFailures);
  if (next.firstBlockingConcept === null) next.firstBlockingConcept = 'python-structure';
  next.savedAt = now;
  return next;
}

export function recordWeekFourBossInfrastructureFailure(
  session: WeekFourBossMissionSession,
  input: { executionStarted: boolean },
  now: string,
): WeekFourBossMissionSession {
  assertMutationTime(session, now);
  if (!input || typeof input.executionStarted !== 'boolean') {
    throw new Error('W4-M5 基础设施失败 executionStarted 记录无效。');
  }
  const next = structuredClone(session);
  next.runnerInfrastructureFailures = increment(next.runnerInfrastructureFailures);
  if (input.executionStarted) next.totalRuns = increment(next.totalRuns);
  next.savedAt = now;
  return next;
}

export function recordWeekFourBossObservation(
  session: WeekFourBossMissionSession,
  now: string,
): WeekFourBossMissionSession {
  assertMutationTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  const snapshot = session.failureSnapshot;
  if (snapshot === null || session.lastRun === null
    || !same(session.lastCanonicalTrace, parsed.trace)
    || !same(session.lastWorkerTrace, parsed.trace)
    || !same(session.lastRun, parsed.run)
    || !parsed.run.failureSnapshots.some((candidate) => candidate.snapshotId === snapshot.snapshotId)) {
    throw new Error('W4-M5 没有与当前代码绑定的有效失败快照。');
  }
  const next = structuredClone(session);
  if (!next.conditionObservationUses.some((use) => use.snapshotId === snapshot.snapshotId)) {
    next.conditionObservationUses.push({
      snapshotId: snapshot.snapshotId,
      pythonCode: next.pythonCode,
      canonicalTrace: structuredClone(parsed.trace),
      workerTrace: structuredClone(parsed.trace),
      run: structuredClone(parsed.run),
      usedAt: now,
    });
  }
  next.savedAt = now;
  return next;
}

export function recordWeekFourBossHint(
  session: WeekFourBossMissionSession,
  tier: 'observe' | 'think' | 'partial',
  now: string,
): WeekFourBossMissionSession {
  assertMutationTime(session, now);
  if (tier !== 'observe' && tier !== 'think' && tier !== 'partial') {
    throw new Error('W4-M5 提示层级无效。');
  }
  const next = structuredClone(session);
  if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier);
  next.savedAt = now;
  return next;
}
