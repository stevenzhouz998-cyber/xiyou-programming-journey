import {
  parseWeekFiveStoryOrchestrationPython,
  type WeekFiveStoryOrchestrationPythonRunnable,
} from '../engine/weekFiveStoryOrchestrationPythonGrammar';
import type {
  MissionProgress,
  WeekFiveStoryOrchestrationCompletionEvidence,
  WeekFiveStoryOrchestrationWorkV1,
} from './types';
import type { WeekFiveStoryOrchestrationMissionSession } from './weekFiveStoryOrchestrationSession';

const sessionKeys = new Set([
  'kind', 'pythonCode', 'lastCanonicalTrace', 'lastWorkerTrace', 'lastRun', 'failureSnapshot',
  'totalRuns', 'monkLoopFailures', 'templeCallFailures', 'weatherBindingFailures', 'laterCallOrderFailures', 'validationFailures',
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
      throw Error('W5-M5数据无效');
    }
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !descriptor.writable || !descriptor.configurable) {
        throw Error('W5-M5数据无效');
      }
      assertPlainData(descriptor.value, `${label}[${index}]`);
    }
    return;
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw Error('W5-M5数据无效');
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw Error('W5-M5数据无效');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw Error('W5-M5数据无效');
    }
    assertPlainData(descriptor.value, `${label}.${key}`);
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  assertPlainData(value, label);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw Error('W5-M5数据无效');
  }
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, keys: Set<string>, label: string) {
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.size || actual.some((key) => typeof key !== 'string' || !keys.has(key))) {
    throw Error('W5-M5数据无效');
  }
}

function iso(value: unknown, label: string) {
  if (typeof value !== 'string' || !UTC_ISO.test(value)) throw Error('W5-M5数据无效');
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) throw Error('W5-M5数据无效');
  return value;
}

function integer(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw Error('W5-M5数据无效');
  return value as number;
}

function runnable(
  value: Record<string, unknown>,
  label: string,
): WeekFiveStoryOrchestrationPythonRunnable & { pythonCode: string } {
  if (typeof value.pythonCode !== 'string') throw Error('W5-M5数据无效');
  const parsed = parseWeekFiveStoryOrchestrationPython(value.pythonCode);
  if ('state' in parsed) throw Error('W5-M5数据无效');
  return parsed;
}

export function parseWeekFiveStoryOrchestrationSession(value: unknown): WeekFiveStoryOrchestrationMissionSession {
  const source = record(value, 'W5-M5 session');
  exact(source, sessionKeys, 'W5-M5 session');
  if (source.kind !== 'python-story-orchestration-v1' || typeof source.pythonCode !== 'string') {
    throw Error('W5-M5数据无效');
  }
  const parsed = parseWeekFiveStoryOrchestrationPython(source.pythonCode);
  const invalid = 'state' in parsed;
  const totalRuns = integer(source.totalRuns, 'W5-M5 totalRuns');
  const monkLoopFailures = integer(source.monkLoopFailures, 'W5-M5 monkLoopFailures');
  const templeCallFailures = integer(source.templeCallFailures, 'W5-M5 templeCallFailures');
  const weatherBindingFailures = integer(source.weatherBindingFailures, 'W5-M5 weatherBindingFailures');
  const laterCallOrderFailures = integer(source.laterCallOrderFailures, 'W5-M5 laterCallOrderFailures');
  const validationFailures = integer(source.validationFailures, 'W5-M5 validationFailures');
  integer(source.runnerInfrastructureFailures, 'W5-M5 infrastructure');
  if ([monkLoopFailures, templeCallFailures, weatherBindingFailures, laterCallOrderFailures].some((count) => count > totalRuns)
    || monkLoopFailures + templeCallFailures + weatherBindingFailures + laterCallOrderFailures > totalRuns) {
    throw Error('W5-M5数据无效');
  }
  if (!Array.isArray(source.usedHintTiers)
    || source.usedHintTiers.some((tier) => typeof tier !== 'string' || !['observe', 'think', 'partial'].includes(tier))
    || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) {
    throw Error('W5-M5数据无效');
  }
  const firstBlocker = source.firstBlockingConcept;
  if (firstBlocker !== null
    && (typeof firstBlocker !== 'string'
      || !['loop-scope', 'function-call', 'parameter-binding', 'problem-decomposition', 'python-structure'].includes(firstBlocker))) {
    throw Error('W5-M5 首次阻塞概念与事实不一致。');
  }
  const hasNoFailure = monkLoopFailures === 0 && templeCallFailures === 0 && weatherBindingFailures === 0 && laterCallOrderFailures === 0 && validationFailures === 0;
  if ((firstBlocker === null) !== hasNoFailure
    || (firstBlocker === 'loop-scope' && monkLoopFailures === 0)
    || (firstBlocker === 'function-call' && templeCallFailures === 0)
    || (firstBlocker === 'parameter-binding' && weatherBindingFailures === 0)
    || (firstBlocker === 'problem-decomposition' && laterCallOrderFailures === 0)
    || (firstBlocker === 'python-structure' && validationFailures === 0)) {
    throw Error('W5-M5 首次阻塞概念与事实不一致。');
  }

  const savedAt = iso(source.savedAt, 'W5-M5 savedAt');
  if (!Array.isArray(source.lastCanonicalTrace) || !Array.isArray(source.lastWorkerTrace)) {
    throw Error('W5-M5数据无效');
  }
  let lastRunAt: string | null = null;
  let snapshot: Record<string, unknown> | null = null;
  if (source.lastRun === null) {
    if (source.lastCanonicalTrace.length
      || source.lastWorkerTrace.length
      || source.failureSnapshot !== null
      || source.lastRunAt !== null) {
      throw Error('W5-M5数据无效');
    }
  } else {
    if (invalid) throw Error('W5-M5数据无效');
    lastRunAt = iso(source.lastRunAt, 'W5-M5 lastRunAt');
    const primary = parsed.run.failureSnapshots[0] ?? null;
    if (lastRunAt > savedAt
      || totalRuns < 1
      || !same(source.lastCanonicalTrace, parsed.trace)
      || !same(source.lastWorkerTrace, parsed.trace)
      || !same(source.lastRun, parsed.run)
      || !same(source.failureSnapshot, primary)) {
      throw Error('W5-M5数据无效');
    }
    const result = parsed.run.failureSnapshots[0]?.result;
    if ((result === 'monk-loop-conflict' && monkLoopFailures < 1)
      || (result === 'temple-call-conflict' && templeCallFailures < 1)
      || (result === 'weather-binding-conflict' && weatherBindingFailures < 1)
      || (result === 'later-call-order-conflict' && laterCallOrderFailures < 1)) throw Error('W5-M5数据无效');
    snapshot = source.failureSnapshot === null ? null : record(source.failureSnapshot, 'W5-M5 snapshot');
  }

  if (!Array.isArray(source.conditionObservationUses)) throw Error('W5-M5数据无效');
  const snapshotIds = new Set<string>();
  for (const [index, rawObservation] of source.conditionObservationUses.entries()) {
    const observation = record(rawObservation, `W5-M5 observation ${index}`);
    exact(observation, observationKeys, `W5-M5 observation ${index}`);
    if (typeof observation.snapshotId !== 'string' || snapshotIds.has(observation.snapshotId)) {
      throw Error('W5-M5数据无效');
    }
    snapshotIds.add(observation.snapshotId);
    const usedAt = iso(observation.usedAt, 'W5-M5 observation usedAt');
    const observed = runnable(observation, 'W5-M5 observation');
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
      throw Error('W5-M5数据无效');
    }
  }
  return structuredClone(source) as unknown as WeekFiveStoryOrchestrationMissionSession;
}

export function parseWeekFiveStoryOrchestrationWork(value: unknown): WeekFiveStoryOrchestrationWorkV1 {
  const source = record(value, 'W5-M5 work');
  exact(source, workKeys, 'W5-M5 work');
  if (source.kind !== 'python-story-orchestration-v1'
    || source.workId !== 'w5-m5-story-orchestration-record'
    || source.missionId !== 'w5-m5'
    || typeof source.title !== 'string'
    || source.title.length < 1
    || source.title.length > 100) {
    throw Error('W5-M5数据无效');
  }
  const parsed = runnable(source, 'W5-M5 work');
  if (!parsed.run.completed
    || parsed.run.state !== 'story-orchestration-proven'
    || !same(source.canonicalTrace, parsed.trace)
    || !same(source.workerTrace, parsed.trace)
    || !same(source.run, parsed.run)) {
    throw Error('W5-M5数据无效');
  }
  const createdAt = iso(source.createdAt, 'W5-M5 work.createdAt');
  const verifiedAt = iso(source.verifiedAt, 'W5-M5 work.verifiedAt');
  if (createdAt > verifiedAt) throw Error('W5-M5数据无效');
  return {
    kind: 'python-story-orchestration-v1',
    workId: 'w5-m5-story-orchestration-record',
    missionId: 'w5-m5',
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
  formalWeekFiveDecomposition: boolean;
  session: WeekFiveStoryOrchestrationMissionSession | undefined;
  work: WeekFiveStoryOrchestrationWorkV1 | undefined;
}

export function parseWeekFiveStoryOrchestrationEvidence(
  value: unknown,
  input: EvidenceContext,
): WeekFiveStoryOrchestrationCompletionEvidence {
  const source = record(value, 'W5-M5 evidence');
  if (!input.mission) throw Error('W5-M5数据无效');
  if (source.kind === 'legacy-replay-only') {
    exact(source, legacyKeys, 'W5-M5 legacy');
    const completedAt = iso(source.completedAt, 'W5-M5 completedAt');
    const validLegacySource = (source.sourceVersion === 1 && source.sourceSchemaRevision === null)
      || (source.sourceVersion === 2 && source.sourceSchemaRevision === 1)
      || (source.sourceVersion === 3
        && Number.isInteger(source.sourceSchemaRevision)
        && (source.sourceSchemaRevision as number) >= 1
        && (source.sourceSchemaRevision as number) <= 16);
    if (!validLegacySource || completedAt !== input.mission.completedAt || input.work) {
      throw Error('W5-M5数据无效');
    }
    if (input.session
      && (!input.formalWeekFiveDecomposition
        || input.session.savedAt < completedAt
        || (input.session.lastRunAt !== null && input.session.lastRunAt < completedAt))) {
      throw Error('W5-M5数据无效');
    }
    return structuredClone(source) as WeekFiveStoryOrchestrationCompletionEvidence;
  }

  exact(source, formalKeys, 'W5-M5 formal');
  if (source.kind !== 'formal-v3'
    || !input.formalWeekFiveDecomposition
    || !input.session
    || !input.work
    || source.workId !== input.work.workId) {
    throw Error('W5-M5数据无效');
  }
  const parsed = runnable(source, 'W5-M5 evidence');
  const completedAt = iso(source.completedAt, 'W5-M5 completedAt');
  const verifiedAt = iso(source.verifiedAt, 'W5-M5 verifiedAt');
  if (completedAt !== input.mission.completedAt
    || completedAt > input.work.createdAt
    || input.work.createdAt > verifiedAt
    || input.work.verifiedAt !== verifiedAt
    || input.session.lastRunAt === null
    || input.session.lastRunAt > input.session.savedAt
    || input.session.savedAt > input.work.createdAt
    || !parsed.run.completed
    || parsed.run.state !== 'story-orchestration-proven'
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
    throw Error('W5-M5数据无效');
  }
  return {
    kind: 'formal-v3',
    completedAt,
    verifiedAt,
    pythonCode: parsed.pythonCode,
    canonicalTrace: structuredClone(parsed.trace),
    workerTrace: structuredClone(parsed.trace),
    run: structuredClone(parsed.run),
    workId: 'w5-m5-story-orchestration-record',
  };
}
