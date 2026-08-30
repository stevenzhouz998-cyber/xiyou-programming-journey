import { compileWeekFourMappingDraft } from '../blockly/weekFourMappingDraft';
import { compareWeekFourMappingTraces } from '../blockly/weekFourMappingContract';
import { parseWeekFourMappingPython } from '../engine/weekFourPythonMappingGrammar';
import type { MissionProgress, WeekFourMappingCompletionEvidence, WeekFourMappingWorkV1 } from './types';
import type { WeekFourMappingMissionSession } from './weekFourMappingSession';

const sessionKeys = new Set([
  'workspace', 'lastTrace', 'runtimeFailures', 'compileFailures', 'pythonCode', 'pythonSourceSpan',
  'lastBlocklyTrace', 'lastPythonTrace', 'lastRun', 'failureSnapshot', 'conditionObservationUses',
  'totalRuns', 'semanticMismatchFailures', 'validationFailures', 'runnerInfrastructureFailures',
  'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt',
]);
const workKeys = new Set(['kind', 'workId', 'missionId', 'title', 'workspace', 'pythonCode', 'blocklyTrace', 'pythonTrace', 'run', 'createdAt', 'verifiedAt']);
const formalEvidenceKeys = new Set(['kind', 'completedAt', 'verifiedAt', 'workspace', 'pythonCode', 'blocklyTrace', 'pythonTrace', 'run', 'workId']);
const legacyEvidenceKeys = new Set(['kind', 'completedAt', 'sourceVersion', 'sourceSchemaRevision']);

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}必须是对象。`);
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, expected: Set<string>, label: string): void {
  if (Object.keys(value).some((key) => !expected.has(key)) || Object.keys(value).length !== expected.size) throw new Error(`${label}含未知字段或缺少字段。`);
}
function iso(value: unknown, label: string): string {
  if (typeof value !== 'string' || new Date(value).toISOString() !== value) throw new Error(`${label}必须是标准 UTC ISO。`);
  return value;
}
function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label}必须是安全非负整数。`);
  return value as number;
}
function same(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }

function strictWorkspace(value: unknown, label: string): Record<string, unknown> {
  const workspace = record(value, `${label}.workspace`);
  exactKeys(workspace, new Set(['version', 'missionId', 'blocks']), `${label}.workspace`);
  if (!Array.isArray(workspace.blocks)) throw new Error(`${label}.workspace.blocks必须是数组。`);
  for (const [index, rawBlock] of workspace.blocks.entries()) {
    const block = record(rawBlock, `${label}.workspace.blocks[${index}]`);
    const common = new Set(['id', 'type', 'x', 'y', 'parentBlockId', 'previousId', 'nextId']);
    if (block.id === 'mapping-if') {
      for (const key of ['conditionId', 'thenFirstId', 'elseFirstId']) common.add(key);
    }
    exactKeys(block, common, `${label}.workspace.blocks[${index}]`);
  }
  return workspace;
}

function canonical(value: Record<string, unknown>, label: string) {
  const workspace = compileWeekFourMappingDraft(strictWorkspace(value.workspace, label)).draft;
  if (typeof value.pythonCode !== 'string') throw new Error(`${label}.pythonCode必须是文本。`);
  const python = parseWeekFourMappingPython(value.pythonCode);
  const blocklyTrace = compileWeekFourMappingDraft(workspace).trace;
  return { workspace, pythonCode: value.pythonCode, python, blocklyTrace, run: compareWeekFourMappingTraces(blocklyTrace, python.trace) };
}

export function parseWeekFourMappingSession(value: unknown): WeekFourMappingMissionSession {
  const source = record(value, 'W4-M1 session'); exactKeys(source, sessionKeys, 'W4-M1 session');
  const parsed = canonical(source, 'W4-M1 session');
  if (!Array.isArray(source.lastTrace) || source.lastTrace.length !== 0) throw new Error('W4-M1 session.lastTrace必须为空兼容字段。');
  for (const key of ['runtimeFailures', 'compileFailures', 'totalRuns', 'semanticMismatchFailures', 'validationFailures', 'runnerInfrastructureFailures'] as const) integer(source[key], `W4-M1 session.${key}`);
  const span = record(source.pythonSourceSpan, 'W4-M1 session.pythonSourceSpan');
  if (!same(span, parsed.python.sourceSpan)) throw new Error('W4-M1 session Python 来源位置与代码不一致。');
  if (!Array.isArray(source.usedHintTiers) || source.usedHintTiers.some((tier) => tier !== 'observe' && tier !== 'think' && tier !== 'partial') || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) throw new Error('W4-M1 session提示层级无效。');
  const concepts = record(source.conceptFailures, 'W4-M1 session.conceptFailures');
  if (Object.keys(concepts).length !== 4 || ['mappingField', 'programStructure', 'safeExecution', 'completeness'].some((key) => !Object.prototype.hasOwnProperty.call(concepts, key))) throw new Error('W4-M1 session概念计数无效。');
  for (const [key, count] of Object.entries(concepts)) integer(count, `W4-M1 session.conceptFailures.${key}`);
  const savedAt = iso(source.savedAt, 'W4-M1 session.savedAt');
  if (source.lastRun === null) {
    if (!Array.isArray(source.lastBlocklyTrace) || source.lastBlocklyTrace.length || !Array.isArray(source.lastPythonTrace) || source.lastPythonTrace.length || source.failureSnapshot !== null || source.lastRunAt !== null) throw new Error('W4-M1 session未运行时不能保存 trace 或结果。');
  } else {
    const lastRunAt = iso(source.lastRunAt, 'W4-M1 session.lastRunAt');
    if (lastRunAt > savedAt || !same(source.lastBlocklyTrace, parsed.blocklyTrace) || !same(source.lastPythonTrace, parsed.python.trace) || !same(source.lastRun, parsed.run) || !same(source.failureSnapshot, parsed.run.failureSnapshot)) throw new Error('W4-M1 session trace、运行或时间与保存输入不一致。');
  }
  if (!Array.isArray(source.conditionObservationUses)) throw new Error('W4-M1 session观察记录无效。');
  const observationIds = new Set<string>();
  for (const [index, rawUse] of source.conditionObservationUses.entries()) {
    const use = record(rawUse, `W4-M1 session.conditionObservationUses[${index}]`);
    exactKeys(use, new Set(['snapshotId', 'usedAt', 'workspace', 'pythonCode']), `W4-M1 session.conditionObservationUses[${index}]`);
    if (typeof use.snapshotId !== 'string' || !use.snapshotId || observationIds.has(use.snapshotId)) throw new Error('W4-M1 session观察快照无效。');
    observationIds.add(use.snapshotId); if (iso(use.usedAt, 'W4-M1 session观察时间') > savedAt) throw new Error('W4-M1 session观察时间不能晚于保存时间。');
    canonical(use, 'W4-M1 session观察输入');
  }
  return structuredClone({ ...source, workspace: parsed.workspace, pythonCode: parsed.pythonCode }) as WeekFourMappingMissionSession;
}

export function parseWeekFourMappingWork(value: unknown): WeekFourMappingWorkV1 {
  const source = record(value, 'W4-M1 work'); exactKeys(source, workKeys, 'W4-M1 work');
  if (source.kind !== 'blockly-python-mapping-v1' || source.workId !== 'w4-m1-first-python-mapping' || source.missionId !== 'w4-m1' || source.title !== '第一份积木与 Python 对照经卷') throw new Error('W4-M1 work身份无效。');
  const parsed = canonical(source, 'W4-M1 work');
  if (!parsed.run.completed || parsed.run.finalState !== 'mapping-proven' || !same(source.blocklyTrace, parsed.blocklyTrace) || !same(source.pythonTrace, parsed.python.trace) || !same(source.run, parsed.run)) throw new Error('W4-M1 work trace 或运行不是真实双轨成功结果。');
  const createdAt = iso(source.createdAt, 'W4-M1 work.createdAt'); const verifiedAt = iso(source.verifiedAt, 'W4-M1 work.verifiedAt');
  if (createdAt > verifiedAt) throw new Error('W4-M1 work时间顺序无效。');
  return structuredClone({ ...source, workspace: parsed.workspace, pythonCode: parsed.pythonCode, blocklyTrace: parsed.blocklyTrace, pythonTrace: parsed.python.trace, run: parsed.run, createdAt, verifiedAt }) as WeekFourMappingWorkV1;
}

export function parseWeekFourMappingEvidence(value: unknown, input: { mission: MissionProgress | undefined; formalWeekThreeBoss: boolean; session: WeekFourMappingMissionSession | undefined; work: WeekFourMappingWorkV1 | undefined }): WeekFourMappingCompletionEvidence {
  const source = record(value, 'W4-M1 completion evidence');
  if (!input.mission) throw new Error('W4-M1证明没有对应完成任务。');
  if (source.kind === 'legacy-replay-only') {
    exactKeys(source, legacyEvidenceKeys, 'W4-M1历史证明');
    const sourceRevision = source.sourceSchemaRevision;
    if (iso(source.completedAt, 'W4-M1历史完成时间') !== input.mission.completedAt || (source.sourceVersion !== 1 && source.sourceVersion !== 2 && source.sourceVersion !== 3) || (sourceRevision !== null && (typeof sourceRevision !== 'number' || !Number.isInteger(sourceRevision) || sourceRevision < 1 || sourceRevision > 7))) throw new Error('W4-M1历史证明无效。');
    if (input.session || input.work) throw new Error('W4-M1历史证明不能伪造 session 或作品。');
    return structuredClone(source) as WeekFourMappingCompletionEvidence;
  }
  if (source.kind !== 'formal-v3') throw new Error('W4-M1证明类型无效。');
  exactKeys(source, formalEvidenceKeys, 'W4-M1正式证明');
  if (!input.formalWeekThreeBoss || !input.session || !input.work || source.workId !== input.work.workId) throw new Error('W4-M1正式证明缺少正式前置、session 或作品。');
  const parsed = canonical(source, 'W4-M1正式证明'); const completedAt = iso(source.completedAt, 'W4-M1正式完成时间'); const verifiedAt = iso(source.verifiedAt, 'W4-M1正式验证时间');
  if (completedAt !== input.mission.completedAt || completedAt > verifiedAt || input.session.lastRunAt === null || input.session.lastRunAt > input.session.savedAt || input.session.savedAt > verifiedAt || !parsed.run.completed || !same(source.blocklyTrace, parsed.blocklyTrace) || !same(source.pythonTrace, parsed.python.trace) || !same(source.run, parsed.run) || !same(input.session.workspace, parsed.workspace) || input.session.pythonCode !== parsed.pythonCode || !same(input.session.lastBlocklyTrace, parsed.blocklyTrace) || !same(input.session.lastPythonTrace, parsed.python.trace) || !same(input.session.lastRun, parsed.run) || !same(input.work.workspace, parsed.workspace) || input.work.pythonCode !== parsed.pythonCode || !same(input.work.blocklyTrace, parsed.blocklyTrace) || !same(input.work.pythonTrace, parsed.python.trace) || !same(input.work.run, parsed.run) || input.work.createdAt !== completedAt || input.work.verifiedAt !== verifiedAt) throw new Error('W4-M1正式证明必须精确绑定当前 session、作品与真实运行。');
  return structuredClone({ kind: 'formal-v3', completedAt, verifiedAt, workspace: parsed.workspace, pythonCode: parsed.pythonCode, blocklyTrace: parsed.blocklyTrace, pythonTrace: parsed.python.trace, run: parsed.run, workId: input.work.workId });
}
