import { parseWeekFiveFunctionPython, type WeekFiveFunctionPythonRunnable } from '../engine/weekFiveFunctionPythonGrammar';
import type { MissionProgress, WeekFiveFunctionCompletionEvidence, WeekFiveFunctionWorkV1 } from './types';
import type { WeekFiveFunctionMissionSession } from './weekFiveFunctionSession';

const sessionKeys = new Set(['kind', 'pythonCode', 'lastCanonicalTrace', 'lastWorkerTrace', 'lastRun', 'failureSnapshot', 'totalRuns', 'callFailures', 'bodyFailures', 'validationFailures', 'runnerInfrastructureFailures', 'conditionObservationUses', 'usedHintTiers', 'firstBlockingConcept', 'lastRunAt', 'savedAt']);
const observationKeys = new Set(['snapshotId', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'usedAt']);
const workKeys = new Set(['kind', 'workId', 'missionId', 'title', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'createdAt', 'verifiedAt']);
const formalKeys = new Set(['kind', 'completedAt', 'verifiedAt', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'workId']);
const legacyKeys = new Set(['kind', 'completedAt', 'sourceVersion', 'sourceSchemaRevision']);
const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function plain(value: unknown, label: string): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return;
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) throw new Error(`${label}必须是普通数组。`);
    const length = Object.getOwnPropertyDescriptor(value, 'length');
    if (!length || !('value' in length) || length.value !== value.length || length.enumerable || length.configurable || !length.writable || Reflect.ownKeys(value).length !== value.length + 1) throw new Error(`${label}必须是稠密普通数组。`);
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !descriptor.writable || !descriptor.configurable) throw new Error(`${label}不得包含稀疏或非普通项。`);
      plain(descriptor.value, `${label}[${index}]`);
    }
    return;
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${label}必须是普通数据对象。`);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new Error(`${label}不得包含 symbol 字段。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) throw new Error(`${label}包含非普通字段。`);
    plain(descriptor.value, `${label}.${key}`);
  }
}
function record(value: unknown, label: string): Record<string, unknown> {
  plain(value, label);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${label}必须是普通对象。`);
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: Set<string>, label: string): void {
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.size || actual.some((key) => typeof key !== 'string' || !keys.has(key))) throw new Error(`${label}含未知字段或缺少字段。`);
}
function iso(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UTC_ISO.test(value)) throw new Error(`${label}必须是标准 UTC ISO。`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) throw new Error(`${label}必须是标准 UTC ISO。`);
  return value;
}
function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label}必须是安全非负整数。`);
  return value as number;
}
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function runnable(value: Record<string, unknown>, label: string): WeekFiveFunctionPythonRunnable & { pythonCode: string } {
  if (typeof value.pythonCode !== 'string') throw new Error(`${label}.pythonCode必须是文本。`);
  const parsed = parseWeekFiveFunctionPython(value.pythonCode);
  if ('state' in parsed) throw new Error(`${label}.pythonCode不是可运行结构。`);
  return parsed;
}

export function parseWeekFiveFunctionSession(value: unknown): WeekFiveFunctionMissionSession {
  const source = record(value, 'W5-M2 session'); exact(source, sessionKeys, 'W5-M2 session');
  if (source.kind !== 'python-function-call-v1' || typeof source.pythonCode !== 'string') throw new Error('W5-M2 session身份或源码无效。');
  const parsed = parseWeekFiveFunctionPython(source.pythonCode); const invalid = 'state' in parsed;
  const totalRuns = integer(source.totalRuns, 'W5-M2 totalRuns');
  const callFailures = integer(source.callFailures, 'W5-M2 callFailures');
  const bodyFailures = integer(source.bodyFailures, 'W5-M2 bodyFailures');
  const validationFailures = integer(source.validationFailures, 'W5-M2 validationFailures');
  integer(source.runnerInfrastructureFailures, 'W5-M2 runnerInfrastructureFailures');
  if (callFailures > totalRuns || bodyFailures > totalRuns) throw new Error('W5-M2 失败计数不能超过运行次数。');
  if (!Array.isArray(source.usedHintTiers) || source.usedHintTiers.some((tier) => tier !== 'observe' && tier !== 'think' && tier !== 'partial') || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) throw new Error('W5-M2 提示层级无效。');
  const first = source.firstBlockingConcept;
  if (first !== null && first !== 'function-call' && first !== 'function-body' && first !== 'python-structure') throw new Error('W5-M2 首次阻塞概念无效。');
  if ((first === null) !== (callFailures === 0 && bodyFailures === 0 && validationFailures === 0)
    || (first === 'function-call' && callFailures === 0) || (first === 'function-body' && bodyFailures === 0) || (first === 'python-structure' && validationFailures === 0)) throw new Error('W5-M2 首次阻塞概念与事实不一致。');
  const savedAt = iso(source.savedAt, 'W5-M2 savedAt');
  if (!Array.isArray(source.lastCanonicalTrace) || !Array.isArray(source.lastWorkerTrace)) throw new Error('W5-M2 trace 必须是数组。');
  let lastRunAt: string | null = null;
  let currentSnapshot: Record<string, unknown> | null = null;
  if (source.lastRun === null) {
    if (source.lastCanonicalTrace.length || source.lastWorkerTrace.length || source.failureSnapshot !== null || source.lastRunAt !== null) throw new Error('W5-M2 无运行时不能保存轨迹。');
  } else {
    if (invalid) throw new Error('W5-M2 无效草稿不能保存运行。');
    lastRunAt = iso(source.lastRunAt, 'W5-M2 lastRunAt');
    const primary = parsed.run.failureSnapshots[0] ?? null;
    if (lastRunAt > savedAt || totalRuns < 1 || !same(source.lastCanonicalTrace, parsed.trace) || !same(source.lastWorkerTrace, parsed.trace) || !same(source.lastRun, parsed.run) || !same(source.failureSnapshot, primary)) throw new Error('W5-M2 运行证据与当前源码不一致。');
    if (parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'call-missing' || snapshot.result === 'call-conflict') && callFailures < 1) throw new Error('W5-M2 缺少调用失败累计。');
    if (parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'body-conflict') && bodyFailures < 1) throw new Error('W5-M2 缺少函数体失败累计。');
    currentSnapshot = source.failureSnapshot === null ? null : record(source.failureSnapshot, 'W5-M2 failureSnapshot');
  }
  if (!Array.isArray(source.conditionObservationUses)) throw new Error('W5-M2 观察记录无效。');
  const ids = new Set<string>();
  for (const [index, raw] of source.conditionObservationUses.entries()) {
    const use = record(raw, `W5-M2 observation ${index}`); exact(use, observationKeys, `W5-M2 observation ${index}`);
    if (typeof use.snapshotId !== 'string' || ids.has(use.snapshotId)) throw new Error('W5-M2 观察快照重复或无效。'); ids.add(use.snapshotId);
    const usedAt = iso(use.usedAt, 'W5-M2 observation usedAt'); const observation = runnable(use, 'W5-M2 observation');
    if (!lastRunAt || !currentSnapshot || !source.lastRun || usedAt < lastRunAt || usedAt > savedAt || use.pythonCode !== source.pythonCode || use.snapshotId !== currentSnapshot.snapshotId
      || !same(use.canonicalTrace, source.lastCanonicalTrace) || !same(use.workerTrace, source.lastWorkerTrace) || !same(use.run, source.lastRun)
      || !same(observation.trace, use.canonicalTrace) || !same(observation.run, use.run)) throw new Error('W5-M2 观察必须绑定当前失败运行。');
  }
  return structuredClone(source) as unknown as WeekFiveFunctionMissionSession;
}

export function parseWeekFiveFunctionWork(value: unknown): WeekFiveFunctionWorkV1 {
  const source = record(value, 'W5-M2 work'); exact(source, workKeys, 'W5-M2 work');
  if (source.kind !== 'python-function-call-v1' || source.workId !== 'w5-m2-sanqing-function-record' || source.missionId !== 'w5-m2' || typeof source.title !== 'string' || source.title.length < 1 || source.title.length > 100) throw new Error('W5-M2 work身份无效。');
  const parsed = runnable(source, 'W5-M2 work');
  if (!parsed.run.completed || parsed.run.state !== 'record-proven' || !same(source.canonicalTrace, parsed.trace) || !same(source.workerTrace, parsed.trace) || !same(source.run, parsed.run)) throw new Error('W5-M2 work不是函数成功记录。');
  const createdAt = iso(source.createdAt, 'W5-M2 work.createdAt'); const verifiedAt = iso(source.verifiedAt, 'W5-M2 work.verifiedAt');
  if (createdAt > verifiedAt) throw new Error('W5-M2 work时间顺序无效。');
  return { kind: 'python-function-call-v1', workId: 'w5-m2-sanqing-function-record', missionId: 'w5-m2', title: source.title, pythonCode: parsed.pythonCode, canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run), createdAt, verifiedAt };
}

export function parseWeekFiveFunctionEvidence(value: unknown, input: { mission: MissionProgress | undefined; formalWeekFiveMonks: boolean; session: WeekFiveFunctionMissionSession | undefined; work: WeekFiveFunctionWorkV1 | undefined }): WeekFiveFunctionCompletionEvidence {
  const source = record(value, 'W5-M2 evidence');
  if (!input.mission) throw new Error('W5-M2 证明没有对应任务。');
  if (source.kind === 'legacy-replay-only') {
    exact(source, legacyKeys, 'W5-M2 legacy evidence'); const completedAt = iso(source.completedAt, 'W5-M2 legacy completedAt');
    const valid = (source.sourceVersion === 1 && source.sourceSchemaRevision === null) || (source.sourceVersion === 2 && source.sourceSchemaRevision === 1) || (source.sourceVersion === 3 && Number.isInteger(source.sourceSchemaRevision) && (source.sourceSchemaRevision as number) >= 1 && (source.sourceSchemaRevision as number) <= 13);
    if (!valid || completedAt !== input.mission.completedAt || input.work) throw new Error('W5-M2 历史证明无效。');
    if (input.session && (!input.formalWeekFiveMonks || input.session.savedAt < completedAt || (input.session.lastRunAt !== null && input.session.lastRunAt < completedAt))) throw new Error('W5-M2 历史重玩 session 无效。');
    return structuredClone(source) as WeekFiveFunctionCompletionEvidence;
  }
  exact(source, formalKeys, 'W5-M2 formal evidence');
  if (source.kind !== 'formal-v3' || !input.formalWeekFiveMonks || !input.session || !input.work || source.workId !== input.work.workId) throw new Error('W5-M2 正式证明缺少前置、session 或作品。');
  const parsed = runnable(source, 'W5-M2 formal evidence'); const completedAt = iso(source.completedAt, 'W5-M2 completedAt'); const verifiedAt = iso(source.verifiedAt, 'W5-M2 verifiedAt');
  if (completedAt !== input.mission.completedAt || completedAt > input.work.createdAt || input.work.createdAt > verifiedAt || input.work.verifiedAt !== verifiedAt
    || input.session.lastRunAt === null || input.session.lastRunAt > input.session.savedAt || input.session.savedAt > input.work.createdAt
    || !parsed.run.completed || parsed.run.state !== 'record-proven' || input.session.failureSnapshot !== null || input.session.pythonCode !== parsed.pythonCode || input.work.pythonCode !== parsed.pythonCode
    || !same(source.canonicalTrace, parsed.trace) || !same(source.workerTrace, parsed.trace) || !same(source.run, parsed.run)
    || !same(input.session.lastCanonicalTrace, parsed.trace) || !same(input.session.lastWorkerTrace, parsed.trace) || !same(input.session.lastRun, parsed.run)
    || !same(input.work.canonicalTrace, parsed.trace) || !same(input.work.workerTrace, parsed.trace) || !same(input.work.run, parsed.run)) throw new Error('W5-M2 正式证明必须绑定当前成功运行。');
  return { kind: 'formal-v3', completedAt, verifiedAt, pythonCode: parsed.pythonCode, canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run), workId: 'w5-m2-sanqing-function-record' };
}
