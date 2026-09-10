import { parseWeekFiveMonksPython, type WeekFiveMonksPythonRunnable } from '../engine/weekFiveMonksPythonGrammar';
import type { MissionProgress, WeekFiveMonksCompletionEvidence, WeekFiveMonksWorkV1 } from './types';
import type { WeekFiveMonksMissionSession } from './weekFiveMonksSession';

const sessionKeys = new Set([
  'kind', 'pythonCode', 'lastCanonicalTrace', 'lastWorkerTrace', 'lastRun', 'failureSnapshot',
  'totalRuns', 'coverageFailures', 'actionFailures', 'validationFailures',
  'runnerInfrastructureFailures', 'conditionObservationUses', 'usedHintTiers',
  'firstBlockingConcept', 'lastRunAt', 'savedAt',
]);
const observationKeys = new Set(['snapshotId', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'usedAt']);
const workKeys = new Set(['kind', 'workId', 'missionId', 'title', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'createdAt', 'verifiedAt']);
const formalEvidenceKeys = new Set(['kind', 'completedAt', 'verifiedAt', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'workId']);
const legacyEvidenceKeys = new Set(['kind', 'completedAt', 'sourceVersion', 'sourceSchemaRevision']);
const UTC_ISO_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function assertPlainData(value: unknown, label: string): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return;
  if (Array.isArray(value)) {
    const length = Object.getOwnPropertyDescriptor(value, 'length');
    if (!length || !('value' in length) || length.value !== value.length || length.enumerable || length.configurable || !length.writable) throw new Error(`${label}必须是普通数据数组。`);
    for (const key of Reflect.ownKeys(value)) {
      if (key === 'length') continue;
      if (typeof key !== 'string' || !/^(?:0|[1-9]\d*)$/.test(key)) throw new Error(`${label}包含非数据数组字段。`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !descriptor.writable || !descriptor.configurable) throw new Error(`${label}包含非普通数据字段。`);
      assertPlainData(descriptor.value, `${label}[${key}]`);
    }
    for (let index = 0; index < value.length; index += 1) if (!Object.prototype.hasOwnProperty.call(value, index)) throw new Error(`${label}不得包含稀疏数组。`);
    return;
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${label}必须是普通数据对象。`);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new Error(`${label}不得包含 symbol 字段。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !descriptor.writable || !descriptor.configurable) throw new Error(`${label}包含非普通数据字段。`);
    assertPlainData(descriptor.value, `${label}.${key}`);
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  assertPlainData(value, label);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${label}必须是普通对象。`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: Set<string>, label: string): void {
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expected.size || keys.some((key) => typeof key !== 'string' || !expected.has(key))) throw new Error(`${label}含未知字段或缺少字段。`);
}

function iso(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UTC_ISO_MILLISECONDS.test(value)) throw new Error(`${label}必须是标准 UTC ISO。`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) throw new Error(`${label}必须是标准 UTC ISO。`);
  return value;
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label}必须是安全非负整数。`);
  return value as number;
}

function same(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }

function runnable(value: Record<string, unknown>, label: string): WeekFiveMonksPythonRunnable & { pythonCode: string } {
  if (typeof value.pythonCode !== 'string') throw new Error(`${label}.pythonCode必须是文本。`);
  const parsed = parseWeekFiveMonksPython(value.pythonCode);
  if ('state' in parsed) throw new Error(`${label}.pythonCode不是可运行结构。`);
  return parsed;
}

export function parseWeekFiveMonksSession(value: unknown): WeekFiveMonksMissionSession {
  const source = record(value, 'W5-M1 session');
  exactKeys(source, sessionKeys, 'W5-M1 session');
  if (source.kind !== 'python-monks-loop-v1' || typeof source.pythonCode !== 'string') throw new Error('W5-M1 session身份或 Python 代码无效。');
  const parsed = parseWeekFiveMonksPython(source.pythonCode);
  const invalidDraft = 'state' in parsed;
  const totalRuns = integer(source.totalRuns, 'W5-M1 session.totalRuns');
  const conflictFailures = integer(source.coverageFailures, 'W5-M1 session.coverageFailures');
  const missingFailures = integer(source.actionFailures, 'W5-M1 session.actionFailures');
  const validationFailures = integer(source.validationFailures, 'W5-M1 session.validationFailures');
  integer(source.runnerInfrastructureFailures, 'W5-M1 session.runnerInfrastructureFailures');
  if (conflictFailures > totalRuns || missingFailures > totalRuns) throw new Error('W5-M1 session逐人解困失败计数与总运行次数无效。');
  if (!Array.isArray(source.usedHintTiers) || source.usedHintTiers.some((tier) => tier !== 'observe' && tier !== 'think' && tier !== 'partial') || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) throw new Error('W5-M1 session提示层级无效。');
  const first = source.firstBlockingConcept;
  if (first !== null && first !== 'list-coverage' && first !== 'loop-body' && first !== 'python-structure') throw new Error('W5-M1 session首次阻塞概念无效。');
  if ((first === null) !== (conflictFailures === 0 && missingFailures === 0 && validationFailures === 0)
    || (first === 'list-coverage' && conflictFailures === 0) || (first === 'loop-body' && missingFailures === 0) || (first === 'python-structure' && validationFailures === 0)) throw new Error('W5-M1 session首次阻塞概念与累计事实不一致。');
  const savedAt = iso(source.savedAt, 'W5-M1 session.savedAt');
  let currentLastRunAt: string | null = null;
  let currentFailureSnapshot: Record<string, unknown> | null = null;
  if (!Array.isArray(source.lastCanonicalTrace) || !Array.isArray(source.lastWorkerTrace)) throw new Error('W5-M1 session trace 必须是数组。');
  if (source.lastRun === null) {
    if (source.lastCanonicalTrace.length !== 0 || source.lastWorkerTrace.length !== 0 || source.failureSnapshot !== null || source.lastRunAt !== null) throw new Error('W5-M1 session没有运行时不能保存 trace、结果、快照或时间。');
  } else {
    if (invalidDraft) throw new Error('W5-M1 无效 Python 草稿不能保存运行证据。');
    const lastRunAt = iso(source.lastRunAt, 'W5-M1 session.lastRunAt');
    currentLastRunAt = lastRunAt;
    const primary = parsed.run.failureSnapshots[0] ?? null;
    if (new Date(lastRunAt).getTime() > new Date(savedAt).getTime() || totalRuns < 1 || !same(source.lastCanonicalTrace, parsed.trace) || !same(source.lastWorkerTrace, parsed.trace) || !same(source.lastRun, parsed.run) || !same(source.failureSnapshot, primary)) throw new Error('W5-M1 session trace、运行、主快照或时间与当前 Python 不一致。');
    if (parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'coverage-conflict') && conflictFailures < 1) throw new Error('W5-M1 session逐人解困冲突运行缺少累计计数。');
    if (parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'action-conflict') && missingFailures < 1) throw new Error('W5-M1 session逐人解困缺失运行缺少累计计数。');
    currentFailureSnapshot = source.failureSnapshot === null
      ? null
      : record(source.failureSnapshot, 'W5-M1 session.failureSnapshot');
  }
  if (!Array.isArray(source.conditionObservationUses)) throw new Error('W5-M1 session观察记录无效。');
  const observationIds = new Set<string>();
  for (const [index, rawUse] of source.conditionObservationUses.entries()) {
    const use = record(rawUse, `W5-M1 session.conditionObservationUses[${index}]`);
    exactKeys(use, observationKeys, `W5-M1 session.conditionObservationUses[${index}]`);
    if (typeof use.snapshotId !== 'string' || observationIds.has(use.snapshotId)) throw new Error('W5-M1 session观察快照无效或重复。');
    observationIds.add(use.snapshotId);
    const usedAt = iso(use.usedAt, 'W5-M1 session观察时间');
    if (currentLastRunAt === null || currentFailureSnapshot === null || source.lastRun === null
      || new Date(usedAt).getTime() < new Date(currentLastRunAt).getTime()
      || new Date(usedAt).getTime() > new Date(savedAt).getTime()) {
      throw new Error('W5-M1 session观察时间必须位于当前失败运行与保存时间之间。');
    }
    const observation = runnable(use, 'W5-M1 session观察代码');
    const observationSnapshot = observation.run.failureSnapshots.find((snapshot) => snapshot.snapshotId === use.snapshotId);
    if (use.pythonCode !== source.pythonCode || use.snapshotId !== currentFailureSnapshot.snapshotId
      || !same(use.canonicalTrace, source.lastCanonicalTrace) || !same(use.workerTrace, source.lastWorkerTrace)
      || !same(use.run, source.lastRun) || !same(observationSnapshot, currentFailureSnapshot)
      || !same(use.canonicalTrace, observation.trace) || !same(use.workerTrace, observation.trace)
      || !same(use.run, observation.run)) {
      throw new Error('W5-M1 session观察必须绑定当前代码、trace、运行和失败快照。');
    }
  }
  if (invalidDraft && source.conditionObservationUses.length > 0) throw new Error('W5-M1 无效草稿不能保存观察记录。');
  return structuredClone(source) as unknown as WeekFiveMonksMissionSession;
}

export function parseWeekFiveMonksWork(value: unknown): WeekFiveMonksWorkV1 {
  const source = record(value, 'W5-M1 work');
  exactKeys(source, workKeys, 'W5-M1 work');
  if (source.kind !== 'python-monks-loop-v1' || source.workId !== 'w5-m1-monks-rescue-record' || source.missionId !== 'w5-m1' || typeof source.title !== 'string' || source.title.length === 0 || source.title.length > 100) throw new Error('W5-M1 work身份或标题无效。');
  const parsed = runnable(source, 'W5-M1 work');
  if (!parsed.run.completed || parsed.run.state !== 'rescue-proven' || !same(source.canonicalTrace, parsed.trace) || !same(source.workerTrace, parsed.trace) || !same(source.run, parsed.run)) throw new Error('W5-M1 work trace 或运行不是真实 rescue-proven 成功结果。');
  const createdAt = iso(source.createdAt, 'W5-M1 work.createdAt');
  const verifiedAt = iso(source.verifiedAt, 'W5-M1 work.verifiedAt');
  if (new Date(createdAt).getTime() > new Date(verifiedAt).getTime()) throw new Error('W5-M1 work时间顺序无效。');
  return { kind: 'python-monks-loop-v1', workId: 'w5-m1-monks-rescue-record', missionId: 'w5-m1', title: source.title, pythonCode: parsed.pythonCode, canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run), createdAt, verifiedAt } as WeekFiveMonksWorkV1;
}

export function parseWeekFiveMonksEvidence(
  value: unknown,
  input: { mission: MissionProgress | undefined; formalWeekFourBoss: boolean; session: WeekFiveMonksMissionSession | undefined; work: WeekFiveMonksWorkV1 | undefined },
): WeekFiveMonksCompletionEvidence {
  const source = record(value, 'W5-M1 completion evidence');
  if (!input.mission) throw new Error('W5-M1证明没有对应完成任务。');
  if (source.kind === 'legacy-replay-only') {
    exactKeys(source, legacyEvidenceKeys, 'W5-M1历史证明');
    const validLegacy = (source.sourceVersion === 1 && source.sourceSchemaRevision === null) || (source.sourceVersion === 2 && source.sourceSchemaRevision === 1) || (source.sourceVersion === 3 && Number.isInteger(source.sourceSchemaRevision) && (source.sourceSchemaRevision as number) >= 1 && (source.sourceSchemaRevision as number) <= 12);
    const completedAt = iso(source.completedAt, 'W5-M1历史完成时间');
    if (completedAt !== input.mission.completedAt || !validLegacy) throw new Error('W5-M1历史证明来源或完成时间无效。');
    if (input.work) throw new Error('W5-M1历史证明不能伪造作品。');
    if (input.session && !input.formalWeekFourBoss) throw new Error('W5-M1历史重玩 session 需要正式 W4-M5 前置。');
    if (input.session && (new Date(input.session.savedAt).getTime() < new Date(completedAt).getTime()
      || (input.session.lastRunAt !== null && new Date(input.session.lastRunAt).getTime() < new Date(completedAt).getTime()))) {
      throw new Error('W5-M1历史重玩 session 不能早于历史完成时间。');
    }
    return structuredClone(source) as WeekFiveMonksCompletionEvidence;
  }
  if (source.kind !== 'formal-v3') throw new Error('W5-M1证明类型无效。');
  exactKeys(source, formalEvidenceKeys, 'W5-M1正式证明');
  if (!input.formalWeekFourBoss || !input.session || !input.work || source.workId !== input.work.workId) throw new Error('W5-M1正式证明缺少正式 W4-M5 前置、session 或作品。');
  const parsed = runnable(source, 'W5-M1正式证明');
  const completedAt = iso(source.completedAt, 'W5-M1正式完成时间');
  const verifiedAt = iso(source.verifiedAt, 'W5-M1正式验证时间');
  const workCreatedAt = iso(input.work.createdAt, 'W5-M1作品创建时间');
  const workVerifiedAt = iso(input.work.verifiedAt, 'W5-M1作品验证时间');
  if (completedAt !== input.mission.completedAt
    || new Date(completedAt).getTime() > new Date(workCreatedAt).getTime()
    || new Date(workCreatedAt).getTime() > new Date(verifiedAt).getTime()
    || input.session.lastRunAt === null
    || new Date(input.session.lastRunAt).getTime() > new Date(input.session.savedAt).getTime()
    || new Date(input.session.savedAt).getTime() > new Date(workCreatedAt).getTime()
    || !parsed.run.completed || parsed.run.state !== 'rescue-proven'
    || !same(source.canonicalTrace, parsed.trace) || !same(source.workerTrace, parsed.trace)
    || !same(source.run, parsed.run) || input.session.pythonCode !== parsed.pythonCode
    || !same(input.session.lastCanonicalTrace, parsed.trace) || !same(input.session.lastWorkerTrace, parsed.trace)
    || !same(input.session.lastRun, parsed.run) || input.work.pythonCode !== parsed.pythonCode
    || !same(input.work.canonicalTrace, parsed.trace) || !same(input.work.workerTrace, parsed.trace)
    || !same(input.work.run, parsed.run) || workVerifiedAt !== verifiedAt) {
    throw new Error('W5-M1正式证明必须精确绑定当前 session、作品、时间与真实运行。');
  }
  return { kind: 'formal-v3', completedAt, verifiedAt, pythonCode: parsed.pythonCode, canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run), workId: 'w5-m1-monks-rescue-record' };
}
