import { compileAdvancedWeekOneDraft, isAdvancedWeekOneBlockType, isAdvancedWeekOneOpcode, runAdvancedWeekOne, validateAdvancedWeekOneDraft, type AdvancedWeekOneInstruction, type AdvancedWeekOneMissionId, type AdvancedWeekOneRunResult, type AdvancedWeekOneWorkspaceDraftV1 } from '../blockly/advancedWeekOneContract';
import type { AdvancedWeekOneMissionSession } from './types';
import type { EquipmentEffect } from './equipment';

const MAX = 500;
const exactKeys = (value: Record<string, unknown>, expected: readonly string[], field: string) => {
  if (Object.keys(value).length !== expected.length || expected.some((key) => !(key in value))) throw new Error(`${field}字段无效`);
};
const object = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${field}必须是对象`);
  return value as Record<string, unknown>;
};
const date = (value: unknown, field: string) => {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime()) || new Date(value).toISOString() !== value) throw new Error(`${field}必须是ISO日期`);
  return value;
};
const count = (value: unknown, field: string) => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${field}必须是非负安全整数`);
  return value as number;
};
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function workspace(value: unknown, missionId: AdvancedWeekOneMissionId): AdvancedWeekOneWorkspaceDraftV1 {
  const source = object(value, 'workspace');
  exactKeys(source, ['version', 'missionId', 'blocks'], 'workspace');
  if (source.version !== 1 || source.missionId !== missionId || !Array.isArray(source.blocks) || source.blocks.length > MAX) throw new Error('workspace无效');
  const blocks = source.blocks.map((item, index) => {
    const block = object(item, `workspace.blocks[${index}]`);
    exactKeys(block, ['id', 'type', 'nextId', 'parentBlockId', 'x', 'y'], `workspace.blocks[${index}]`);
    if (typeof block.id !== 'string' || block.id.length === 0 || block.id.length > 256 || !isAdvancedWeekOneBlockType(String(block.type)) || (block.nextId !== null && typeof block.nextId !== 'string') || (block.parentBlockId !== null && typeof block.parentBlockId !== 'string') || typeof block.x !== 'number' || typeof block.y !== 'number' || !Number.isFinite(block.x) || !Number.isFinite(block.y) || Math.abs(block.x) > Number.MAX_SAFE_INTEGER || Math.abs(block.y) > Number.MAX_SAFE_INTEGER) throw new Error('workspace积木无效');
    return block as unknown as AdvancedWeekOneWorkspaceDraftV1['blocks'][number];
  });
  const parsed = { version: 1 as const, missionId, blocks };
  validateAdvancedWeekOneDraft(parsed);
  return parsed;
}

function trace(value: unknown, missionId: AdvancedWeekOneMissionId, draft: AdvancedWeekOneWorkspaceDraftV1): AdvancedWeekOneInstruction[] {
  if (!Array.isArray(value) || value.length > MAX) throw new Error('lastTrace无效');
  const parsed = value.map((item, index) => {
    const source = object(item, `lastTrace[${index}]`);
    exactKeys(source, ['instructionId', 'sourceBlockId', 'parentBlockId', 'opcode'], `lastTrace[${index}]`);
    if (typeof source.sourceBlockId !== 'string' || typeof source.instructionId !== 'string' || source.instructionId !== `instruction:${source.sourceBlockId}` || (source.parentBlockId !== null && typeof source.parentBlockId !== 'string') || !isAdvancedWeekOneOpcode(String(source.opcode))) throw new Error('lastTrace指令无效');
    return source as unknown as AdvancedWeekOneInstruction;
  });
  if (parsed.length > 0) {
    const canonical = compileAdvancedWeekOneDraft(draft);
    if (!same(parsed, canonical)) throw new Error('lastTrace必须由workspace重新编译');
  }
  return parsed;
}

export function parseAdvancedWeekOneSession(value: unknown, missionId: AdvancedWeekOneMissionId): AdvancedWeekOneMissionSession {
  const source = object(value, `sessions.${missionId}`);
  const baseKeys = ['workspace', 'lastTrace', 'lastRun', 'totalRuns', 'runtimeFailures', 'compileFailures', 'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt'];
  exactKeys(source, 'equipmentEffectsUsed' in source ? [...baseKeys, 'equipmentEffectsUsed'] : baseKeys, `sessions.${missionId}`);
  const parsedWorkspace = workspace(source.workspace, missionId);
  const lastTrace = trace(source.lastTrace, missionId, parsedWorkspace);
  const totalRuns = count(source.totalRuns, 'totalRuns');
  const runtimeFailures = count(source.runtimeFailures, 'runtimeFailures');
  const compileFailures = count(source.compileFailures, 'compileFailures');
  if (runtimeFailures > totalRuns) throw new Error('runtimeFailures不能超过totalRuns');
  if (!Array.isArray(source.usedHintTiers) || source.usedHintTiers.some((tier) => tier !== 'observe' && tier !== 'think' && tier !== 'partial') || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) throw new Error('usedHintTiers无效');
  const failures = object(source.conceptFailures, 'conceptFailures');
  exactKeys(failures, ['programStructure', 'sequencePrecondition', 'completeness'], 'conceptFailures');
  const conceptFailures = { programStructure: count(failures.programStructure, 'programStructure'), sequencePrecondition: count(failures.sequencePrecondition, 'sequencePrecondition'), completeness: count(failures.completeness, 'completeness') };
  if (compileFailures !== conceptFailures.programStructure || runtimeFailures !== conceptFailures.sequencePrecondition + conceptFailures.completeness) throw new Error('累计失败证据不一致');
  const lastRunAt = source.lastRunAt === null ? null : date(source.lastRunAt, 'lastRunAt');
  if (totalRuns === 0 && (source.lastRun !== null || lastTrace.length !== 0 || lastRunAt !== null)) throw new Error('零次运行不得保留运行证据');
  const hasCurrentRunEvidence = source.lastRun !== null || lastTrace.length > 0 || lastRunAt !== null;
  if (totalRuns > 0 && hasCurrentRunEvidence
    && (source.lastRun === null || lastTrace.length === 0 || lastRunAt === null)) throw new Error('运行证据不完整');
  let lastRun: AdvancedWeekOneRunResult | null = null;
  if (source.lastRun !== null) {
    const canonical = runAdvancedWeekOne(missionId, lastTrace);
    if (!same(source.lastRun, canonical)) throw new Error('lastRun必须由lastTrace确定性重放');
    lastRun = canonical;
  }
  const allowedEffects: EquipmentEffect[] = missionId === 'w1-m4'
    ? ['decomposition-view', 'accepted-prefix-playback', 'repeat-problem-navigation']
    : ['weight-reference', 'decomposition-view', 'accepted-prefix-playback', 'repeat-problem-navigation'];
  const equipmentEffectsUsed = source.equipmentEffectsUsed ?? [];
  if (!Array.isArray(equipmentEffectsUsed)
    || equipmentEffectsUsed.some((effect) => typeof effect !== 'string' || !allowedEffects.includes(effect as EquipmentEffect))
    || new Set(equipmentEffectsUsed).size !== equipmentEffectsUsed.length) throw new Error('装备效果使用证据无效');
  return { workspace: parsedWorkspace, lastTrace, lastRun, totalRuns, runtimeFailures, compileFailures, usedHintTiers: source.usedHintTiers as AdvancedWeekOneMissionSession['usedHintTiers'], conceptFailures, equipmentEffectsUsed: equipmentEffectsUsed as EquipmentEffect[], lastRunAt, savedAt: date(source.savedAt, 'savedAt') };
}
