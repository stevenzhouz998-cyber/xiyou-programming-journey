import {
  CUILAN_BOOLEAN_BLOCK_TYPES,
  compileCuilanBooleanDraft,
  runCuilanBooleanForDraft,
  validateCuilanBooleanDraft,
  type CuilanBooleanWorkspaceDraftV1,
} from '../blockly/weekThreeCuilanBooleanContract';
import type { CuilanBooleanMissionSession, MissionSession } from './types';

const MAX_ID_LENGTH = 128;
const MAX_AUDIT_USES = 1000;
const object = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${field}必须是对象`);
  return value as Record<string, unknown>;
};
const exact = (value: Record<string, unknown>, keys: readonly string[], field: string) => {
  if (Object.keys(value).length !== keys.length || keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) throw new Error(`${field}字段无效`);
};
const count = (value: unknown, field: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${field}必须是非负安全整数`);
  return value as number;
};
const date = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || Number.isNaN(new Date(value).getTime()) || new Date(value).toISOString() !== value) throw new Error(`${field}必须是ISO日期`);
  return value;
};
const same = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => same(item, right[index]));
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) return false;
  const leftRecord = left as Record<string, unknown>; const rightRecord = right as Record<string, unknown>;
  return Object.keys(leftRecord).length === Object.keys(rightRecord).length && Object.keys(leftRecord).every((key) => Object.prototype.hasOwnProperty.call(rightRecord, key) && same(leftRecord[key], rightRecord[key]));
};
const nullableDate = (value: unknown, field: string) => value === null ? null : date(value, field);

export function parseCuilanBooleanWorkspace(value: unknown, field = 'sessions.w3-m2.workspace'): CuilanBooleanWorkspaceDraftV1 {
  const source = object(value, field); exact(source, ['version', 'missionId', 'blocks'], field);
  if (source.version !== 1 || source.missionId !== 'w3-m2' || !Array.isArray(source.blocks)) throw new Error(`${field}无效`);
  const blocks = source.blocks.map((item, index) => {
    const block = object(item, `${field}.blocks[${index}]`); exact(block, ['id', 'type', 'previousId', 'nextId', 'parentBlockId', 'conditionBlockId', 'branch', 'x', 'y'], `${field}.blocks[${index}]`);
    const nullableId = (candidate: unknown) => candidate === null || (typeof candidate === 'string' && candidate.length > 0 && candidate.length <= MAX_ID_LENGTH);
    if (typeof block.id !== 'string' || block.id.length === 0 || block.id.length > MAX_ID_LENGTH || typeof block.type !== 'string' || !CUILAN_BOOLEAN_BLOCK_TYPES.includes(block.type as typeof CUILAN_BOOLEAN_BLOCK_TYPES[number]) || !nullableId(block.previousId) || !nullableId(block.nextId) || !nullableId(block.parentBlockId) || !nullableId(block.conditionBlockId) || (block.branch !== null && block.branch !== 'then' && block.branch !== 'else') || typeof block.x !== 'number' || !Number.isFinite(block.x) || typeof block.y !== 'number' || !Number.isFinite(block.y)) throw new Error(`${field}积木无效`);
    return block;
  });
  const parsed = { version: 1 as const, missionId: 'w3-m2' as const, blocks } as unknown as CuilanBooleanWorkspaceDraftV1;
  validateCuilanBooleanDraft(parsed);
  return parsed;
}

function uses(value: unknown): CuilanBooleanMissionSession['conditionObservationUses'] {
  if (!Array.isArray(value) || value.length > MAX_AUDIT_USES) throw new Error('sessions.w3-m2.conditionObservationUses无效');
  const seen = new Set<string>();
  return value.map((item, index) => {
    const source = object(item, `sessions.w3-m2.conditionObservationUses[${index}]`); exact(source, ['snapshotId', 'usedAt', 'workspace'], `sessions.w3-m2.conditionObservationUses[${index}]`);
    if (typeof source.snapshotId !== 'string' || source.snapshotId.length === 0 || source.snapshotId.length > 256 || seen.has(source.snapshotId)) throw new Error('sessions.w3-m2.conditionObservationUses快照无效');
    seen.add(source.snapshotId);
    const historicalWorkspace = parseCuilanBooleanWorkspace(source.workspace, `sessions.w3-m2.conditionObservationUses[${index}].workspace`);
    const replay = runCuilanBooleanForDraft(historicalWorkspace);
    if (replay.completed || replay.failureSnapshot?.snapshotId !== source.snapshotId) throw new Error('sessions.w3-m2.conditionObservationUses必须对应可重放失败快照');
    return { snapshotId: source.snapshotId, usedAt: date(source.usedAt, `sessions.w3-m2.conditionObservationUses[${index}].usedAt`), workspace: historicalWorkspace };
  });
}

export function parseCuilanBooleanSession(value: unknown): CuilanBooleanMissionSession {
  const source = object(value, 'sessions.w3-m2');
  exact(source, ['workspace', 'lastTrace', 'lastRun', 'totalRuns', 'runtimeFailures', 'compileFailures', 'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt', 'checkpointResults', 'failureSnapshot', 'conditionObservationUses'], 'sessions.w3-m2');
  const parsedWorkspace = parseCuilanBooleanWorkspace(source.workspace);
  const canonicalTrace = compileCuilanBooleanDraft(parsedWorkspace);
  if (!Array.isArray(source.lastTrace) || !Array.isArray(source.checkpointResults) || (source.lastTrace.length !== 0 && !same(source.lastTrace, canonicalTrace))) throw new Error('sessions.w3-m2.lastTrace必须由workspace重新编译');
  if (!Array.isArray(source.usedHintTiers) || source.usedHintTiers.some((tier) => tier !== 'observe' && tier !== 'think' && tier !== 'partial') || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) throw new Error('sessions.w3-m2.usedHintTiers无效');
  const totalRuns = count(source.totalRuns, 'sessions.w3-m2.totalRuns'); const runtimeFailures = count(source.runtimeFailures, 'sessions.w3-m2.runtimeFailures'); const compileFailures = count(source.compileFailures, 'sessions.w3-m2.compileFailures');
  const rawFailures = object(source.conceptFailures, 'sessions.w3-m2.conceptFailures'); exact(rawFailures, ['programStructure', 'conditionSelection', 'branchRouting', 'sequencePrecondition', 'completeness'], 'sessions.w3-m2.conceptFailures');
  const conceptFailures = { programStructure: count(rawFailures.programStructure, 'programStructure'), conditionSelection: count(rawFailures.conditionSelection, 'conditionSelection'), branchRouting: count(rawFailures.branchRouting, 'branchRouting'), sequencePrecondition: count(rawFailures.sequencePrecondition, 'sequencePrecondition'), completeness: count(rawFailures.completeness, 'completeness') };
  if (compileFailures !== conceptFailures.programStructure || runtimeFailures !== conceptFailures.conditionSelection + conceptFailures.branchRouting + conceptFailures.sequencePrecondition + conceptFailures.completeness || runtimeFailures > totalRuns) throw new Error('sessions.w3-m2累计失败证据不一致');
  const conditionObservationUses = uses(source.conditionObservationUses);
  if (runtimeFailures < conditionObservationUses.length) throw new Error('sessions.w3-m2观察记录必须对应已记录的运行失败');
  if (totalRuns === 0) {
    if (source.lastRun !== null || !Array.isArray(source.lastTrace) || source.lastTrace.length !== 0 || source.lastRunAt !== null || !Array.isArray(source.checkpointResults) || source.checkpointResults.length !== 0 || source.failureSnapshot !== null || conditionObservationUses.length !== 0) throw new Error('sessions.w3-m2零次运行不得有运行证据');
    return { workspace: parsedWorkspace, lastTrace: [], lastRun: null, totalRuns, runtimeFailures, compileFailures, usedHintTiers: source.usedHintTiers as MissionSession['usedHintTiers'], conceptFailures, lastRunAt: null, savedAt: date(source.savedAt, 'sessions.w3-m2.savedAt'), checkpointResults: [], failureSnapshot: null, conditionObservationUses };
  }
  const lastRunAt = nullableDate(source.lastRunAt, 'sessions.w3-m2.lastRunAt');
  const cleared = source.lastRun === null && source.lastTrace.length === 0 && lastRunAt === null
    && source.checkpointResults.length === 0 && source.failureSnapshot === null;
  if (cleared) {
    return { workspace: parsedWorkspace, lastTrace: [], lastRun: null, totalRuns, runtimeFailures, compileFailures, usedHintTiers: source.usedHintTiers as MissionSession['usedHintTiers'], conceptFailures, lastRunAt: null, savedAt: date(source.savedAt, 'sessions.w3-m2.savedAt'), checkpointResults: [], failureSnapshot: null, conditionObservationUses };
  }
  if (source.lastRun === null || source.lastTrace.length === 0 || lastRunAt === null) throw new Error('sessions.w3-m2运行证据不完整');
  const replay = runCuilanBooleanForDraft(parsedWorkspace, canonicalTrace);
  if (!same(source.lastTrace, canonicalTrace) || !same(source.lastRun, replay) || !same(source.checkpointResults, replay.checkpointResults) || !same(source.failureSnapshot, replay.failureSnapshot)) throw new Error('sessions.w3-m2运行必须由workspace确定性重放');
  return { workspace: parsedWorkspace, lastTrace: canonicalTrace, lastRun: replay, totalRuns, runtimeFailures, compileFailures, usedHintTiers: source.usedHintTiers as MissionSession['usedHintTiers'], conceptFailures, lastRunAt, savedAt: date(source.savedAt, 'sessions.w3-m2.savedAt'), checkpointResults: replay.checkpointResults, failureSnapshot: replay.failureSnapshot, conditionObservationUses };
}
