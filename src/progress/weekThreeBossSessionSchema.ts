import {
  WEEK_THREE_BOSS_MISSION_ID,
  WEEK_THREE_BOSS_COORDINATE_LIMIT,
  createDefaultWeekThreeBossDraft,
  runWeekThreeBossDraft,
  type WeekThreeBossConcept,
  type WeekThreeBossRunResult,
  type WeekThreeBossWorkspaceDraftV1,
} from '../blockly/weekThreeBossContract';
import { compileWeekThreeBossDraft } from '../blockly/weekThreeBossCompiler';
import type { MissionSession, WeekThreeBossMissionSession } from './types';

const object = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(`${field}必须是普通对象`);
  return value as Record<string, unknown>;
};
const exact = (value: Record<string, unknown>, keys: readonly string[], field: string) => {
  if (Object.keys(value).length !== keys.length || keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) throw new Error(`${field}字段无效`);
};
const date = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || Number.isNaN(new Date(value).getTime()) || new Date(value).toISOString() !== value) throw new Error(`${field}必须是ISO日期`);
  return value;
};
const count = (value: unknown, field: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 1_000_000) throw new Error(`${field}必须是范围内的非负安全整数`);
  return value as number;
};
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const ref = (value: unknown) => value === null || (typeof value === 'string' && value.length > 0 && value.length <= 128);

export function parseWeekThreeBossWorkspace(value: unknown, field = 'sessions.w3-m5.workspace'): WeekThreeBossWorkspaceDraftV1 {
  const source = object(value, field); exact(source, ['version', 'missionId', 'blocks'], field);
  if (source.version !== 1 || source.missionId !== WEEK_THREE_BOSS_MISSION_ID || !Array.isArray(source.blocks) || source.blocks.length < 1 || source.blocks.length > 128) throw new Error(`${field}无效`);
  const blocks = source.blocks.map((item, index) => {
    const block = object(item, `${field}.blocks[${index}]`);
    exact(block, ['id', 'type', 'fields', 'inputs', 'parentBlockId', 'parentInputName', 'previousId', 'nextId', 'x', 'y'], `${field}.blocks[${index}]`);
    const strings = (value: unknown) => {
      const source = object(value, `${field}.blocks[${index}]字段`);
      if (Object.keys(source).length > 16 || Object.entries(source).some(([key, item]) => !key || key.length > 64 || typeof item !== 'string' || !item || item.length > 128)) throw new Error(`${field}积木字段无效`);
      return source as Record<string, string>;
    };
    const inputs = object(block.inputs, `${field}.blocks[${index}].inputs`);
    if (Object.keys(inputs).length > 16 || Object.entries(inputs).some(([key, item]) => !key || key.length > 64 || !ref(item))) throw new Error(`${field}积木输入无效`);
    if (typeof block.id !== 'string' || !block.id || block.id.length > 128 || typeof block.type !== 'string' || !ref(block.parentBlockId) || !ref(block.parentInputName) || !ref(block.previousId) || !ref(block.nextId) || typeof block.x !== 'number' || !Number.isFinite(block.x) || typeof block.y !== 'number' || !Number.isFinite(block.y)) throw new Error(`${field}积木无效`);
    return { id: block.id, type: block.type, fields: strings(block.fields), inputs: inputs as Record<string, string | null>, parentBlockId: block.parentBlockId, parentInputName: block.parentInputName, previousId: block.previousId, nextId: block.nextId, x: Math.max(-WEEK_THREE_BOSS_COORDINATE_LIMIT, Math.min(WEEK_THREE_BOSS_COORDINATE_LIMIT, block.x)), y: Math.max(-WEEK_THREE_BOSS_COORDINATE_LIMIT, Math.min(WEEK_THREE_BOSS_COORDINATE_LIMIT, block.y)) };
  });
  const parsed = { version: 1 as const, missionId: WEEK_THREE_BOSS_MISSION_ID, blocks } as unknown as WeekThreeBossWorkspaceDraftV1;
  const compiled = compileWeekThreeBossDraft(parsed);
  if (!compiled.ok) throw new Error(`${field}结构无效`);
  return compiled.draft;
}

function uses(value: unknown): WeekThreeBossMissionSession['conditionObservationUses'] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error('sessions.w3-m5.conditionObservationUses无效');
  const seen = new Set<string>();
  return value.map((entry, index) => {
    const use = object(entry, `sessions.w3-m5.conditionObservationUses[${index}]`); exact(use, ['snapshotId', 'usedAt', 'workspace'], `sessions.w3-m5.conditionObservationUses[${index}]`);
    if (typeof use.snapshotId !== 'string' || !use.snapshotId || use.snapshotId.length > 256 || seen.has(use.snapshotId)) throw new Error('sessions.w3-m5.conditionObservationUses快照无效');
    seen.add(use.snapshotId);
    const workspace = parseWeekThreeBossWorkspace(use.workspace, `sessions.w3-m5.conditionObservationUses[${index}].workspace`);
    const replay = runWeekThreeBossDraft(workspace);
    if (replay.completed || replay.failure?.snapshotId !== use.snapshotId) throw new Error('sessions.w3-m5.conditionObservationUses必须对应可重放失败快照');
    return { snapshotId: use.snapshotId, usedAt: date(use.usedAt, `sessions.w3-m5.conditionObservationUses[${index}].usedAt`), workspace };
  });
}

export function parseWeekThreeBossSession(value: unknown): WeekThreeBossMissionSession {
  const source = object(value, 'sessions.w3-m5');
  exact(source, ['workspace', 'lastTrace', 'lastRun', 'totalRuns', 'successfulFullRuns', 'runtimeFailures', 'compileFailures', 'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt', 'failureSnapshot', 'firstBlockingConcept', 'conditionObservationUses'], 'sessions.w3-m5');
  const workspace = parseWeekThreeBossWorkspace(source.workspace);
  const compiled = compileWeekThreeBossDraft(workspace); if (!compiled.ok) throw new Error('sessions.w3-m5.workspace结构无效');
  if (!Array.isArray(source.lastTrace) || (source.lastTrace.length > 0 && !same(source.lastTrace, compiled.trace))) throw new Error('sessions.w3-m5.lastTrace必须由workspace重新编译');
  if (!Array.isArray(source.usedHintTiers) || source.usedHintTiers.some((tier) => tier !== 'observe' && tier !== 'think' && tier !== 'partial') || new Set(source.usedHintTiers).size !== source.usedHintTiers.length) throw new Error('sessions.w3-m5.usedHintTiers无效');
  const totalRuns = count(source.totalRuns, 'sessions.w3-m5.totalRuns'); const successfulFullRuns = count(source.successfulFullRuns, 'sessions.w3-m5.successfulFullRuns'); const runtimeFailures = count(source.runtimeFailures, 'sessions.w3-m5.runtimeFailures'); const compileFailures = count(source.compileFailures, 'sessions.w3-m5.compileFailures');
  const rawFailures = object(source.conceptFailures, 'sessions.w3-m5.conceptFailures'); exact(rawFailures, ['programStructure', 'manorHelpSpecificity', 'disguiseIdentity', 'yunzhanBranch', 'joiningOperator'], 'sessions.w3-m5.conceptFailures');
  const conceptFailures = { programStructure: count(rawFailures.programStructure, 'programStructure'), manorHelpSpecificity: count(rawFailures.manorHelpSpecificity, 'manorHelpSpecificity'), disguiseIdentity: count(rawFailures.disguiseIdentity, 'disguiseIdentity'), yunzhanBranch: count(rawFailures.yunzhanBranch, 'yunzhanBranch'), joiningOperator: count(rawFailures.joiningOperator, 'joiningOperator') };
  const firstBlockingConcept = source.firstBlockingConcept === null ? null : source.firstBlockingConcept;
  if (firstBlockingConcept !== null && !['manor-help-specificity', 'disguise-identity', 'yunzhan-branch', 'joining-operator'].includes(firstBlockingConcept as string)) throw new Error('sessions.w3-m5.firstBlockingConcept无效');
  if (compileFailures !== conceptFailures.programStructure || runtimeFailures !== conceptFailures.manorHelpSpecificity + conceptFailures.disguiseIdentity + conceptFailures.yunzhanBranch + conceptFailures.joiningOperator || runtimeFailures > totalRuns || successfulFullRuns > totalRuns - runtimeFailures) throw new Error('sessions.w3-m5累计失败证据不一致');
  const observationUses = uses(source.conditionObservationUses); if (runtimeFailures < observationUses.length) throw new Error('sessions.w3-m5观察记录必须对应已记录运行失败');
  const savedAt = date(source.savedAt, 'sessions.w3-m5.savedAt'); if (observationUses.some((use) => use.usedAt > savedAt)) throw new Error('sessions.w3-m5观察时间无效');
  if ((runtimeFailures === 0) !== (firstBlockingConcept === null)) throw new Error('sessions.w3-m5.firstBlockingConcept与运行记录不一致');
  const base = { workspace, totalRuns, successfulFullRuns, runtimeFailures, compileFailures, usedHintTiers: [...source.usedHintTiers] as MissionSession['usedHintTiers'], conceptFailures, firstBlockingConcept: firstBlockingConcept as WeekThreeBossConcept | null, savedAt, conditionObservationUses: observationUses };
  if (totalRuns === 0) {
    if (source.lastRun !== null || source.lastTrace.length !== 0 || source.lastRunAt !== null || source.failureSnapshot !== null || observationUses.length !== 0) throw new Error('sessions.w3-m5零次运行不得有运行证据');
    return { ...base, lastTrace: [], lastRun: null, lastRunAt: null, failureSnapshot: null };
  }
  const cleared = source.lastRun === null && source.lastTrace.length === 0 && source.lastRunAt === null && source.failureSnapshot === null;
  if (cleared) return { ...base, lastTrace: [], lastRun: null, lastRunAt: null, failureSnapshot: null };
  const lastRunAt = date(source.lastRunAt, 'sessions.w3-m5.lastRunAt'); const run = runWeekThreeBossDraft(workspace);
  if (source.lastRun === null || source.lastTrace.length !== compiled.trace.length || lastRunAt > savedAt || !same(source.lastTrace, compiled.trace) || !same(source.lastRun, run) || !same(source.failureSnapshot, run.failure)) throw new Error('sessions.w3-m5运行必须由workspace重新编译并确定性重放');
  return { ...base, lastTrace: structuredClone(compiled.trace), lastRun: structuredClone(run), lastRunAt, failureSnapshot: structuredClone(run.failure) };
}

// Backward-compatible test helpers; runtime code uses the unified session API.
export function createWeekThreeBossSession(now: string): WeekThreeBossMissionSession {
  return { workspace: createDefaultWeekThreeBossDraft(), lastTrace: [], lastRun: null, totalRuns: 0, successfulFullRuns: 0, runtimeFailures: 0, compileFailures: 0, usedHintTiers: [], conceptFailures: { programStructure: 0, manorHelpSpecificity: 0, disguiseIdentity: 0, yunzhanBranch: 0, joiningOperator: 0 }, lastRunAt: null, savedAt: now, failureSnapshot: null, firstBlockingConcept: null, conditionObservationUses: [] };
}
export function recordWeekThreeBossRun(session: WeekThreeBossMissionSession, run: WeekThreeBossRunResult, now: string): WeekThreeBossMissionSession {
  const next = structuredClone(session); next.totalRuns += 1; next.lastTrace = structuredClone(run.trace); next.lastRun = structuredClone(run); next.failureSnapshot = structuredClone(run.failure); next.lastRunAt = now; next.savedAt = now;
  if (run.completed) next.successfulFullRuns += 1;
  else { next.runtimeFailures += 1; if (next.firstBlockingConcept === null) next.firstBlockingConcept = run.failure!.concept; const field = run.failure?.concept === 'manor-help-specificity' ? 'manorHelpSpecificity' : run.failure?.concept === 'disguise-identity' ? 'disguiseIdentity' : run.failure?.concept === 'yunzhan-branch' ? 'yunzhanBranch' : 'joiningOperator'; next.conceptFailures[field] += 1; }
  return next;
}
