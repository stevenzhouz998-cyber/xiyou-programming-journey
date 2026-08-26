import {
  compileMonkeyKingDraft,
  isMonkeyKingBlockType,
  isMonkeyKingEventType,
  isMonkeyKingOpcode,
  runMonkeyKingEvents,
  validateMonkeyKingDraft,
  type MonkeyKingInstruction,
  type MonkeyKingWorkspaceDraftV1,
} from '../blockly/weekTwoMonkeyKingContract';
import type { MissionSession, MonkeyKingMissionSession } from './types';

const object = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${field}必须是对象`);
  return value as Record<string, unknown>;
};
const exactKeys = (value: Record<string, unknown>, keys: readonly string[], field: string) => {
  if (Object.keys(value).length !== keys.length || keys.some((key) => !(key in value))) throw new Error(`${field}字段无效`);
};
const count = (value: unknown, field: string) => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${field}必须是非负安全整数`);
  return value as number;
};
const date = (value: unknown, field: string) => {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime()) || new Date(value).toISOString() !== value) throw new Error(`${field}必须是ISO日期`);
  return value;
};
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function parseWorkspace(value: unknown): MonkeyKingWorkspaceDraftV1 {
  const source = object(value, 'sessions.w2-m2.workspace');
  exactKeys(source, ['version', 'missionId', 'blocks'], 'sessions.w2-m2.workspace');
  if (source.version !== 1 || source.missionId !== 'w2-m2' || !Array.isArray(source.blocks)) throw new Error('sessions.w2-m2.workspace无效');
  const blocks = source.blocks.map((item, index) => {
    const block = object(item, `sessions.w2-m2.workspace.blocks[${index}]`);
    exactKeys(block, ['id', 'type', 'nextId', 'parentBlockId', 'x', 'y'], `sessions.w2-m2.workspace.blocks[${index}]`);
    if (typeof block.id !== 'string' || !isMonkeyKingBlockType(String(block.type))
      || (block.nextId !== null && typeof block.nextId !== 'string')
      || (block.parentBlockId !== null && typeof block.parentBlockId !== 'string')
      || typeof block.x !== 'number' || typeof block.y !== 'number') throw new Error('sessions.w2-m2.workspace积木无效');
    return block as unknown as MonkeyKingWorkspaceDraftV1['blocks'][number];
  });
  const parsed = { version: 1 as const, missionId: 'w2-m2' as const, blocks };
  validateMonkeyKingDraft(parsed);
  return parsed;
}

function parseTrace(value: unknown, workspace: MonkeyKingWorkspaceDraftV1): MonkeyKingInstruction[] {
  if (!Array.isArray(value)) throw new Error('sessions.w2-m2.lastTrace必须是数组');
  const parsed = value.map((item, index) => {
    const source = object(item, `sessions.w2-m2.lastTrace[${index}]`);
    exactKeys(source, ['kind', 'instructionId', 'eventId', 'eventType', 'dispatchIndex', 'handlerBlockId', 'sourceBlockId', 'parentBlockId', 'opcode'], `sessions.w2-m2.lastTrace[${index}]`);
    if ((source.kind !== 'handler' && source.kind !== 'action') || typeof source.instructionId !== 'string'
      || typeof source.eventId !== 'string' || !isMonkeyKingEventType(String(source.eventType))
      || !Number.isSafeInteger(source.dispatchIndex) || typeof source.handlerBlockId !== 'string'
      || typeof source.sourceBlockId !== 'string' || (source.parentBlockId !== null && typeof source.parentBlockId !== 'string')
      || (source.kind === 'handler' ? source.opcode !== null : !isMonkeyKingOpcode(String(source.opcode)))) throw new Error('sessions.w2-m2.lastTrace事件指令无效');
    return source as unknown as MonkeyKingInstruction;
  });
  if (parsed.length > 0 && !same(parsed, compileMonkeyKingDraft(workspace))) throw new Error('sessions.w2-m2.lastTrace必须由workspace重新编译');
  return parsed;
}

export function parseMonkeyKingSession(value: unknown): MonkeyKingMissionSession {
  const source = object(value, 'sessions.w2-m2');
  const keys = ['workspace', 'lastTrace', 'lastRun', 'totalRuns', 'runtimeFailures', 'compileFailures', 'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt'];
  exactKeys(source, keys, 'sessions.w2-m2');
  const workspace = parseWorkspace(source.workspace);
  const lastTrace = parseTrace(source.lastTrace, workspace);
  const totalRuns = count(source.totalRuns, 'sessions.w2-m2.totalRuns');
  const runtimeFailures = count(source.runtimeFailures, 'sessions.w2-m2.runtimeFailures');
  const compileFailures = count(source.compileFailures, 'sessions.w2-m2.compileFailures');
  if (!Array.isArray(source.usedHintTiers) || source.usedHintTiers.some((tier) => tier !== 'observe' && tier !== 'think' && tier !== 'partial') || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) throw new Error('sessions.w2-m2.usedHintTiers无效');
  const failures = object(source.conceptFailures, 'sessions.w2-m2.conceptFailures');
  exactKeys(failures, ['programStructure', 'sequencePrecondition', 'completeness'], 'sessions.w2-m2.conceptFailures');
  const conceptFailures = { programStructure: count(failures.programStructure, 'programStructure'), sequencePrecondition: count(failures.sequencePrecondition, 'sequencePrecondition'), completeness: count(failures.completeness, 'completeness') };
  if (compileFailures !== conceptFailures.programStructure || runtimeFailures !== conceptFailures.sequencePrecondition + conceptFailures.completeness) throw new Error('sessions.w2-m2累计失败证据不一致');
  const lastRunAt = source.lastRunAt === null ? null : date(source.lastRunAt, 'sessions.w2-m2.lastRunAt');
  if (totalRuns === 0 && (source.lastRun !== null || lastTrace.length !== 0 || lastRunAt !== null)) throw new Error('sessions.w2-m2零次运行不得有运行证据');
  const hasEvidence = source.lastRun !== null || lastTrace.length > 0 || lastRunAt !== null;
  if (totalRuns > 0 && hasEvidence && (source.lastRun === null || lastTrace.length === 0 || lastRunAt === null)) throw new Error('sessions.w2-m2运行证据不完整');
  const lastRun = source.lastRun === null ? null : runMonkeyKingEvents(lastTrace);
  if (source.lastRun !== null && !same(source.lastRun, lastRun)) throw new Error('sessions.w2-m2.lastRun必须由lastTrace确定性重放');
  return { workspace, lastTrace, lastRun, totalRuns, runtimeFailures, compileFailures, usedHintTiers: source.usedHintTiers as MissionSession['usedHintTiers'], conceptFailures, lastRunAt, savedAt: date(source.savedAt, 'sessions.w2-m2.savedAt') };
}
