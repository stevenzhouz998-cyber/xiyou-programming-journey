import { parseWeekFourVariablePython } from '../engine/weekFourVariablePythonGrammar';
import type {
  MissionProgress,
  WeekFourVariableCompletionEvidence,
  WeekFourVariableWorkV1,
} from './types';
import type { WeekFourVariableMissionSession } from './weekFourVariableSession';

const sessionKeys = new Set([
  'lastTrace', 'runtimeFailures', 'compileFailures', 'pythonCode', 'pythonSourceSpan',
  'lastCanonicalTrace', 'lastWorkerTrace', 'lastRun', 'failureSnapshot',
  'conditionObservationUses', 'totalRuns', 'overwriteFailures', 'validationFailures',
  'runnerInfrastructureFailures', 'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt',
]);
const workKeys = new Set(['kind', 'workId', 'missionId', 'title', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'createdAt', 'verifiedAt']);
const formalEvidenceKeys = new Set(['kind', 'completedAt', 'verifiedAt', 'pythonCode', 'canonicalTrace', 'workerTrace', 'run', 'workId']);
const legacyEvidenceKeys = new Set(['kind', 'completedAt', 'sourceVersion', 'sourceSchemaRevision']);
const UTC_ISO_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function assertPlainData(value: unknown, label: string): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return;
  if (Array.isArray(value)) {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
    if (!lengthDescriptor || !('value' in lengthDescriptor) || lengthDescriptor.value !== value.length
      || lengthDescriptor.enumerable || lengthDescriptor.configurable || !lengthDescriptor.writable) {
      throw new Error(`${label}必须是普通数据数组。`);
    }
    for (const key of Reflect.ownKeys(value)) {
      if (key === 'length') continue;
      if (typeof key !== 'string' || !/^(?:0|[1-9]\d*)$/.test(key)) throw new Error(`${label}包含非数据数组字段。`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !descriptor.writable || !descriptor.configurable) {
        throw new Error(`${label}包含非普通数据字段。`);
      }
      assertPlainData(descriptor.value, `${label}[${key}]`);
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) throw new Error(`${label}不得包含稀疏数组。`);
    }
    return;
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${label}必须是普通数据对象。`);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new Error(`${label}不得包含 symbol 字段。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !descriptor.writable || !descriptor.configurable) {
      throw new Error(`${label}包含非普通数据字段。`);
    }
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
  if (keys.length !== expected.size || keys.some((key) => typeof key !== 'string' || !expected.has(key))) {
    throw new Error(`${label}含未知字段或缺少字段。`);
  }
}

function iso(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label}必须是标准 UTC ISO。`);
  const parsed = new Date(value);
  if (!UTC_ISO_MILLISECONDS.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) throw new Error(`${label}必须是标准 UTC ISO。`);
  return value;
}

function timestamp(value: string): number {
  return new Date(value).getTime();
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label}必须是安全非负整数。`);
  return value as number;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonical(value: Record<string, unknown>, label: string) {
  if (typeof value.pythonCode !== 'string') throw new Error(`${label}.pythonCode必须是文本。`);
  const parsed = parseWeekFourVariablePython(value.pythonCode);
  return { pythonCode: value.pythonCode, ...parsed };
}

export function parseWeekFourVariableSession(value: unknown): WeekFourVariableMissionSession {
  const source = record(value, 'W4-M2 session');
  exactKeys(source, sessionKeys, 'W4-M2 session');
  const parsed = canonical(source, 'W4-M2 session');
  if (!Array.isArray(source.lastTrace) || source.lastTrace.length !== 0 || source.runtimeFailures !== 0 || source.compileFailures !== 0) {
    throw new Error('W4-M2 session兼容字段必须保持中性。');
  }
  if (!same(source.pythonSourceSpan, parsed.sourceSpan)) throw new Error('W4-M2 session Python 来源位置与代码不一致。');
  const totalRuns = integer(source.totalRuns, 'W4-M2 session.totalRuns');
  const overwriteFailures = integer(source.overwriteFailures, 'W4-M2 session.overwriteFailures');
  const validationFailures = integer(source.validationFailures, 'W4-M2 session.validationFailures');
  integer(source.runnerInfrastructureFailures, 'W4-M2 session.runnerInfrastructureFailures');
  if (!Array.isArray(source.usedHintTiers)
    || source.usedHintTiers.some((tier) => tier !== 'observe' && tier !== 'think' && tier !== 'partial')
    || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) throw new Error('W4-M2 session提示层级无效。');
  const concepts = record(source.conceptFailures, 'W4-M2 session.conceptFailures');
  exactKeys(concepts, new Set(['variableOverwrite', 'programStructure', 'safeExecution', 'completeness']), 'W4-M2 session.conceptFailures');
  const variableOverwrite = integer(concepts.variableOverwrite, 'W4-M2 session.conceptFailures.variableOverwrite');
  const programStructure = integer(concepts.programStructure, 'W4-M2 session.conceptFailures.programStructure');
  const safeExecution = integer(concepts.safeExecution, 'W4-M2 session.conceptFailures.safeExecution');
  const completeness = integer(concepts.completeness, 'W4-M2 session.conceptFailures.completeness');
  if (overwriteFailures > totalRuns || variableOverwrite !== overwriteFailures) {
    throw new Error('W4-M2 session变量覆盖失败计数必须与运行和概念计数精确对应。');
  }
  if (programStructure !== 0 || completeness !== 0) {
    throw new Error('W4-M2 session结构与完整性计数必须保持零。');
  }
  if (safeExecution !== validationFailures) throw new Error('W4-M2 session验证失败计数必须对应安全执行计数。');
  const savedAt = iso(source.savedAt, 'W4-M2 session.savedAt');
  if (source.lastRun === null) {
    if (!Array.isArray(source.lastCanonicalTrace) || source.lastCanonicalTrace.length !== 0
      || !Array.isArray(source.lastWorkerTrace) || source.lastWorkerTrace.length !== 0
      || source.failureSnapshot !== null || source.lastRunAt !== null) {
      throw new Error('W4-M2 session未运行时不能保存 trace 或结果。');
    }
  } else {
    const lastRunAt = iso(source.lastRunAt, 'W4-M2 session.lastRunAt');
    if (timestamp(lastRunAt) > timestamp(savedAt) || totalRuns < 1 || !same(source.lastCanonicalTrace, parsed.trace)
      || !same(source.lastWorkerTrace, parsed.trace) || !same(source.lastRun, parsed.run)
      || !same(source.failureSnapshot, parsed.run.failureSnapshot)) {
      throw new Error('W4-M2 session trace、运行或时间与保存输入不一致。');
    }
    if (!parsed.run.completed && (overwriteFailures < 1 || variableOverwrite < 1)) {
      throw new Error('W4-M2 session变量覆盖失败必须保留累计计数。');
    }
  }
  if (!Array.isArray(source.conditionObservationUses)) throw new Error('W4-M2 session观察记录无效。');
  const observationIds = new Set<string>();
  for (const [index, rawUse] of source.conditionObservationUses.entries()) {
    const use = record(rawUse, `W4-M2 session.conditionObservationUses[${index}]`);
    exactKeys(use, new Set(['snapshotId', 'usedAt', 'pythonCode']), `W4-M2 session.conditionObservationUses[${index}]`);
    if (typeof use.snapshotId !== 'string' || !use.snapshotId || observationIds.has(use.snapshotId)) throw new Error('W4-M2 session观察快照无效。');
    observationIds.add(use.snapshotId);
    if (timestamp(iso(use.usedAt, 'W4-M2 session观察时间')) > timestamp(savedAt)) throw new Error('W4-M2 session观察时间不能晚于保存时间。');
    const observation = canonical(use, 'W4-M2 session观察输入');
    if (observation.run.failureSnapshot?.snapshotId !== use.snapshotId) throw new Error('W4-M2 session观察必须绑定真实覆盖快照。');
  }
  return structuredClone({ ...source, pythonCode: parsed.pythonCode }) as WeekFourVariableMissionSession;
}

export function parseWeekFourVariableWork(value: unknown): WeekFourVariableWorkV1 {
  const source = record(value, 'W4-M2 work');
  exactKeys(source, workKeys, 'W4-M2 work');
  if (source.kind !== 'python-variable-evidence-v1' || source.workId !== 'w4-m2-variable-evidence-record'
    || source.missionId !== 'w4-m2' || source.title !== '第一次变化变量取证记录') throw new Error('W4-M2 work身份无效。');
  const parsed = canonical(source, 'W4-M2 work');
  if (!parsed.run.completed || parsed.run.finalState !== 'evidence-sealed'
    || !same(source.canonicalTrace, parsed.trace) || !same(source.workerTrace, parsed.trace) || !same(source.run, parsed.run)) {
    throw new Error('W4-M2 work trace 或运行不是真实变量封存成功结果。');
  }
  const createdAt = iso(source.createdAt, 'W4-M2 work.createdAt');
  const verifiedAt = iso(source.verifiedAt, 'W4-M2 work.verifiedAt');
  if (timestamp(createdAt) > timestamp(verifiedAt)) throw new Error('W4-M2 work时间顺序无效。');
  return structuredClone({ ...source, pythonCode: parsed.pythonCode, canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run, createdAt, verifiedAt }) as WeekFourVariableWorkV1;
}

export function parseWeekFourVariableEvidence(
  value: unknown,
  input: {
    mission: MissionProgress | undefined;
    formalWeekFourMapping: boolean;
    session: WeekFourVariableMissionSession | undefined;
    work: WeekFourVariableWorkV1 | undefined;
  },
): WeekFourVariableCompletionEvidence {
  const source = record(value, 'W4-M2 completion evidence');
  if (!input.mission) throw new Error('W4-M2证明没有对应完成任务。');
  if (source.kind === 'legacy-replay-only') {
    exactKeys(source, legacyEvidenceKeys, 'W4-M2历史证明');
    const version = source.sourceVersion;
    const revision = source.sourceSchemaRevision;
    const validLegacy = (version === 1 && revision === null)
      || (version === 2 && revision === 1)
      || (version === 3 && typeof revision === 'number' && Number.isInteger(revision) && revision >= 1 && revision <= 8);
    if (iso(source.completedAt, 'W4-M2历史完成时间') !== input.mission.completedAt || !validLegacy) throw new Error('W4-M2历史证明无效。');
    if (input.session || input.work) throw new Error('W4-M2历史证明不能伪造 session 或作品。');
    return structuredClone(source) as WeekFourVariableCompletionEvidence;
  }
  if (source.kind !== 'formal-v3') throw new Error('W4-M2证明类型无效。');
  exactKeys(source, formalEvidenceKeys, 'W4-M2正式证明');
  if (!input.formalWeekFourMapping || !input.session || !input.work || source.workId !== input.work.workId) {
    throw new Error('W4-M2正式证明缺少正式 W4-M1 前置、session 或作品。');
  }
  const parsed = canonical(source, 'W4-M2正式证明');
  const completedAt = iso(source.completedAt, 'W4-M2正式完成时间');
  const verifiedAt = iso(source.verifiedAt, 'W4-M2正式验证时间');
  if (completedAt !== input.mission.completedAt || timestamp(completedAt) > timestamp(verifiedAt) || input.session.lastRunAt === null
    || timestamp(input.session.lastRunAt) > timestamp(input.session.savedAt) || timestamp(input.session.savedAt) > timestamp(verifiedAt)
    || !parsed.run.completed || !same(source.canonicalTrace, parsed.trace) || !same(source.workerTrace, parsed.trace)
    || !same(source.run, parsed.run) || input.session.pythonCode !== parsed.pythonCode
    || !same(input.session.lastCanonicalTrace, parsed.trace) || !same(input.session.lastWorkerTrace, parsed.trace)
    || !same(input.session.lastRun, parsed.run) || input.work.pythonCode !== parsed.pythonCode
    || !same(input.work.canonicalTrace, parsed.trace) || !same(input.work.workerTrace, parsed.trace)
    || !same(input.work.run, parsed.run) || input.work.createdAt !== completedAt || input.work.verifiedAt !== verifiedAt) {
    throw new Error('W4-M2正式证明必须精确绑定当前 session、作品与真实运行。');
  }
  return {
    kind: 'formal-v3', completedAt, verifiedAt, pythonCode: parsed.pythonCode,
    canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace),
    run: structuredClone(parsed.run), workId: input.work.workId,
  };
}
