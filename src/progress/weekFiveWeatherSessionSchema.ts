import {
  parseWeekFiveWeatherPython,
  type WeekFiveWeatherPythonRunnable,
} from '../engine/weekFiveWeatherPythonGrammar';
import type {
  MissionProgress,
  WeekFiveWeatherCompletionEvidence,
  WeekFiveWeatherWorkV1,
} from './types';
import type { WeekFiveWeatherMissionSession } from './weekFiveWeatherSession';

const sessionKeys = new Set([
  'kind', 'pythonCode', 'lastCanonicalTrace', 'lastWorkerTrace', 'lastRun', 'failureSnapshot',
  'totalRuns', 'callFailures', 'parameterFailures', 'validationFailures',
  'runnerInfrastructureFailures', 'conditionObservationUses', 'usedHintTiers',
  'firstBlockingConcept', 'lastRunAt', 'savedAt',
]);
const observationKeys = new Set(['snapshotId', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'usedAt']);
const workKeys = new Set(['kind', 'workId', 'missionId', 'title', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'createdAt', 'verifiedAt']);
const formalKeys = new Set(['kind', 'completedAt', 'verifiedAt', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'workId']);
const legacyKeys = new Set(['kind', 'completedAt', 'sourceVersion', 'sourceSchemaRevision']);
const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function assertPlainData(value: unknown, label: string): void {
  if (value === null || ['string', 'boolean', 'number'].includes(typeof value)) return;
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) {
      throw Error(`${label}必须是稠密普通数组。`);
    }
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !descriptor.writable || !descriptor.configurable) {
        throw Error(`${label}不得包含非普通项。`);
      }
      assertPlainData(descriptor.value, `${label}[${index}]`);
    }
    return;
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw Error(`${label}必须是普通数据对象。`);
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw Error(`${label}不得包含 symbol 字段。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw Error(`${label}包含非普通字段。`);
    }
    assertPlainData(descriptor.value, `${label}.${key}`);
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  assertPlainData(value, label);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw Error(`${label}必须是普通对象。`);
  }
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, keys: Set<string>, label: string) {
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.size || actual.some((key) => typeof key !== 'string' || !keys.has(key))) {
    throw Error(`${label}含未知字段或缺少字段。`);
  }
}

function iso(value: unknown, label: string) {
  if (typeof value !== 'string' || !UTC_ISO.test(value)) throw Error(`${label}必须是标准 UTC ISO。`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) throw Error(`${label}必须是标准 UTC ISO。`);
  return value;
}

function integer(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw Error(`${label}必须是安全非负整数。`);
  return value as number;
}

function runnable(
  value: Record<string, unknown>,
  label: string,
): WeekFiveWeatherPythonRunnable & { pythonCode: string } {
  if (typeof value.pythonCode !== 'string') throw Error(`${label}.pythonCode必须是文本。`);
  const parsed = parseWeekFiveWeatherPython(value.pythonCode);
  if ('state' in parsed) throw Error(`${label}.pythonCode不是可运行结构。`);
  return parsed;
}

export function parseWeekFiveWeatherSession(value: unknown): WeekFiveWeatherMissionSession {
  const source = record(value, 'W5-M3 session');
  exact(source, sessionKeys, 'W5-M3 session');
  if (source.kind !== 'python-function-parameter-v1' || typeof source.pythonCode !== 'string') {
    throw Error('W5-M3 session身份或源码无效。');
  }
  const parsed = parseWeekFiveWeatherPython(source.pythonCode);
  const invalid = 'state' in parsed;
  const totalRuns = integer(source.totalRuns, 'W5-M3 totalRuns');
  const callFailures = integer(source.callFailures, 'W5-M3 callFailures');
  const parameterFailures = integer(source.parameterFailures, 'W5-M3 parameterFailures');
  const validationFailures = integer(source.validationFailures, 'W5-M3 validationFailures');
  integer(source.runnerInfrastructureFailures, 'W5-M3 infrastructure');
  if (callFailures > totalRuns || parameterFailures > totalRuns) {
    throw Error('W5-M3 失败计数不能超过运行次数。');
  }
  if (!Array.isArray(source.usedHintTiers)
    || source.usedHintTiers.some((tier) => typeof tier !== 'string' || !['observe', 'think', 'partial'].includes(tier))
    || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) {
    throw Error('W5-M3 提示层级无效。');
  }
  const firstBlocker = source.firstBlockingConcept;
  if (firstBlocker !== null
    && (typeof firstBlocker !== 'string'
      || !['function-call', 'function-parameter', 'python-structure'].includes(firstBlocker))) {
    throw Error('W5-M3 首次阻塞概念无效。');
  }
  const hasNoFailure = callFailures === 0 && parameterFailures === 0 && validationFailures === 0;
  if ((firstBlocker === null) !== hasNoFailure
    || (firstBlocker === 'function-call' && callFailures === 0)
    || (firstBlocker === 'function-parameter' && parameterFailures === 0)
    || (firstBlocker === 'python-structure' && validationFailures === 0)) {
    throw Error('W5-M3 首次阻塞概念与事实不一致。');
  }

  const savedAt = iso(source.savedAt, 'W5-M3 savedAt');
  if (!Array.isArray(source.lastCanonicalTrace) || !Array.isArray(source.lastWorkerTrace)) {
    throw Error('W5-M3 trace 必须是数组。');
  }
  let lastRunAt: string | null = null;
  let snapshot: Record<string, unknown> | null = null;
  if (source.lastRun === null) {
    if (source.lastCanonicalTrace.length
      || source.lastWorkerTrace.length
      || source.failureSnapshot !== null
      || source.lastRunAt !== null) {
      throw Error('W5-M3 无运行时不能保存轨迹。');
    }
  } else {
    if (invalid) throw Error('W5-M3 无效草稿不能保存运行。');
    lastRunAt = iso(source.lastRunAt, 'W5-M3 lastRunAt');
    const primary = parsed.run.failureSnapshots[0] ?? null;
    if (lastRunAt > savedAt
      || totalRuns < 1
      || !same(source.lastCanonicalTrace, parsed.trace)
      || !same(source.lastWorkerTrace, parsed.trace)
      || !same(source.lastRun, parsed.run)
      || !same(source.failureSnapshot, primary)) {
      throw Error('W5-M3 运行证据与当前源码不一致。');
    }
    if (parsed.run.failureSnapshots.some((item) => item.result === 'call-conflict') && callFailures < 1) {
      throw Error('W5-M3 缺少调用失败累计。');
    }
    if (parsed.run.failureSnapshots.some((item) => item.result === 'parameter-unused') && parameterFailures < 1) {
      throw Error('W5-M3 缺少参数失败累计。');
    }
    snapshot = source.failureSnapshot === null ? null : record(source.failureSnapshot, 'W5-M3 snapshot');
  }

  if (!Array.isArray(source.conditionObservationUses)) throw Error('W5-M3 观察记录无效。');
  const snapshotIds = new Set<string>();
  for (const [index, rawObservation] of source.conditionObservationUses.entries()) {
    const observation = record(rawObservation, `W5-M3 observation ${index}`);
    exact(observation, observationKeys, `W5-M3 observation ${index}`);
    if (typeof observation.snapshotId !== 'string' || snapshotIds.has(observation.snapshotId)) {
      throw Error('W5-M3 观察快照重复或无效。');
    }
    snapshotIds.add(observation.snapshotId);
    const usedAt = iso(observation.usedAt, 'W5-M3 observation usedAt');
    const observed = runnable(observation, 'W5-M3 observation');
    if (!lastRunAt
      || !snapshot
      || !source.lastRun
      || usedAt < lastRunAt
      || usedAt > savedAt
      || observation.pythonCode !== source.pythonCode
      || observation.snapshotId !== snapshot.snapshotId
      || !same(observation.canonicalTrace, source.lastCanonicalTrace)
      || !same(observation.workerTrace, source.lastWorkerTrace)
      || !same(observation.run, source.lastRun)
      || !same(observed.trace, observation.canonicalTrace)
      || !same(observed.run, observation.run)) {
      throw Error('W5-M3 观察必须绑定当前失败运行。');
    }
  }
  return structuredClone(source) as unknown as WeekFiveWeatherMissionSession;
}

export function parseWeekFiveWeatherWork(value: unknown): WeekFiveWeatherWorkV1 {
  const source = record(value, 'W5-M3 work');
  exact(source, workKeys, 'W5-M3 work');
  if (source.kind !== 'python-function-parameter-v1'
    || source.workId !== 'w5-m3-weather-parameter-record'
    || source.missionId !== 'w5-m3'
    || typeof source.title !== 'string'
    || source.title.length < 1
    || source.title.length > 100) {
    throw Error('W5-M3 work身份无效。');
  }
  const parsed = runnable(source, 'W5-M3 work');
  if (!parsed.run.completed
    || parsed.run.state !== 'weather-proven'
    || !same(source.canonicalTrace, parsed.trace)
    || !same(source.workerTrace, parsed.trace)
    || !same(source.run, parsed.run)) {
    throw Error('W5-M3 work不是参数成功记录。');
  }
  const createdAt = iso(source.createdAt, 'W5-M3 work.createdAt');
  const verifiedAt = iso(source.verifiedAt, 'W5-M3 work.verifiedAt');
  if (createdAt > verifiedAt) throw Error('W5-M3 work时间顺序无效。');
  return {
    kind: 'python-function-parameter-v1',
    workId: 'w5-m3-weather-parameter-record',
    missionId: 'w5-m3',
    title: source.title,
    pythonCode: parsed.pythonCode,
    canonicalTrace: structuredClone(parsed.trace),
    workerTrace: structuredClone(parsed.trace),
    run: structuredClone(parsed.run),
    createdAt,
    verifiedAt,
  };
}

interface EvidenceContext {
  mission: MissionProgress | undefined;
  formalWeekFiveFunction: boolean;
  session: WeekFiveWeatherMissionSession | undefined;
  work: WeekFiveWeatherWorkV1 | undefined;
}

export function parseWeekFiveWeatherEvidence(
  value: unknown,
  input: EvidenceContext,
): WeekFiveWeatherCompletionEvidence {
  const source = record(value, 'W5-M3 evidence');
  if (!input.mission) throw Error('W5-M3 证明没有对应任务。');
  if (source.kind === 'legacy-replay-only') {
    exact(source, legacyKeys, 'W5-M3 legacy');
    const completedAt = iso(source.completedAt, 'W5-M3 completedAt');
    const validLegacySource = (source.sourceVersion === 1 && source.sourceSchemaRevision === null)
      || (source.sourceVersion === 2 && source.sourceSchemaRevision === 1)
      || (source.sourceVersion === 3
        && Number.isInteger(source.sourceSchemaRevision)
        && (source.sourceSchemaRevision as number) >= 1
        && (source.sourceSchemaRevision as number) <= 14);
    if (!validLegacySource || completedAt !== input.mission.completedAt || input.work) {
      throw Error('W5-M3 历史证明无效。');
    }
    if (input.session
      && (!input.formalWeekFiveFunction
        || input.session.savedAt < completedAt
        || (input.session.lastRunAt !== null && input.session.lastRunAt < completedAt))) {
      throw Error('W5-M3 历史重玩 session 无效。');
    }
    return structuredClone(source) as WeekFiveWeatherCompletionEvidence;
  }

  exact(source, formalKeys, 'W5-M3 formal');
  if (source.kind !== 'formal-v3'
    || !input.formalWeekFiveFunction
    || !input.session
    || !input.work
    || source.workId !== input.work.workId) {
    throw Error('W5-M3 正式证明缺少前置、session 或作品。');
  }
  const parsed = runnable(source, 'W5-M3 evidence');
  const completedAt = iso(source.completedAt, 'W5-M3 completedAt');
  const verifiedAt = iso(source.verifiedAt, 'W5-M3 verifiedAt');
  if (completedAt !== input.mission.completedAt
    || completedAt > input.work.createdAt
    || input.work.createdAt > verifiedAt
    || input.work.verifiedAt !== verifiedAt
    || input.session.lastRunAt === null
    || input.session.lastRunAt > input.session.savedAt
    || input.session.savedAt > input.work.createdAt
    || !parsed.run.completed
    || parsed.run.state !== 'weather-proven'
    || input.session.failureSnapshot !== null
    || input.session.pythonCode !== parsed.pythonCode
    || input.work.pythonCode !== parsed.pythonCode
    || !same(source.canonicalTrace, parsed.trace)
    || !same(source.workerTrace, parsed.trace)
    || !same(source.run, parsed.run)
    || !same(input.session.lastCanonicalTrace, parsed.trace)
    || !same(input.session.lastWorkerTrace, parsed.trace)
    || !same(input.session.lastRun, parsed.run)
    || !same(input.work.canonicalTrace, parsed.trace)
    || !same(input.work.workerTrace, parsed.trace)
    || !same(input.work.run, parsed.run)) {
    throw Error('W5-M3 正式证明必须绑定当前成功运行。');
  }
  return {
    kind: 'formal-v3',
    completedAt,
    verifiedAt,
    pythonCode: parsed.pythonCode,
    canonicalTrace: structuredClone(parsed.trace),
    workerTrace: structuredClone(parsed.trace),
    run: structuredClone(parsed.run),
    workId: 'w5-m3-weather-parameter-record',
  };
}
