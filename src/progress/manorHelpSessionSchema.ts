import {
  MANOR_HELP_BLOCK_TYPES,
  compileManorHelpDraft,
  runManorHelp,
  validateManorHelpDraft,
  type ManorHelpFailureSnapshot,
  type ManorHelpInstruction,
  type ManorHelpRunResult,
  type ManorHelpScenarioResult,
  type ManorHelpWorkspaceDraftV1,
} from '../blockly/weekThreeManorHelpContract';
import type { ManorHelpMissionSession, MissionSession } from './types';

const MAX_ID_LENGTH = 128;
const MAX_SNAPSHOT_ID_LENGTH = 256;
const MAX_AUDIT_USES = 1000;
const object = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${field}必须是对象`);
  return value as Record<string, unknown>;
};
const exact = (value: Record<string, unknown>, keys: readonly string[], field: string): void => {
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
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => same(item, right[index]));
  }
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = Object.keys(leftRecord);
  return keys.length === Object.keys(rightRecord).length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(rightRecord, key) && same(leftRecord[key], rightRecord[key]));
};
const nullableId = (value: unknown, field: string): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ID_LENGTH) throw new Error(`${field}必须是安全积木标识`);
  return value;
};
const id = (value: unknown, field: string): string => {
  const parsed = nullableId(value, field);
  if (parsed === null) throw new Error(`${field}不能为空`);
  return parsed;
};

function workspace(value: unknown, field = 'sessions.w3-m1.workspace'): ManorHelpWorkspaceDraftV1 {
  const source = object(value, field);
  exact(source, ['version', 'missionId', 'blocks'], field);
  if (source.version !== 1 || source.missionId !== 'w3-m1' || !Array.isArray(source.blocks)) throw new Error(`${field}无效`);
  const blocks = source.blocks.map((item, index) => {
    const blockField = `${field}.blocks[${index}]`;
    const block = object(item, blockField);
    exact(block, ['id', 'type', 'previousId', 'nextId', 'parentBlockId', 'conditionBlockId', 'branch', 'x', 'y'], blockField);
    if (typeof block.id !== 'string' || block.id.length === 0 || block.id.length > MAX_ID_LENGTH
      || typeof block.type !== 'string' || !MANOR_HELP_BLOCK_TYPES.includes(block.type as typeof MANOR_HELP_BLOCK_TYPES[number])
      || (block.previousId !== null && (typeof block.previousId !== 'string' || block.previousId.length === 0 || block.previousId.length > MAX_ID_LENGTH))
      || (block.nextId !== null && (typeof block.nextId !== 'string' || block.nextId.length === 0 || block.nextId.length > MAX_ID_LENGTH))
      || (block.parentBlockId !== null && (typeof block.parentBlockId !== 'string' || block.parentBlockId.length === 0 || block.parentBlockId.length > MAX_ID_LENGTH))
      || (block.conditionBlockId !== null && (typeof block.conditionBlockId !== 'string' || block.conditionBlockId.length === 0 || block.conditionBlockId.length > MAX_ID_LENGTH))
      || (block.branch !== null && block.branch !== 'then' && block.branch !== 'else')
      || typeof block.x !== 'number' || !Number.isFinite(block.x) || typeof block.y !== 'number' || !Number.isFinite(block.y)) throw new Error(`${field}积木无效`);
    return block;
  });
  const parsed = { version: 1 as const, missionId: 'w3-m1' as const, blocks } as unknown as ManorHelpWorkspaceDraftV1;
  validateManorHelpDraft(parsed);
  return parsed;
}

function trace(value: unknown, draft: ManorHelpWorkspaceDraftV1): ManorHelpInstruction[] {
  if (!Array.isArray(value)) throw new Error('sessions.w3-m1.lastTrace必须是数组');
  const parsed = value.map((item, index) => {
    const source = object(item, `sessions.w3-m1.lastTrace[${index}]`);
    exact(source, ['instructionId', 'scenarioId', 'opcode', 'sourceBlockId', 'parentBlockId', 'conditionSourceBlockId', 'conditionKind', 'conditionLabel', 'observedValue', 'evidenceCode', 'evidenceTextKey', 'actualBranch'], `sessions.w3-m1.lastTrace[${index}]`);
    if (typeof source.instructionId !== 'string' || source.instructionId.length === 0 || source.instructionId.length > MAX_ID_LENGTH * 3
      || (source.scenarioId !== 'canon-gaocai-help' && source.scenarioId !== 'practice-manor-directions')
      || (source.opcode !== 'receive-message' && source.opcode !== 'condition-checked' && source.opcode !== 'accept-and-return-notice' && source.opcode !== 'continue-journey')
      || !id(source.sourceBlockId, `sessions.w3-m1.lastTrace[${index}].sourceBlockId`)
      || (source.parentBlockId !== null && !nullableId(source.parentBlockId, `sessions.w3-m1.lastTrace[${index}].parentBlockId`))
      || !id(source.conditionSourceBlockId, `sessions.w3-m1.lastTrace[${index}].conditionSourceBlockId`)
      || (source.conditionKind !== 'explicit-demon-help' && source.conditionKind !== 'mentions-gao-manor')
      || typeof source.conditionLabel !== 'string' || source.conditionLabel.length === 0 || source.conditionLabel.length > 256
      || typeof source.observedValue !== 'boolean'
      || typeof source.evidenceCode !== 'string' || source.evidenceCode.length === 0 || source.evidenceCode.length > 256
      || typeof source.evidenceTextKey !== 'string' || source.evidenceTextKey.length === 0 || source.evidenceTextKey.length > 256
      || (source.actualBranch !== 'then' && source.actualBranch !== 'else')) throw new Error('sessions.w3-m1.lastTrace指令无效');
    return source as unknown as ManorHelpInstruction;
  });
  if (parsed.length > 0 && !same(parsed, compileManorHelpDraft(draft))) throw new Error('sessions.w3-m1.lastTrace必须由workspace重新编译');
  return parsed;
}

function uses(value: unknown): ManorHelpMissionSession['conditionObservationUses'] {
  if (!Array.isArray(value) || value.length > MAX_AUDIT_USES) throw new Error('sessions.w3-m1.conditionObservationUses无效');
  const seen = new Set<string>();
  return value.map((item, index) => {
    const source = object(item, `sessions.w3-m1.conditionObservationUses[${index}]`);
    const field = `sessions.w3-m1.conditionObservationUses[${index}]`;
    exact(source, ['snapshotId', 'usedAt', 'workspace'], field);
    if (typeof source.snapshotId !== 'string' || source.snapshotId.length === 0 || source.snapshotId.length > MAX_SNAPSHOT_ID_LENGTH) throw new Error(`sessions.w3-m1.conditionObservationUses[${index}].snapshotId必须是安全快照标识`);
    const snapshotId = source.snapshotId;
    if (seen.has(snapshotId)) throw new Error('sessions.w3-m1.conditionObservationUses快照不得重复');
    seen.add(snapshotId);
    const usedAt = date(source.usedAt, `${field}.usedAt`);
    const historicalWorkspace = workspace(source.workspace, `${field}.workspace`);
    let historicalRun: ManorHelpRunResult;
    try {
      historicalRun = runManorHelp(compileManorHelpDraft(historicalWorkspace));
    } catch {
      throw new Error(`${field}.workspace无法重编译重放`);
    }
    if (historicalRun.completed || historicalRun.failureSnapshot === null
      || historicalRun.failureSnapshot.snapshotId !== snapshotId) {
      throw new Error(`${field}必须对应失败快照的可重放历史图`);
    }
    return { snapshotId, usedAt, workspace: historicalWorkspace };
  });
}

export function parseManorHelpSession(value: unknown): ManorHelpMissionSession {
  const source = object(value, 'sessions.w3-m1');
  exact(source, ['workspace', 'lastTrace', 'lastRun', 'totalRuns', 'runtimeFailures', 'compileFailures', 'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt', 'scenarioResults', 'failureSnapshot', 'conditionObservationUses'], 'sessions.w3-m1');
  const parsedWorkspace = workspace(source.workspace);
  const lastTrace = trace(source.lastTrace, parsedWorkspace);
  const totalRuns = count(source.totalRuns, 'sessions.w3-m1.totalRuns');
  const runtimeFailures = count(source.runtimeFailures, 'sessions.w3-m1.runtimeFailures');
  const compileFailures = count(source.compileFailures, 'sessions.w3-m1.compileFailures');
  if (!Array.isArray(source.scenarioResults)) throw new Error('sessions.w3-m1.scenarioResults必须是数组');
  if (!Array.isArray(source.usedHintTiers) || source.usedHintTiers.some((tier) => tier !== 'observe' && tier !== 'think' && tier !== 'partial') || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) throw new Error('sessions.w3-m1.usedHintTiers无效');
  const rawFailures = object(source.conceptFailures, 'sessions.w3-m1.conceptFailures');
  exact(rawFailures, ['programStructure', 'conditionSelection', 'branchRouting', 'completeness'], 'sessions.w3-m1.conceptFailures');
  const conceptFailures = {
    programStructure: count(rawFailures.programStructure, 'sessions.w3-m1.conceptFailures.programStructure'),
    conditionSelection: count(rawFailures.conditionSelection, 'sessions.w3-m1.conceptFailures.conditionSelection'),
    branchRouting: count(rawFailures.branchRouting, 'sessions.w3-m1.conceptFailures.branchRouting'),
    completeness: count(rawFailures.completeness, 'sessions.w3-m1.conceptFailures.completeness'),
  };
  if (compileFailures !== conceptFailures.programStructure
    || runtimeFailures !== conceptFailures.conditionSelection + conceptFailures.branchRouting + conceptFailures.completeness
    || runtimeFailures > totalRuns) throw new Error('sessions.w3-m1累计失败证据不一致');
  const lastRunAt = source.lastRunAt === null ? null : date(source.lastRunAt, 'sessions.w3-m1.lastRunAt');
  const conditionObservationUses = uses(source.conditionObservationUses);
  const hasEvidence = source.lastRun !== null || lastTrace.length > 0 || lastRunAt !== null || source.scenarioResults.length > 0 || source.failureSnapshot !== null;
  if (totalRuns === 0) {
    if (hasEvidence || conditionObservationUses.length !== 0) throw new Error('sessions.w3-m1零次运行不得有运行证据');
    return { workspace: parsedWorkspace, lastTrace, lastRun: null, totalRuns, runtimeFailures, compileFailures, usedHintTiers: source.usedHintTiers as MissionSession['usedHintTiers'], conceptFailures, scenarioResults: [], failureSnapshot: null, conditionObservationUses, lastRunAt: null, savedAt: date(source.savedAt, 'sessions.w3-m1.savedAt') };
  }
  const cleared = source.lastRun === null && lastTrace.length === 0 && lastRunAt === null && source.scenarioResults.length === 0 && source.failureSnapshot === null;
  if (!cleared && (source.lastRun === null || lastTrace.length === 0 || lastRunAt === null)) throw new Error('sessions.w3-m1运行证据不完整');
  if (cleared) return { workspace: parsedWorkspace, lastTrace: [], lastRun: null, totalRuns, runtimeFailures, compileFailures, usedHintTiers: source.usedHintTiers as MissionSession['usedHintTiers'], conceptFailures, scenarioResults: [], failureSnapshot: null, conditionObservationUses, lastRunAt: null, savedAt: date(source.savedAt, 'sessions.w3-m1.savedAt') };
  if (source.scenarioResults.length !== 2) throw new Error('sessions.w3-m1.scenarioResults必须包含两条情境结果');
  const replay = runManorHelp(lastTrace);
  if (!same(source.lastRun, replay)) throw new Error('sessions.w3-m1.lastRun必须由lastTrace确定性重放');
  if (!same(source.scenarioResults, replay.scenarioResults) || !same(source.failureSnapshot, replay.failureSnapshot)) throw new Error('sessions.w3-m1场景或快照必须对应确定性重放');
  return { workspace: parsedWorkspace, lastTrace, lastRun: replay as ManorHelpRunResult, totalRuns, runtimeFailures, compileFailures, usedHintTiers: source.usedHintTiers as MissionSession['usedHintTiers'], conceptFailures, scenarioResults: replay.scenarioResults as ManorHelpScenarioResult[], failureSnapshot: replay.failureSnapshot as ManorHelpFailureSnapshot | null, conditionObservationUses, lastRunAt, savedAt: date(source.savedAt, 'sessions.w3-m1.savedAt') };
}
