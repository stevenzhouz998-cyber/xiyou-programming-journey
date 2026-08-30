import {
  BAJIE_JOINING_BLOCK_TYPES,
  compileBajieJoiningDraft,
  runBajieJoiningForDraft,
  validateBajieJoiningDraft,
  type BajieJoiningWorkspaceDraftV1,
} from '../blockly/weekThreeBajieJoiningContract';
import type { BajieJoiningMissionSession, MissionSession } from './types';

const object = (value: unknown, field: string): Record<string, unknown> => { if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${field}必须是普通对象`); return value as Record<string, unknown>; };
const exact = (value: Record<string, unknown>, keys: readonly string[], field: string) => { if (Object.keys(value).length !== keys.length || keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) || keys.some((key) => { const descriptor = Object.getOwnPropertyDescriptor(value, key); return !descriptor || !('value' in descriptor); })) throw new Error(`${field}字段无效`); };
const array = (value: unknown, field: string, max: number): unknown[] => { if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max || Object.keys(value).length !== value.length || Array.from({ length: value.length }, (_, index) => Object.prototype.hasOwnProperty.call(value, String(index)) && 'value' in Object.getOwnPropertyDescriptor(value, String(index))! ).some((ok) => !ok)) throw new Error(`${field}数组无效`); return value; };
const count = (value: unknown, field: string) => { if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 1_000_000) throw new Error(`${field}必须是范围内的非负安全整数`); return value as number; };
const date = (value: unknown, field: string) => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || Number.isNaN(new Date(value).getTime()) || new Date(value).toISOString() !== value) throw new Error(`${field}必须是ISO日期`); return value; };
export const sameBajieJoiningData = (actual: unknown, expected: unknown): boolean => {
  if (Object.is(actual, expected)) return true;
  if (Array.isArray(expected)) { if (!Array.isArray(actual) || Object.getPrototypeOf(actual) !== Array.prototype || Object.keys(actual).length !== expected.length || actual.length !== expected.length) return false; return expected.every((item, index) => { const descriptor = Object.getOwnPropertyDescriptor(actual, String(index)); return descriptor !== undefined && 'value' in descriptor && sameBajieJoiningData(descriptor.value, item); }); }
  if (typeof expected !== 'object' || expected === null || typeof actual !== 'object' || actual === null || Array.isArray(actual) || Object.getPrototypeOf(actual) !== Object.prototype) return false;
  const expectedRecord = expected as Record<string, unknown>; const actualRecord = actual as Record<string, unknown>; const keys = Object.keys(expectedRecord);
  return Object.keys(actualRecord).length === keys.length && keys.every((key) => { const descriptor = Object.getOwnPropertyDescriptor(actualRecord, key); return descriptor !== undefined && 'value' in descriptor && Object.prototype.hasOwnProperty.call(expectedRecord, key) && sameBajieJoiningData(descriptor.value, expectedRecord[key]); });
};

export function parseBajieJoiningWorkspace(value: unknown, field = 'sessions.w3-m4.workspace'): BajieJoiningWorkspaceDraftV1 {
  const source = object(value, field); exact(source, ['version', 'missionId', 'blocks'], field);
  if (source.version !== 1 || source.missionId !== 'w3-m4') throw new Error(`${field}无效`);
  const blocks = array(source.blocks, `${field}.blocks`, 32).map((item, index) => {
    const block = object(item, `${field}.blocks[${index}]`);
    exact(block, ['id', 'type', 'previousId', 'nextId', 'parentBlockId', 'conditionBlockId', 'leftBlockId', 'rightBlockId', 'operator', 'branch', 'x', 'y'], `${field}.blocks[${index}]`);
    const reference = (entry: unknown) => entry === null || (typeof entry === 'string' && entry.length > 0 && entry.length <= 128);
    if (typeof block.id !== 'string' || !block.id || block.id.length > 128 || typeof block.type !== 'string' || !BAJIE_JOINING_BLOCK_TYPES.includes(block.type as typeof BAJIE_JOINING_BLOCK_TYPES[number]) || ![block.previousId, block.nextId, block.parentBlockId, block.conditionBlockId, block.leftBlockId, block.rightBlockId].every(reference) || (block.operator !== null && block.operator !== 'and' && block.operator !== 'or') || (block.branch !== null && block.branch !== 'then' && block.branch !== 'else') || typeof block.x !== 'number' || !Number.isFinite(block.x) || typeof block.y !== 'number' || !Number.isFinite(block.y)) throw new Error(`${field}积木无效`);
    return block;
  });
  const parsed = { version: 1 as const, missionId: 'w3-m4' as const, blocks } as unknown as BajieJoiningWorkspaceDraftV1;
  validateBajieJoiningDraft(parsed); return parsed;
}

export function parseBajieJoiningSession(value: unknown): BajieJoiningMissionSession {
  const source = object(value, 'sessions.w3-m4'); exact(source, ['workspace', 'lastTrace', 'lastRun', 'totalRuns', 'runtimeFailures', 'compileFailures', 'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt', 'scenarioResults', 'failureSnapshot', 'conditionObservationUses'], 'sessions.w3-m4');
  const workspace = parseBajieJoiningWorkspace(source.workspace); const trace = compileBajieJoiningDraft(workspace);
  const storedTrace = array(source.lastTrace, 'sessions.w3-m4.lastTrace', 15); const storedScenarios = array(source.scenarioResults, 'sessions.w3-m4.scenarioResults', 3); const hints = array(source.usedHintTiers, 'sessions.w3-m4.usedHintTiers', 3);
  if (hints.some((tier) => tier !== 'observe' && tier !== 'think' && tier !== 'partial') || new Set(hints).size !== hints.length) throw new Error('sessions.w3-m4运行记录无效');
  const totalRuns = count(source.totalRuns, 'sessions.w3-m4.totalRuns'); const runtimeFailures = count(source.runtimeFailures, 'sessions.w3-m4.runtimeFailures'); const compileFailures = count(source.compileFailures, 'sessions.w3-m4.compileFailures'); const failures = object(source.conceptFailures, 'sessions.w3-m4.conceptFailures'); exact(failures, ['programStructure', 'booleanComposition', 'completeness'], 'sessions.w3-m4.conceptFailures');
  const conceptFailures = { programStructure: count(failures.programStructure, 'programStructure'), booleanComposition: count(failures.booleanComposition, 'booleanComposition'), completeness: count(failures.completeness, 'completeness') };
  if (compileFailures !== conceptFailures.programStructure || runtimeFailures !== conceptFailures.booleanComposition + conceptFailures.completeness || runtimeFailures > totalRuns) throw new Error('sessions.w3-m4累计失败证据不一致');
  const rawUses = array(source.conditionObservationUses, 'sessions.w3-m4.conditionObservationUses', 1000);
  const uses = rawUses.map((entry, index) => { const use = object(entry, `sessions.w3-m4.conditionObservationUses[${index}]`); exact(use, ['snapshotId', 'usedAt', 'workspace'], `sessions.w3-m4.conditionObservationUses[${index}]`); if (typeof use.snapshotId !== 'string' || !use.snapshotId || use.snapshotId.length > 256) throw new Error('sessions.w3-m4.conditionObservationUses快照无效'); const historical = parseBajieJoiningWorkspace(use.workspace, `sessions.w3-m4.conditionObservationUses[${index}].workspace`); const replay = runBajieJoiningForDraft(historical, compileBajieJoiningDraft(historical)); if (replay.completed || replay.failureSnapshot?.snapshotId !== use.snapshotId) throw new Error('sessions.w3-m4.conditionObservationUses必须对应可重放失败快照'); const usedAt = date(use.usedAt, `sessions.w3-m4.conditionObservationUses[${index}].usedAt`); return { snapshotId: use.snapshotId, usedAt, workspace: historical }; });
  if (new Set(uses.map((use) => use.snapshotId)).size !== uses.length || runtimeFailures < uses.length) throw new Error('sessions.w3-m4观察记录无效');
  const savedAt = date(source.savedAt, 'sessions.w3-m4.savedAt');
  if (uses.some((use) => use.usedAt > savedAt)) throw new Error('sessions.w3-m4观察时间无效');
  if (totalRuns === 0) { if (source.lastRun !== null || storedTrace.length !== 0 || storedScenarios.length !== 0 || source.failureSnapshot !== null || source.lastRunAt !== null || uses.length !== 0) throw new Error('sessions.w3-m4零次运行不得有运行证据'); return { workspace, lastTrace: [], lastRun: null, totalRuns, runtimeFailures, compileFailures, usedHintTiers: [...hints] as MissionSession['usedHintTiers'], conceptFailures, lastRunAt: null, savedAt, scenarioResults: [], failureSnapshot: null, conditionObservationUses: uses }; }
  const cleared = source.lastRun === null && storedTrace.length === 0 && storedScenarios.length === 0 && source.failureSnapshot === null && source.lastRunAt === null;
  if (cleared) return { workspace, lastTrace: [], lastRun: null, totalRuns, runtimeFailures, compileFailures, usedHintTiers: [...hints] as MissionSession['usedHintTiers'], conceptFailures, lastRunAt: null, savedAt, scenarioResults: [], failureSnapshot: null, conditionObservationUses: uses };
  if (source.lastRun === null || storedTrace.length !== trace.length || source.lastRunAt === null) throw new Error('sessions.w3-m4运行证据不完整');
  const run = runBajieJoiningForDraft(workspace, trace);
  const lastRunAt = date(source.lastRunAt, 'sessions.w3-m4.lastRunAt');
  if (lastRunAt > savedAt) throw new Error('sessions.w3-m4运行时间无效');
  if (!sameBajieJoiningData(storedTrace, trace) || !sameBajieJoiningData(source.lastRun, run) || !sameBajieJoiningData(storedScenarios, run.scenarioResults) || !sameBajieJoiningData(source.failureSnapshot, run.failureSnapshot)) throw new Error('sessions.w3-m4运行必须由workspace重新编译并确定性重放');
  return { workspace, lastTrace: structuredClone(trace), lastRun: structuredClone(run), totalRuns, runtimeFailures, compileFailures, usedHintTiers: [...hints] as MissionSession['usedHintTiers'], conceptFailures, lastRunAt, savedAt, scenarioResults: structuredClone(run.scenarioResults), failureSnapshot: structuredClone(run.failureSnapshot), conditionObservationUses: uses };
}
