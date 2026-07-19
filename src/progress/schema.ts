import { allMissions } from '../course/course';
import type { DragonBlockType } from '../blockly/dragonPalaceBlocks';
import type { RuyiBlockType } from '../blockly/ruyiStaffBlocks';
import { isFourSeasBlockType, isFourSeasChildBlockType, type FourSeasBlockType } from '../blockly/fourSeasRegaliaBlocks';
import {
  findFourSeasWorkspaceBoundaryViolation,
  FOUR_SEAS_WORKSPACE_LIMITS,
  type FourSeasWorkspaceDraftV1,
} from '../blockly/fourSeasRegaliaDraft';
import { runDragonPalaceBattle } from '../battle/dragonPalace';
import { runRuyiStaffBattle } from '../battle/ruyiStaff';
import { runFourSeasRegalia } from '../battle/fourSeasRegalia';
import type {
  BattleDiagnostic,
  BattleEvent,
  BattleInstruction,
  BattleRunResult,
  DragonPalaceInstruction,
  DragonPalaceOpcode,
  DragonPalaceState,
  FourSeasBattleDiagnostic,
  FourSeasBattleEvent,
  FourSeasBattleRunResult,
  FourSeasInstruction,
  FourSeasOpcode,
  FourSeasState,
  RuyiStaffBattleDiagnostic,
  RuyiStaffBattleEvent,
  RuyiStaffBattleRunResult,
  RuyiStaffInstruction,
  RuyiStaffOpcode,
  RuyiStaffState,
} from '../battle/types';
import type { WorkspaceDraftV1 } from '../blockly/draft';
import type { RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft';
import { isValidParentAccessRecord } from './parentAccess';
import type {
  MissionProgress,
  MissionSession,
  MissionSessions,
  DragonPalaceMissionSession,
  FourSeasRegaliaMissionSession,
  RuyiStaffMissionSession,
  ProgressSettings,
  ProgressV1,
  ProgressV2,
  ProgressV3,
} from './types';

const INSTRUCTION_ID_PREFIX = 'instruction:';
const MAX_BLOCK_OR_SOURCE_ID_LENGTH = FOUR_SEAS_WORKSPACE_LIMITS.maxBlockOrSourceIdLength;

export const PROGRESS_SCHEMA_LIMITS = {
  maxRawJsonBytes: 1024 * 1024,
  maxWorkspaceBlocks: FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks,
  maxTraceInstructions: FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks,
  maxBattleEvents: FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks * 2 + 2,
  maxBlockOrSourceIdLength: MAX_BLOCK_OR_SOURCE_ID_LENGTH,
  maxInstructionIdLength: INSTRUCTION_ID_PREFIX.length + MAX_BLOCK_OR_SOURCE_ID_LENGTH,
  maxMessageCodeLength: 256,
} as const;

const utf8Encoder = new TextEncoder();

export const createInitialProgress = (): ProgressV3 => ({
  version: 3,
  schemaRevision: 1,
  learnerName: '小行者',
  missions: {},
  settings: { muted: false, reducedMotion: false, reducedMotionOverride: false, parentPin: 'unset' },
  privacy: { localDataNoticeSeen: false },
  recovery: { lastRecoveredAt: null, source: null },
  sessions: {},
  savedAt: new Date(0).toISOString(),
});

const missionIds = new Set(allMissions.map((mission) => mission.id));
const dragonBlockTypes = new Set<DragonBlockType>([
  'xiyou_enter_palace', 'xiyou_request_weapon', 'xiyou_test_weapon',
]);
const dragonStates = new Set<DragonPalaceState>([
  'outside-palace', 'entered-palace', 'weapon-requested', 'weapon-tested',
]);
const eventTypes = new Set<BattleEvent['type']>([
  'run-started', 'instruction-accepted', 'instruction-rejected', 'state-changed', 'run-finished',
]);
const ruyiBlockTypes = new Set<RuyiBlockType>([
  'xiyou_inspect_weights', 'xiyou_choose_sabre', 'xiyou_choose_halberd',
  'xiyou_choose_ruyi_staff', 'xiyou_shrink_ruyi_staff',
]);
const ruyiStates = new Set<RuyiStaffState>([
  'awaiting-inspection', 'weights-inspected', 'wrong-weapon-selected',
  'ruyi-staff-selected', 'ruyi-staff-shrunk',
]);
const ruyiEventTypes = new Set<RuyiStaffBattleEvent['type']>([
  'run-started', 'instruction-accepted', 'instruction-rejected', 'state-changed', 'run-finished',
]);
const fourSeasStates = new Set<FourSeasState>([
  'awaiting-request', 'regalia-requested', 'collecting-gifts', 'cloud-boots-received',
  'golden-armor-received', 'all-gifts-received', 'equipping-regalia', 'crown-equipped',
  'armor-equipped', 'regalia-equipped', 'regalia-verified',
]);
const fourSeasOpcodes = new Set<FourSeasOpcode>([
  'request_regalia', 'collect_gifts', 'receive_cloud_boots', 'receive_golden_armor',
  'receive_purple_crown', 'equip_regalia', 'wear_crown', 'wear_armor', 'wear_boots',
  'verify_regalia',
]);
const fourSeasOpcodePlacement = {
  request_regalia: 'top',
  collect_gifts: 'top',
  receive_cloud_boots: 'child',
  receive_golden_armor: 'child',
  receive_purple_crown: 'child',
  equip_regalia: 'top',
  wear_crown: 'child',
  wear_armor: 'child',
  wear_boots: 'child',
  verify_regalia: 'top',
} as const satisfies Record<FourSeasOpcode, 'top' | 'child'>;
const fourSeasEventTypes = new Set<FourSeasBattleEvent['type']>([
  'run-started', 'instruction-accepted', 'instruction-rejected', 'state-changed', 'run-finished',
]);
const hintTiers = new Set<MissionSession['usedHintTiers'][number]>(['observe', 'think', 'partial']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && Object.getPrototypeOf(value) === Object.prototype;
}

function deeplyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => deeplyEqual(item, right[index]));
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key)
      && deeplyEqual(left[key], right[key]));
}

function invalid(detail: string): never {
  throw new Error(`进度文件格式无效：${detail}`);
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!isPlainObject(value)) invalid(`${field}必须是对象`);
  return value;
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${field}必须是数组`);
  return value;
}

function boundedArray(value: unknown, field: string, maximum: number): unknown[] {
  const result = array(value, field);
  if (result.length > maximum) invalid(`${field}最多${maximum}项`);
  return result;
}

function exactKeys(value: Record<string, unknown>, field: string, allowed: readonly string[]): void {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) invalid(`${field}包含未知字段 ${unexpected}`);
  const missing = allowed.find((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing) invalid(`${field}缺少字段 ${missing}`);
}

function string(value: unknown, field: string): string {
  if (typeof value !== 'string') invalid(`${field}必须是文本`);
  return value;
}

function boundedString(value: unknown, field: string, maximum: number): string {
  const result = string(value, field);
  if (result.length > maximum) invalid(`${field}最多${maximum}个字符`);
  return result;
}

function nonEmptyBoundedString(value: unknown, field: string, maximum: number): string {
  const result = boundedString(value, field, maximum);
  if (result.length === 0) invalid(`${field}不能为空`);
  return result;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') invalid(`${field}必须是布尔值`);
  return value;
}

function date(value: unknown, field: string): string {
  const result = string(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result)) {
    invalid(`${field}必须是有效ISO UTC日期`);
  }
  const parsed = new Date(result);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== result) {
    invalid(`${field}必须是有效ISO UTC日期`);
  }
  return result;
}

function nullableDate(value: unknown, field: string): string | null {
  return value === null ? null : date(value, field);
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    invalid(`${field}必须是非负整数`);
  }
  return value;
}

function coordinate(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    invalid(`${field}必须是安全的有限坐标`);
  }
  return value;
}

function pin(value: unknown): string {
  const result = string(value, 'settings.parentPin');
  if (!isValidParentAccessRecord(result)) invalid('settings.parentPin不是有效的家长访问记录');
  return result === '2580' ? 'unset' : result;
}

function state(value: unknown, field: string): DragonPalaceState {
  if (typeof value !== 'string' || !dragonStates.has(value as DragonPalaceState)) invalid(`${field}状态无效`);
  return value as DragonPalaceState;
}

function opcode(value: unknown, field: string): DragonPalaceOpcode {
  if (value !== 'enter_palace' && value !== 'request_weapon' && value !== 'test_weapon') {
    invalid(`${field}操作码无效`);
  }
  return value;
}

function ruyiState(value: unknown, field: string): RuyiStaffState {
  if (typeof value !== 'string' || !ruyiStates.has(value as RuyiStaffState)) {
    invalid(`${field}状态无效`);
  }
  return value as RuyiStaffState;
}

function ruyiOpcode(value: unknown, field: string): RuyiStaffOpcode {
  if (
    value !== 'inspect_weights'
    && value !== 'choose_sabre'
    && value !== 'choose_halberd'
    && value !== 'choose_ruyi_staff'
    && value !== 'shrink_ruyi_staff'
  ) {
    invalid(`${field}操作码无效`);
  }
  return value;
}

function missions(value: unknown): Record<string, MissionProgress> {
  const source = object(value, 'missions');
  const result: Record<string, MissionProgress> = {};
  for (const [missionId, rawMission] of Object.entries(source)) {
    if (!missionIds.has(missionId)) invalid(`未知任务 ${missionId}`);
    const mission = object(rawMission, `missions.${missionId}`);
    exactKeys(mission, `missions.${missionId}`, ['status', 'stars', 'attempts', 'hintsUsed', 'completedAt']);
    if (mission.status !== 'completed') invalid(`missions.${missionId}.status必须为completed`);
    if (mission.stars !== 1 && mission.stars !== 2 && mission.stars !== 3) {
      invalid(`missions.${missionId}.stars必须是1至3`);
    }
    result[missionId] = {
      status: 'completed',
      stars: mission.stars,
      attempts: nonNegativeInteger(mission.attempts, `missions.${missionId}.attempts`),
      hintsUsed: nonNegativeInteger(mission.hintsUsed, `missions.${missionId}.hintsUsed`),
      completedAt: date(mission.completedAt, `missions.${missionId}.completedAt`),
    };
  }
  return result;
}

function settings(value: unknown, isCurrent: boolean): ProgressSettings {
  const source = object(value, 'settings');
  exactKeys(
    source,
    'settings',
    isCurrent
      ? ['muted', 'reducedMotion', 'reducedMotionOverride', 'parentPin']
      : ['muted', 'reducedMotion', 'parentPin'],
  );
  return {
    muted: boolean(source.muted, 'settings.muted'),
    reducedMotion: boolean(source.reducedMotion, 'settings.reducedMotion'),
    reducedMotionOverride: isCurrent
      ? boolean(source.reducedMotionOverride, 'settings.reducedMotionOverride')
      : false,
    parentPin: pin(source.parentPin),
  };
}

function common(source: Record<string, unknown>, isCurrent: boolean) {
  return {
    learnerName: string(source.learnerName, 'learnerName'),
    missions: missions(source.missions),
    settings: settings(source.settings, isCurrent),
    savedAt: date(source.savedAt, 'savedAt'),
  };
}

function privacyAndRecovery(source: Record<string, unknown>) {
  const privacy = object(source.privacy, 'privacy');
  const recovery = object(source.recovery, 'recovery');
  exactKeys(privacy, 'privacy', ['localDataNoticeSeen']);
  exactKeys(recovery, 'recovery', ['lastRecoveredAt', 'source']);
  const recoverySource = recovery.source;
  if (recoverySource !== null && recoverySource !== 'snapshot' && recoverySource !== 'initial') {
    invalid('recovery.source无效');
  }
  const parsedRecoverySource = recoverySource as 'snapshot' | 'initial' | null;
  return {
    privacy: { localDataNoticeSeen: boolean(privacy.localDataNoticeSeen, 'privacy.localDataNoticeSeen') },
    recovery: {
      lastRecoveredAt: nullableDate(recovery.lastRecoveredAt, 'recovery.lastRecoveredAt'),
      source: parsedRecoverySource,
    },
  };
}

function parseV1(source: Record<string, unknown>): ProgressV1 {
  exactKeys(source, '顶层', ['version', 'learnerName', 'missions', 'settings', 'savedAt']);
  const parsed = common(source, false);
  const { reducedMotionOverride: _removed, ...legacySettings } = parsed.settings;
  return { version: 1, ...parsed, settings: legacySettings };
}

function parseV2(source: Record<string, unknown>): ProgressV2 {
  exactKeys(source, '顶层', [
    'version', 'schemaRevision', 'learnerName', 'missions', 'settings', 'privacy', 'recovery', 'savedAt',
  ]);
  if (source.schemaRevision !== 1) invalid('schemaRevision必须是1');
  return {
    version: 2,
    schemaRevision: 1,
    ...common(source, true),
    ...privacyAndRecovery(source),
  };
}

function workspace(value: unknown, field: string): WorkspaceDraftV1 {
  const source = object(value, field);
  exactKeys(source, field, ['version', 'blocks']);
  if (source.version !== 1) invalid(`${field}.version必须是1`);
  const blocks = boundedArray(
    source.blocks,
    `${field}.blocks`,
    PROGRESS_SCHEMA_LIMITS.maxWorkspaceBlocks,
  ).map((rawBlock, index) => {
    const blockField = `${field}.blocks[${index}]`;
    const block = object(rawBlock, blockField);
    exactKeys(block, blockField, ['id', 'type', 'nextId', 'x', 'y']);
    const id = nonEmptyBoundedString(
      block.id,
      `${blockField}.id`,
      PROGRESS_SCHEMA_LIMITS.maxBlockOrSourceIdLength,
    );
    if (typeof block.type !== 'string' || !dragonBlockTypes.has(block.type as DragonBlockType)) {
      invalid(`${blockField}.type不是已知workspace积木`);
    }
    const nextId = block.nextId === null
      ? null
      : nonEmptyBoundedString(
        block.nextId,
        `${blockField}.nextId`,
        PROGRESS_SCHEMA_LIMITS.maxBlockOrSourceIdLength,
      );
    return {
      id,
      type: block.type as DragonBlockType,
      nextId,
      x: coordinate(block.x, `${blockField}.x`),
      y: coordinate(block.y, `${blockField}.y`),
    };
  });

  const ids = new Set<string>();
  for (const block of blocks) {
    if (ids.has(block.id)) invalid(`${field}包含重复block id ${block.id}`);
    ids.add(block.id);
  }
  const predecessors = new Set<string>();
  const incomingEdges = new Map([...ids].map((id) => [id, 0]));
  for (const block of blocks) {
    if (block.nextId === null) continue;
    if (!ids.has(block.nextId)) invalid(`${field}包含未知nextId ${block.nextId}`);
    if (block.nextId === block.id) invalid(`${field}包含自环 ${block.id}`);
    if (predecessors.has(block.nextId)) invalid(`${field}中的 ${block.nextId} 有多个前驱`);
    predecessors.add(block.nextId);
    incomingEdges.set(block.nextId, 1);
  }
  const nextById = new Map(blocks.map((block) => [block.id, block.nextId]));
  const queue = blocks.filter((block) => incomingEdges.get(block.id) === 0).map((block) => block.id);
  let visited = 0;
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    visited += 1;
    const next = nextById.get(current) ?? null;
    if (next === null) continue;
    incomingEdges.set(next, (incomingEdges.get(next) ?? 0) - 1);
    if (incomingEdges.get(next) === 0) queue.push(next);
  }
  if (visited !== blocks.length) invalid(`${field}包含cycle`);
  return { version: 1, blocks };
}

function ruyiWorkspace(value: unknown, field: string): RuyiWorkspaceDraftV1 {
  const source = object(value, field);
  exactKeys(source, field, ['version', 'blocks']);
  if (source.version !== 1) invalid(`${field}.version必须是1`);
  const blocks = boundedArray(
    source.blocks,
    `${field}.blocks`,
    PROGRESS_SCHEMA_LIMITS.maxWorkspaceBlocks,
  ).map((rawBlock, index) => {
    const blockField = `${field}.blocks[${index}]`;
    const block = object(rawBlock, blockField);
    exactKeys(block, blockField, ['id', 'type', 'nextId', 'x', 'y']);
    const id = nonEmptyBoundedString(
      block.id,
      `${blockField}.id`,
      PROGRESS_SCHEMA_LIMITS.maxBlockOrSourceIdLength,
    );
    if (typeof block.type !== 'string' || !ruyiBlockTypes.has(block.type as RuyiBlockType)) {
      invalid(`${blockField}.type不是已知workspace积木`);
    }
    const nextId = block.nextId === null
      ? null
      : nonEmptyBoundedString(
        block.nextId,
        `${blockField}.nextId`,
        PROGRESS_SCHEMA_LIMITS.maxBlockOrSourceIdLength,
      );
    return {
      id,
      type: block.type as RuyiBlockType,
      nextId,
      x: coordinate(block.x, `${blockField}.x`),
      y: coordinate(block.y, `${blockField}.y`),
    };
  });

  const ids = new Set<string>();
  for (const block of blocks) {
    if (ids.has(block.id)) invalid(`${field}包含重复block id ${block.id}`);
    ids.add(block.id);
  }
  const predecessors = new Set<string>();
  const incomingEdges = new Map([...ids].map((id) => [id, 0]));
  for (const block of blocks) {
    if (block.nextId === null) continue;
    if (!ids.has(block.nextId)) invalid(`${field}包含未知nextId ${block.nextId}`);
    if (block.nextId === block.id) invalid(`${field}包含自环 ${block.id}`);
    if (predecessors.has(block.nextId)) invalid(`${field}中的 ${block.nextId} 有多个前驱`);
    predecessors.add(block.nextId);
    incomingEdges.set(block.nextId, 1);
  }
  const nextById = new Map(blocks.map((block) => [block.id, block.nextId]));
  const queue = blocks.filter((block) => incomingEdges.get(block.id) === 0).map((block) => block.id);
  let visited = 0;
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    visited += 1;
    const next = nextById.get(current) ?? null;
    if (next === null) continue;
    incomingEdges.set(next, (incomingEdges.get(next) ?? 0) - 1);
    if (incomingEdges.get(next) === 0) queue.push(next);
  }
  if (visited !== blocks.length) invalid(`${field}包含cycle`);
  return { version: 1, blocks };
}

function fourSeasWorkspace(value: unknown, field: string): FourSeasWorkspaceDraftV1 {
  const source = object(value, field);
  exactKeys(source, field, ['version', 'blocks']);
  if (source.version !== 1) invalid(`${field}.version必须是1`);
  const rawBlocks = boundedArray(
    source.blocks,
    `${field}.blocks`,
    FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks,
  );
  const boundaryViolation = findFourSeasWorkspaceBoundaryViolation(
    rawBlocks.map((item) => {
      const block = object(item, `${field}.blocks`);
      return { id: block.id, x: block.x, y: block.y };
    }),
  );
  if (boundaryViolation?.reason === 'block-id') {
    invalid(`${field}.blocks.id最多${FOUR_SEAS_WORKSPACE_LIMITS.maxBlockOrSourceIdLength}个字符`);
  }
  if (boundaryViolation?.reason === 'coordinate') invalid(`${field}.blocks必须是安全的有限坐标`);

  const blocks = rawBlocks.map((rawBlock, index) => {
    const blockField = `${field}.blocks[${index}]`;
    const block = object(rawBlock, blockField);
    exactKeys(block, blockField, ['id', 'type', 'nextId', 'parentBlockId', 'x', 'y']);
    const id = nonEmptyBoundedString(
      block.id,
      `${blockField}.id`,
      FOUR_SEAS_WORKSPACE_LIMITS.maxBlockOrSourceIdLength,
    );
    if (typeof block.type !== 'string' || !isFourSeasBlockType(block.type)) {
      invalid(`${blockField}.type不是已知workspace积木`);
    }
    const nextId = block.nextId === null ? null : nonEmptyBoundedString(
      block.nextId,
      `${blockField}.nextId`,
      FOUR_SEAS_WORKSPACE_LIMITS.maxBlockOrSourceIdLength,
    );
    const parentBlockId = block.parentBlockId === null ? null : nonEmptyBoundedString(
      block.parentBlockId,
      `${blockField}.parentBlockId`,
      FOUR_SEAS_WORKSPACE_LIMITS.maxBlockOrSourceIdLength,
    );
    return {
      id,
      type: block.type as FourSeasBlockType,
      nextId,
      parentBlockId,
      x: coordinate(block.x, `${blockField}.x`),
      y: coordinate(block.y, `${blockField}.y`),
    };
  });

  const byId = new Map<string, FourSeasWorkspaceDraftV1['blocks'][number]>();
  for (const block of blocks) {
    if (byId.has(block.id)) invalid(`${field}包含重复block id ${block.id}`);
    byId.set(block.id, block);
  }
  const predecessors = new Set<string>();
  for (const block of blocks) {
    if (isFourSeasChildBlockType(block.type)) {
      if (block.parentBlockId === null) invalid(`${field}子积木 ${block.id}缺少parentBlockId`);
      const parent = byId.get(block.parentBlockId);
      if (!parent) invalid(`${field}包含未知parentBlockId ${block.parentBlockId}`);
      if (parent.type !== 'xiyou_collect_gifts' && parent.type !== 'xiyou_equip_regalia') {
        invalid(`${field}积木 ${block.id}的容器类型无效`);
      }
    } else if (block.parentBlockId !== null) {
      invalid(`${field}顶层积木 ${block.id}不得有parentBlockId`);
    }
    if (block.nextId === null) continue;
    const next = byId.get(block.nextId);
    if (!next) invalid(`${field}包含未知nextId ${block.nextId}`);
    if (block.nextId === block.id) invalid(`${field}包含自环 ${block.id}`);
    if (next.parentBlockId !== block.parentBlockId) invalid(`${field}包含跨容器nextId ${block.nextId}`);
    if (predecessors.has(block.nextId)) invalid(`${field}中的 ${block.nextId} 有多个前驱`);
    predecessors.add(block.nextId);
  }

  const scopes = new Map<string | null, string[]>();
  for (const block of blocks) {
    const ids = scopes.get(block.parentBlockId) ?? [];
    ids.push(block.id);
    scopes.set(block.parentBlockId, ids);
  }
  for (const [parentBlockId, ids] of scopes) {
    if (ids.filter((id) => !predecessors.has(id)).length !== 1) {
      invalid(`${field}容器 ${String(parentBlockId)}必须恰有一个链头`);
    }
  }
  for (const start of byId.keys()) {
    const path = new Set<string>();
    let current: string | null = start;
    while (current !== null) {
      if (path.has(current)) invalid(`${field}包含cycle ${current}`);
      path.add(current);
      current = byId.get(current)?.nextId ?? null;
    }
  }
  return { version: 1, blocks };
}

function instruction(value: unknown, field: string): DragonPalaceInstruction {
  const source = object(value, field);
  exactKeys(source, field, ['instructionId', 'sourceBlockId', 'opcode']);
  const sourceBlockId = nonEmptyBoundedString(
    source.sourceBlockId,
    `${field}.sourceBlockId`,
    PROGRESS_SCHEMA_LIMITS.maxBlockOrSourceIdLength,
  );
  const instructionId = nonEmptyBoundedString(
    source.instructionId,
    `${field}.instructionId`,
    PROGRESS_SCHEMA_LIMITS.maxInstructionIdLength,
  );
  if (instructionId !== `${INSTRUCTION_ID_PREFIX}${sourceBlockId}`) {
    invalid(`${field}.instructionId必须由sourceBlockId派生`);
  }
  return { instructionId, sourceBlockId, opcode: opcode(source.opcode, `${field}.opcode`) };
}

interface ParsedTrace {
  instructions: DragonPalaceInstruction[];
  provenance: ReadonlyMap<string, DragonPalaceInstruction>;
}

function trace(value: unknown, field: string): ParsedTrace {
  const instructions = boundedArray(
    value,
    field,
    PROGRESS_SCHEMA_LIMITS.maxTraceInstructions,
  ).map((item, index) => instruction(item, `${field}[${index}]`));
  const sourceBlockIds = new Set<string>();
  const provenance = new Map<string, DragonPalaceInstruction>();
  for (const item of instructions) {
    if (sourceBlockIds.has(item.sourceBlockId)) {
      invalid(`${field}包含重复sourceBlockId ${item.sourceBlockId}`);
    }
    if (provenance.has(item.instructionId)) {
      invalid(`${field}包含重复instructionId ${item.instructionId}`);
    }
    sourceBlockIds.add(item.sourceBlockId);
    provenance.set(item.instructionId, item);
  }
  return { instructions, provenance };
}

function ruyiInstruction(value: unknown, field: string): RuyiStaffInstruction {
  const source = object(value, field);
  exactKeys(source, field, ['instructionId', 'sourceBlockId', 'opcode']);
  const sourceBlockId = nonEmptyBoundedString(
    source.sourceBlockId,
    `${field}.sourceBlockId`,
    PROGRESS_SCHEMA_LIMITS.maxBlockOrSourceIdLength,
  );
  const instructionId = nonEmptyBoundedString(
    source.instructionId,
    `${field}.instructionId`,
    PROGRESS_SCHEMA_LIMITS.maxInstructionIdLength,
  );
  if (instructionId !== `${INSTRUCTION_ID_PREFIX}${sourceBlockId}`) {
    invalid(`${field}.instructionId必须由sourceBlockId派生`);
  }
  return { instructionId, sourceBlockId, opcode: ruyiOpcode(source.opcode, `${field}.opcode`) };
}

interface ParsedRuyiTrace {
  instructions: RuyiStaffInstruction[];
  provenance: ReadonlyMap<string, RuyiStaffInstruction>;
}

function ruyiTrace(value: unknown, field: string): ParsedRuyiTrace {
  const instructions = boundedArray(
    value,
    field,
    PROGRESS_SCHEMA_LIMITS.maxTraceInstructions,
  ).map((item, index) => ruyiInstruction(item, `${field}[${index}]`));
  const sourceBlockIds = new Set<string>();
  const provenance = new Map<string, RuyiStaffInstruction>();
  for (const item of instructions) {
    if (sourceBlockIds.has(item.sourceBlockId)) {
      invalid(`${field}包含重复sourceBlockId ${item.sourceBlockId}`);
    }
    if (provenance.has(item.instructionId)) {
      invalid(`${field}包含重复instructionId ${item.instructionId}`);
    }
    sourceBlockIds.add(item.sourceBlockId);
    provenance.set(item.instructionId, item);
  }
  return { instructions, provenance };
}

function sameInstruction(
  candidate: Pick<BattleInstruction, 'instructionId' | 'sourceBlockId' | 'opcode'>,
  item: BattleInstruction,
): boolean {
  return candidate.instructionId === item.instructionId
    && candidate.sourceBlockId === item.sourceBlockId
    && candidate.opcode === item.opcode;
}

function event(
  value: unknown,
  field: string,
  provenance: ReadonlyMap<string, BattleInstruction>,
): BattleEvent {
  const source = object(value, field);
  exactKeys(source, field, ['type', 'state', 'instructionId', 'sourceBlockId', 'opcode', 'messageCode']);
  if (typeof source.type !== 'string' || !eventTypes.has(source.type as BattleEvent['type'])) {
    invalid(`${field}.type无效`);
  }
  const type = source.type as BattleEvent['type'];
  const parsedState = state(source.state, `${field}.state`);
  const messageCode = nonEmptyBoundedString(
    source.messageCode,
    `${field}.messageCode`,
    PROGRESS_SCHEMA_LIMITS.maxMessageCodeLength,
  );
  if (type === 'run-started' || type === 'run-finished') {
    if (source.instructionId !== null || source.sourceBlockId !== null || source.opcode !== null) {
      invalid(`${field}生命周期事件不得携带指令来源`);
    }
    return { type, state: parsedState, instructionId: null, sourceBlockId: null, opcode: null, messageCode };
  }

  const parsedInstruction = instruction({
    instructionId: source.instructionId,
    sourceBlockId: source.sourceBlockId,
    opcode: source.opcode,
  }, field);
  const traceInstruction = provenance.get(parsedInstruction.instructionId);
  if (traceInstruction === undefined || !sameInstruction(parsedInstruction, traceInstruction)) {
    invalid(`${field}的指令来源不在lastTrace中`);
  }
  return { type, state: parsedState, ...parsedInstruction, messageCode };
}

function penalty(value: unknown, field: string): BattleRunResult['penalty'] {
  const source = object(value, field);
  exactKeys(source, field, ['livesLost', 'resourcesLost', 'starsLost']);
  if (source.livesLost !== 0 || source.resourcesLost !== 0 || source.starsLost !== 0) {
    invalid(`${field}三项必须为0`);
  }
  return { livesLost: 0, resourcesLost: 0, starsLost: 0 };
}

function diagnostic(
  value: unknown,
  field: string,
  provenance: ReadonlyMap<string, BattleInstruction>,
  events: readonly BattleEvent[],
): BattleDiagnostic {
  const source = object(value, field);
  if (source.type === 'instruction-rejected') {
    exactKeys(source, field, [
      'type', 'concept', 'state', 'instructionId', 'sourceBlockId', 'opcode', 'messageCode',
    ]);
    if (source.concept !== 'sequence-precondition') invalid(`${field}.concept无效`);
    const parsedInstruction = instruction({
      instructionId: source.instructionId,
      sourceBlockId: source.sourceBlockId,
      opcode: source.opcode,
    }, field);
    const traceInstruction = provenance.get(parsedInstruction.instructionId);
    if (traceInstruction === undefined || !sameInstruction(parsedInstruction, traceInstruction)) {
      invalid(`${field}的指令来源不在lastTrace中`);
    }
    const parsed = {
      type: 'instruction-rejected' as const,
      concept: 'sequence-precondition' as const,
      state: state(source.state, `${field}.state`),
      ...parsedInstruction,
      messageCode: nonEmptyBoundedString(
        source.messageCode,
        `${field}.messageCode`,
        PROGRESS_SCHEMA_LIMITS.maxMessageCodeLength,
      ),
    };
    const matchingEvent = events.some((item) => item.type === 'instruction-rejected'
      && item.state === parsed.state
      && item.messageCode === parsed.messageCode
      && sameInstruction(parsed, item));
    if (!matchingEvent) invalid(`${field}必须对应instruction-rejected事件`);
    return parsed;
  }

  if (source.type === 'program-ended-incomplete') {
    exactKeys(source, field, [
      'type', 'concept', 'state', 'instructionId', 'sourceBlockId', 'opcode', 'messageCode',
    ]);
    if (source.concept !== 'completeness') invalid(`${field}.concept无效`);
    if (source.instructionId !== null || source.opcode !== null) {
      invalid(`${field}不完整诊断的instructionId/opcode必须为null`);
    }
    const sourceBlockId = source.sourceBlockId === null
      ? null
      : nonEmptyBoundedString(
        source.sourceBlockId,
        `${field}.sourceBlockId`,
        PROGRESS_SCHEMA_LIMITS.maxBlockOrSourceIdLength,
      );
    const lastValidSource = [...events].reverse().find((item) => item.type === 'state-changed')?.sourceBlockId ?? null;
    if (sourceBlockId !== lastValidSource) invalid(`${field}.sourceBlockId必须是最后有效指令来源或null`);
    return {
      type: 'program-ended-incomplete',
      concept: 'completeness',
      state: state(source.state, `${field}.state`),
      instructionId: null,
      sourceBlockId,
      opcode: null,
      messageCode: nonEmptyBoundedString(
        source.messageCode,
        `${field}.messageCode`,
        PROGRESS_SCHEMA_LIMITS.maxMessageCodeLength,
      ),
    };
  }
  invalid(`${field}.type无效`);
}

function sameEvent(left: BattleEvent, right: BattleEvent): boolean {
  return left.type === right.type
    && left.state === right.state
    && left.instructionId === right.instructionId
    && left.sourceBlockId === right.sourceBlockId
    && left.opcode === right.opcode
    && left.messageCode === right.messageCode;
}

function sameDiagnostic(left: BattleDiagnostic | null, right: BattleDiagnostic | null): boolean {
  if (left === null || right === null) return left === right;
  return left.type === right.type
    && left.concept === right.concept
    && left.state === right.state
    && left.instructionId === right.instructionId
    && left.sourceBlockId === right.sourceBlockId
    && left.opcode === right.opcode
    && left.messageCode === right.messageCode;
}

function sameRunResult(left: BattleRunResult, right: BattleRunResult): boolean {
  return left.completed === right.completed
    && left.finalState === right.finalState
    && left.events.length === right.events.length
    && left.events.every((item, index) => sameEvent(item, right.events[index]))
    && sameDiagnostic(left.diagnostic, right.diagnostic)
    && left.penalty.livesLost === right.penalty.livesLost
    && left.penalty.resourcesLost === right.penalty.resourcesLost
    && left.penalty.starsLost === right.penalty.starsLost;
}

function verifyCanonicalRunResult(
  parsed: BattleRunResult,
  field: string,
  lastTrace: readonly BattleInstruction[],
): BattleRunResult {
  const canonical = runDragonPalaceBattle(lastTrace);
  if (!sameRunResult(parsed, canonical)) {
    invalid(`${field}与lastTrace确定性运行结果不一致`);
  }
  return parsed;
}

function runResult(value: unknown, field: string, lastTrace: ParsedTrace): BattleRunResult | null {
  if (value === null) return null;
  const source = object(value, field);
  exactKeys(source, field, ['completed', 'finalState', 'events', 'diagnostic', 'penalty']);
  const events = boundedArray(
    source.events,
    `${field}.events`,
    PROGRESS_SCHEMA_LIMITS.maxBattleEvents,
  ).map((item, index) => (
    event(item, `${field}.events[${index}]`, lastTrace.provenance)
  ));
  if (events.length < 2 || events[0].type !== 'run-started' || events.at(-1)?.type !== 'run-finished') {
    invalid(`${field}.events必须以run-started开始并以run-finished结束`);
  }
  if (events[0].state !== 'outside-palace') invalid(`${field}.events起始状态必须是outside-palace`);
  const finalState = state(source.finalState, `${field}.finalState`);
  if (events.at(-1)?.state !== finalState) invalid(`${field}.finalState必须对应结束事件`);
  const parsedPenalty = penalty(source.penalty, `${field}.penalty`);

  if (source.completed === true) {
    if (finalState !== 'weapon-tested') invalid(`${field}完成运行必须到达weapon-tested`);
    if (source.diagnostic !== null) invalid(`${field}完成运行的diagnostic必须为null`);
    if (events.some((item) => item.type === 'instruction-rejected')) {
      invalid(`${field}完成运行不得包含instruction-rejected`);
    }
    return verifyCanonicalRunResult(
      { completed: true, finalState: 'weapon-tested', events, diagnostic: null, penalty: parsedPenalty },
      field,
      lastTrace.instructions,
    );
  }
  if (source.completed !== false) invalid(`${field}.completed必须是布尔值`);
  if (source.diagnostic === null) invalid(`${field}未完成运行必须包含diagnostic`);
  const parsedDiagnostic = diagnostic(
    source.diagnostic,
    `${field}.diagnostic`,
    lastTrace.provenance,
    events,
  );
  if (parsedDiagnostic.state !== finalState) invalid(`${field}.diagnostic.state必须等于finalState`);
  if (parsedDiagnostic.type === 'program-ended-incomplete'
    && events.some((item) => item.type === 'instruction-rejected')) {
    invalid(`${field}不完整运行不得包含instruction-rejected`);
  }
  return verifyCanonicalRunResult(
    { completed: false, finalState, events, diagnostic: parsedDiagnostic, penalty: parsedPenalty },
    field,
    lastTrace.instructions,
  );
}

function ruyiEvent(
  value: unknown,
  field: string,
  provenance: ReadonlyMap<string, RuyiStaffInstruction>,
): RuyiStaffBattleEvent {
  const source = object(value, field);
  exactKeys(source, field, ['type', 'state', 'instructionId', 'sourceBlockId', 'opcode', 'messageCode']);
  if (typeof source.type !== 'string'
    || !ruyiEventTypes.has(source.type as RuyiStaffBattleEvent['type'])) {
    invalid(`${field}.type无效`);
  }
  const type = source.type as RuyiStaffBattleEvent['type'];
  const parsedState = ruyiState(source.state, `${field}.state`);
  const messageCode = nonEmptyBoundedString(
    source.messageCode,
    `${field}.messageCode`,
    PROGRESS_SCHEMA_LIMITS.maxMessageCodeLength,
  );
  if (type === 'run-started' || type === 'run-finished') {
    if (source.instructionId !== null || source.sourceBlockId !== null || source.opcode !== null) {
      invalid(`${field}生命周期事件不得携带指令来源`);
    }
    return {
      type,
      state: parsedState,
      instructionId: null,
      sourceBlockId: null,
      opcode: null,
      messageCode,
    };
  }

  const parsedInstruction = ruyiInstruction({
    instructionId: source.instructionId,
    sourceBlockId: source.sourceBlockId,
    opcode: source.opcode,
  }, field);
  const traceInstruction = provenance.get(parsedInstruction.instructionId);
  if (traceInstruction === undefined || !sameInstruction(parsedInstruction, traceInstruction)) {
    invalid(`${field}的指令来源不在lastTrace中`);
  }
  return { type, state: parsedState, ...parsedInstruction, messageCode };
}

function ruyiDiagnostic(
  value: unknown,
  field: string,
  provenance: ReadonlyMap<string, RuyiStaffInstruction>,
  events: readonly RuyiStaffBattleEvent[],
): RuyiStaffBattleDiagnostic {
  const source = object(value, field);
  if (source.type === 'instruction-rejected') {
    exactKeys(source, field, [
      'type', 'concept', 'state', 'instructionId', 'sourceBlockId', 'opcode', 'messageCode',
    ]);
    if (source.concept !== 'sequence-precondition' && source.concept !== 'wrong-weapon-selection') {
      invalid(`${field}.concept无效`);
    }
    const parsedInstruction = ruyiInstruction({
      instructionId: source.instructionId,
      sourceBlockId: source.sourceBlockId,
      opcode: source.opcode,
    }, field);
    const traceInstruction = provenance.get(parsedInstruction.instructionId);
    if (traceInstruction === undefined || !sameInstruction(parsedInstruction, traceInstruction)) {
      invalid(`${field}的指令来源不在lastTrace中`);
    }
    const parsed: RuyiStaffBattleDiagnostic = {
      type: 'instruction-rejected',
      concept: source.concept,
      state: ruyiState(source.state, `${field}.state`),
      ...parsedInstruction,
      messageCode: nonEmptyBoundedString(
        source.messageCode,
        `${field}.messageCode`,
        PROGRESS_SCHEMA_LIMITS.maxMessageCodeLength,
      ),
    };
    const matchingEvent = events.some((item) => item.type === 'instruction-rejected'
      && item.state === parsed.state
      && item.messageCode === parsed.messageCode
      && sameInstruction(parsed, item));
    if (!matchingEvent) invalid(`${field}必须对应instruction-rejected事件`);
    return parsed;
  }

  if (source.type === 'program-ended-incomplete') {
    exactKeys(source, field, [
      'type', 'concept', 'state', 'instructionId', 'sourceBlockId', 'opcode', 'messageCode',
    ]);
    if (source.concept !== 'completeness') invalid(`${field}.concept无效`);
    if (source.instructionId !== null || source.opcode !== null) {
      invalid(`${field}不完整诊断的instructionId/opcode必须为null`);
    }
    const sourceBlockId = source.sourceBlockId === null
      ? null
      : nonEmptyBoundedString(
        source.sourceBlockId,
        `${field}.sourceBlockId`,
        PROGRESS_SCHEMA_LIMITS.maxBlockOrSourceIdLength,
      );
    const lastValidSource = [...events].reverse()
      .find((item) => item.type === 'state-changed')?.sourceBlockId ?? null;
    if (sourceBlockId !== lastValidSource) {
      invalid(`${field}.sourceBlockId必须是最后有效指令来源或null`);
    }
    return {
      type: 'program-ended-incomplete',
      concept: 'completeness',
      state: ruyiState(source.state, `${field}.state`),
      instructionId: null,
      sourceBlockId,
      opcode: null,
      messageCode: nonEmptyBoundedString(
        source.messageCode,
        `${field}.messageCode`,
        PROGRESS_SCHEMA_LIMITS.maxMessageCodeLength,
      ),
    };
  }
  invalid(`${field}.type无效`);
}

function sameRuyiEvent(left: RuyiStaffBattleEvent, right: RuyiStaffBattleEvent): boolean {
  return left.type === right.type
    && left.state === right.state
    && left.instructionId === right.instructionId
    && left.sourceBlockId === right.sourceBlockId
    && left.opcode === right.opcode
    && left.messageCode === right.messageCode;
}

function sameRuyiDiagnostic(
  left: RuyiStaffBattleDiagnostic | null,
  right: RuyiStaffBattleDiagnostic | null,
): boolean {
  if (left === null || right === null) return left === right;
  return left.type === right.type
    && left.concept === right.concept
    && left.state === right.state
    && left.instructionId === right.instructionId
    && left.sourceBlockId === right.sourceBlockId
    && left.opcode === right.opcode
    && left.messageCode === right.messageCode;
}

function sameRuyiRunResult(
  left: RuyiStaffBattleRunResult,
  right: RuyiStaffBattleRunResult,
): boolean {
  return left.completed === right.completed
    && left.finalState === right.finalState
    && left.events.length === right.events.length
    && left.events.every((item, index) => sameRuyiEvent(item, right.events[index]))
    && sameRuyiDiagnostic(left.diagnostic, right.diagnostic)
    && left.penalty.livesLost === right.penalty.livesLost
    && left.penalty.resourcesLost === right.penalty.resourcesLost
    && left.penalty.starsLost === right.penalty.starsLost;
}

function verifyCanonicalRuyiRunResult(
  parsed: RuyiStaffBattleRunResult,
  field: string,
  lastTrace: readonly RuyiStaffInstruction[],
): RuyiStaffBattleRunResult {
  const canonical = runRuyiStaffBattle(lastTrace);
  if (!sameRuyiRunResult(parsed, canonical)) {
    invalid(`${field}与lastTrace确定性运行结果不一致`);
  }
  return parsed;
}

function ruyiRunResult(
  value: unknown,
  field: string,
  lastTrace: ParsedRuyiTrace,
): RuyiStaffBattleRunResult | null {
  if (value === null) return null;
  const source = object(value, field);
  exactKeys(source, field, ['completed', 'finalState', 'events', 'diagnostic', 'penalty']);
  const events = boundedArray(
    source.events,
    `${field}.events`,
    PROGRESS_SCHEMA_LIMITS.maxBattleEvents,
  ).map((item, index) => (
    ruyiEvent(item, `${field}.events[${index}]`, lastTrace.provenance)
  ));
  if (events.length < 2 || events[0].type !== 'run-started'
    || events.at(-1)?.type !== 'run-finished') {
    invalid(`${field}.events必须以run-started开始并以run-finished结束`);
  }
  if (events[0].state !== 'awaiting-inspection') {
    invalid(`${field}.events起始状态必须是awaiting-inspection`);
  }
  const finalState = ruyiState(source.finalState, `${field}.finalState`);
  if (events.at(-1)?.state !== finalState) invalid(`${field}.finalState必须对应结束事件`);
  const parsedPenalty = penalty(source.penalty, `${field}.penalty`);

  if (source.completed === true) {
    if (finalState !== 'ruyi-staff-shrunk') {
      invalid(`${field}完成运行必须到达ruyi-staff-shrunk`);
    }
    if (source.diagnostic !== null) invalid(`${field}完成运行的diagnostic必须为null`);
    if (events.some((item) => item.type === 'instruction-rejected')) {
      invalid(`${field}完成运行不得包含instruction-rejected`);
    }
    return verifyCanonicalRuyiRunResult({
      completed: true,
      finalState: 'ruyi-staff-shrunk',
      events,
      diagnostic: null,
      penalty: parsedPenalty,
    }, field, lastTrace.instructions);
  }
  if (source.completed !== false) invalid(`${field}.completed必须是布尔值`);
  if (source.diagnostic === null) invalid(`${field}未完成运行必须包含diagnostic`);
  const parsedDiagnostic = ruyiDiagnostic(
    source.diagnostic,
    `${field}.diagnostic`,
    lastTrace.provenance,
    events,
  );
  if (parsedDiagnostic.state !== finalState) {
    invalid(`${field}.diagnostic.state必须等于finalState`);
  }
  if (parsedDiagnostic.type === 'program-ended-incomplete'
    && events.some((item) => item.type === 'instruction-rejected')) {
    invalid(`${field}不完整运行不得包含instruction-rejected`);
  }
  return verifyCanonicalRuyiRunResult({
    completed: false,
    finalState,
    events,
    diagnostic: parsedDiagnostic,
    penalty: parsedPenalty,
  }, field, lastTrace.instructions);
}

function fourSeasState(value: unknown, field: string): FourSeasState {
  if (typeof value !== 'string' || !fourSeasStates.has(value as FourSeasState)) {
    invalid(`${field}状态无效`);
  }
  return value as FourSeasState;
}

function fourSeasOpcode(value: unknown, field: string): FourSeasOpcode {
  if (typeof value !== 'string' || !fourSeasOpcodes.has(value as FourSeasOpcode)) {
    invalid(`${field}操作码无效`);
  }
  return value as FourSeasOpcode;
}

function nullableSourceId(value: unknown, field: string): string | null {
  return value === null ? null : nonEmptyBoundedString(
    value,
    field,
    FOUR_SEAS_WORKSPACE_LIMITS.maxBlockOrSourceIdLength,
  );
}

function fourSeasInstruction(value: unknown, field: string): FourSeasInstruction {
  const source = object(value, field);
  exactKeys(source, field, ['instructionId', 'sourceBlockId', 'parentBlockId', 'opcode']);
  const sourceBlockId = nonEmptyBoundedString(
    source.sourceBlockId,
    `${field}.sourceBlockId`,
    FOUR_SEAS_WORKSPACE_LIMITS.maxBlockOrSourceIdLength,
  );
  const instructionId = nonEmptyBoundedString(
    source.instructionId,
    `${field}.instructionId`,
    PROGRESS_SCHEMA_LIMITS.maxInstructionIdLength,
  );
  if (instructionId !== `${INSTRUCTION_ID_PREFIX}${sourceBlockId}`) {
    invalid(`${field}.instructionId必须由sourceBlockId派生`);
  }
  return {
    instructionId,
    sourceBlockId,
    parentBlockId: nullableSourceId(source.parentBlockId, `${field}.parentBlockId`),
    opcode: fourSeasOpcode(source.opcode, `${field}.opcode`),
  };
}

interface ParsedFourSeasTrace {
  instructions: FourSeasInstruction[];
  provenance: ReadonlyMap<string, FourSeasInstruction>;
}

function fourSeasTrace(value: unknown, field: string): ParsedFourSeasTrace {
  const instructions = boundedArray(
    value,
    field,
    FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks,
  ).map((item, index) => fourSeasInstruction(item, `${field}[${index}]`));
  const sourceIds = new Set<string>();
  const provenance = new Map<string, FourSeasInstruction>();
  for (const item of instructions) {
    if (sourceIds.has(item.sourceBlockId)) invalid(`${field}包含重复sourceBlockId ${item.sourceBlockId}`);
    if (provenance.has(item.instructionId)) invalid(`${field}包含重复instructionId ${item.instructionId}`);
    sourceIds.add(item.sourceBlockId);
    provenance.set(item.instructionId, item);
  }
  let activeContainer: { id: string; consumedChild: boolean } | null = null;
  const closeActiveContainer = () => {
    if (activeContainer !== null && !activeContainer.consumedChild) {
      invalid(`${field}容器 ${activeContainer.id} 必须至少包含一个child指令`);
    }
    activeContainer = null;
  };
  for (const item of instructions) {
    if (fourSeasOpcodePlacement[item.opcode] === 'top') {
      closeActiveContainer();
      if (item.parentBlockId !== null) {
        invalid(`${field}顶层指令 ${item.sourceBlockId} 的parentBlockId必须为null`);
      }
      activeContainer = item.opcode === 'collect_gifts' || item.opcode === 'equip_regalia'
        ? { id: item.sourceBlockId, consumedChild: false }
        : null;
      continue;
    }
    if (item.parentBlockId === null) {
      invalid(`${field}子指令 ${item.sourceBlockId} 必须有parentBlockId`);
    }
    if (activeContainer === null || item.parentBlockId !== activeContainer.id) {
      invalid(`${field}子指令 ${item.sourceBlockId} 必须引用当前已开始的容器作用域`);
    }
    activeContainer.consumedChild = true;
  }
  closeActiveContainer();
  return { instructions, provenance };
}

function safeSessionEvidenceSum(left: number, right: number, field: string): number {
  if (left > Number.MAX_SAFE_INTEGER - right) invalid(`${field}计数求和超出安全范围`);
  return left + right;
}

function validateFourSeasSessionEvidence(
  session: FourSeasRegaliaMissionSession,
  field: string,
): FourSeasRegaliaMissionSession {
  const hasRun = session.lastRun !== null;
  const hasRunTime = session.lastRunAt !== null;
  if (session.totalRuns === 0) {
    if (hasRun || hasRunTime) invalid(`${field}零次运行不得包含lastRun或lastRunAt证据`);
    if (session.lastTrace.length > 0) invalid(`${field}零次运行时lastTrace必须为空`);
  } else if (!hasRun || !hasRunTime) {
    invalid(`${field}有运行计数时lastRun与lastRunAt必须同时存在`);
  }
  if (session.runtimeFailures > session.totalRuns) {
    invalid(`${field}.runtimeFailures运行失败次数不得超过totalRuns`);
  }
  if (session.compileFailures !== session.conceptFailures.programStructure) {
    invalid(`${field}.compileFailures必须等于programStructure失败计数`);
  }
  const expectedRuntimeFailures = safeSessionEvidenceSum(
    session.conceptFailures.sequencePrecondition,
    session.conceptFailures.completeness,
    `${field}.conceptFailures`,
  );
  if (session.runtimeFailures !== expectedRuntimeFailures) {
    invalid(`${field}.runtimeFailures必须等于运行概念失败计数之和`);
  }
  if (session.lastRun?.completed === true) {
    if (session.runtimeFailures >= session.totalRuns) {
      invalid(`${field}最后一次运行成功时累计失败次数必须小于totalRuns`);
    }
  } else if (session.lastRun?.completed === false) {
    if (session.runtimeFailures < 1) invalid(`${field}最后一次运行失败必须有累计失败证据`);
    const latestConceptCount = session.lastRun.diagnostic.type === 'instruction-rejected'
      ? session.conceptFailures.sequencePrecondition
      : session.conceptFailures.completeness;
    if (latestConceptCount < 1) invalid(`${field}最后一次失败的概念计数必须至少为1`);
  }
  return session;
}

function sameFourSeasInstruction(
  left: FourSeasInstruction,
  right: FourSeasInstruction,
): boolean {
  return left.instructionId === right.instructionId
    && left.sourceBlockId === right.sourceBlockId
    && left.parentBlockId === right.parentBlockId
    && left.opcode === right.opcode;
}

function fourSeasEvent(
  value: unknown,
  field: string,
  provenance: ReadonlyMap<string, FourSeasInstruction>,
): FourSeasBattleEvent {
  const source = object(value, field);
  exactKeys(source, field, [
    'type', 'state', 'instructionId', 'sourceBlockId', 'parentBlockId', 'opcode', 'messageCode',
  ]);
  if (typeof source.type !== 'string'
    || !fourSeasEventTypes.has(source.type as FourSeasBattleEvent['type'])) {
    invalid(`${field}.type无效`);
  }
  const type = source.type as FourSeasBattleEvent['type'];
  const parsedState = fourSeasState(source.state, `${field}.state`);
  const messageCode = nonEmptyBoundedString(
    source.messageCode,
    `${field}.messageCode`,
    PROGRESS_SCHEMA_LIMITS.maxMessageCodeLength,
  );
  if (type === 'run-started' || type === 'run-finished') {
    if (
      source.instructionId !== null
      || source.sourceBlockId !== null
      || source.parentBlockId !== null
      || source.opcode !== null
    ) invalid(`${field}生命周期事件不得携带指令来源`);
    return {
      type,
      state: parsedState,
      instructionId: null,
      sourceBlockId: null,
      parentBlockId: null,
      opcode: null,
      messageCode,
    };
  }
  const parsedInstruction = fourSeasInstruction({
    instructionId: source.instructionId,
    sourceBlockId: source.sourceBlockId,
    parentBlockId: source.parentBlockId,
    opcode: source.opcode,
  }, field);
  const traced = provenance.get(parsedInstruction.instructionId);
  if (!traced || !sameFourSeasInstruction(parsedInstruction, traced)) {
    invalid(`${field}的指令来源不在lastTrace中`);
  }
  return { type, state: parsedState, ...parsedInstruction, messageCode };
}

function fourSeasDiagnostic(
  value: unknown,
  field: string,
  provenance: ReadonlyMap<string, FourSeasInstruction>,
  events: readonly FourSeasBattleEvent[],
): FourSeasBattleDiagnostic {
  const source = object(value, field);
  exactKeys(source, field, [
    'type', 'concept', 'state', 'instructionId', 'sourceBlockId', 'parentBlockId', 'opcode', 'messageCode',
  ]);
  const parsedState = fourSeasState(source.state, `${field}.state`);
  const messageCode = nonEmptyBoundedString(
    source.messageCode,
    `${field}.messageCode`,
    PROGRESS_SCHEMA_LIMITS.maxMessageCodeLength,
  );
  if (source.type === 'instruction-rejected') {
    if (source.concept !== 'sequence-precondition' && source.concept !== 'container-scope') {
      invalid(`${field}.concept无效`);
    }
    const parsedInstruction = fourSeasInstruction({
      instructionId: source.instructionId,
      sourceBlockId: source.sourceBlockId,
      parentBlockId: source.parentBlockId,
      opcode: source.opcode,
    }, field);
    const traced = provenance.get(parsedInstruction.instructionId);
    if (!traced || !sameFourSeasInstruction(parsedInstruction, traced)) {
      invalid(`${field}的指令来源不在lastTrace中`);
    }
    const parsed: FourSeasBattleDiagnostic = {
      type: 'instruction-rejected',
      concept: source.concept,
      state: parsedState,
      ...parsedInstruction,
      messageCode,
    };
    if (!events.some((event) => event.type === 'instruction-rejected'
      && event.state === parsed.state
      && event.messageCode === parsed.messageCode
      && sameFourSeasInstruction(event, parsed))) {
      invalid(`${field}必须对应instruction-rejected事件`);
    }
    return parsed;
  }
  if (source.type !== 'program-ended-incomplete' || source.concept !== 'completeness') {
    invalid(`${field}.type或concept无效`);
  }
  if (source.instructionId !== null || source.opcode !== null) {
    invalid(`${field}不完整诊断的instructionId/opcode必须为null`);
  }
  const sourceBlockId = nullableSourceId(source.sourceBlockId, `${field}.sourceBlockId`);
  const parentBlockId = nullableSourceId(source.parentBlockId, `${field}.parentBlockId`);
  const lastChanged = [...events].reverse().find((event) => event.type === 'state-changed');
  if (
    sourceBlockId !== (lastChanged?.sourceBlockId ?? null)
    || parentBlockId !== (lastChanged?.parentBlockId ?? null)
  ) invalid(`${field}必须对应最后有效指令来源及容器`);
  return {
    type: 'program-ended-incomplete',
    concept: 'completeness',
    state: parsedState,
    instructionId: null,
    sourceBlockId,
    parentBlockId,
    opcode: null,
    messageCode,
  };
}

function fourSeasRunResult(
  value: unknown,
  field: string,
  lastTrace: ParsedFourSeasTrace,
): FourSeasBattleRunResult | null {
  if (value === null) return null;
  const source = object(value, field);
  exactKeys(source, field, ['completed', 'finalState', 'events', 'diagnostic', 'penalty']);
  const events = boundedArray(
    source.events,
    `${field}.events`,
    PROGRESS_SCHEMA_LIMITS.maxBattleEvents,
  ).map((item, index) => fourSeasEvent(
    item,
    `${field}.events[${index}]`,
    lastTrace.provenance,
  ));
  if (events.length < 2 || events[0].type !== 'run-started' || events.at(-1)?.type !== 'run-finished') {
    invalid(`${field}.events必须以run-started开始并以run-finished结束`);
  }
  if (events[0].state !== 'awaiting-request') invalid(`${field}.events起始状态必须是awaiting-request`);
  const finalState = fourSeasState(source.finalState, `${field}.finalState`);
  const parsedPenalty = penalty(source.penalty, `${field}.penalty`);
  let parsed: FourSeasBattleRunResult;
  if (source.completed === true) {
    if (finalState !== 'regalia-verified' || source.diagnostic !== null) {
      invalid(`${field}完成运行必须到达regalia-verified且diagnostic为null`);
    }
    parsed = {
      completed: true,
      finalState: 'regalia-verified',
      events,
      diagnostic: null,
      penalty: parsedPenalty,
    };
  } else {
    if (source.completed !== false || source.diagnostic === null) {
      invalid(`${field}未完成运行必须包含diagnostic`);
    }
    parsed = {
      completed: false,
      finalState,
      events,
      diagnostic: fourSeasDiagnostic(
        source.diagnostic,
        `${field}.diagnostic`,
        lastTrace.provenance,
        events,
      ),
      penalty: parsedPenalty,
    };
  }
  const canonical = runFourSeasRegalia(lastTrace.instructions);
  if (!deeplyEqual(parsed, canonical)) {
    invalid(`${field}与lastTrace确定性运行结果不一致`);
  }
  return parsed;
}

function dragonSession(value: unknown, field: string): DragonPalaceMissionSession {
  const source = object(value, field);
  exactKeys(source, field, [
    'workspace', 'lastTrace', 'lastRun', 'totalRuns', 'runtimeFailures', 'compileFailures',
    'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt',
  ]);
  const lastTrace = trace(source.lastTrace, `${field}.lastTrace`);
  const tiers = array(source.usedHintTiers, `${field}.usedHintTiers`).map((item, index) => {
    if (typeof item !== 'string' || !hintTiers.has(item as MissionSession['usedHintTiers'][number])) {
      invalid(`${field}.usedHintTiers[${index}]提示层级无效`);
    }
    return item as MissionSession['usedHintTiers'][number];
  });
  if (new Set(tiers).size !== tiers.length) invalid(`${field}.usedHintTiers提示层级不得重复`);
  const failures = object(source.conceptFailures, `${field}.conceptFailures`);
  exactKeys(failures, `${field}.conceptFailures`, [
    'programStructure', 'sequencePrecondition', 'completeness',
  ]);
  return {
    workspace: workspace(source.workspace, `${field}.workspace`),
    lastTrace: lastTrace.instructions,
    lastRun: runResult(source.lastRun, `${field}.lastRun`, lastTrace),
    totalRuns: nonNegativeInteger(source.totalRuns, `${field}.totalRuns`),
    runtimeFailures: nonNegativeInteger(source.runtimeFailures, `${field}.runtimeFailures`),
    compileFailures: nonNegativeInteger(source.compileFailures, `${field}.compileFailures`),
    usedHintTiers: tiers,
    conceptFailures: {
      programStructure: nonNegativeInteger(failures.programStructure, `${field}.conceptFailures.programStructure`),
      sequencePrecondition: nonNegativeInteger(failures.sequencePrecondition, `${field}.conceptFailures.sequencePrecondition`),
      completeness: nonNegativeInteger(failures.completeness, `${field}.conceptFailures.completeness`),
    },
    lastRunAt: nullableDate(source.lastRunAt, `${field}.lastRunAt`),
    savedAt: date(source.savedAt, `${field}.savedAt`),
  };
}

function ruyiSession(value: unknown, field: string): RuyiStaffMissionSession {
  const source = object(value, field);
  exactKeys(source, field, [
    'workspace', 'lastTrace', 'lastRun', 'totalRuns', 'runtimeFailures', 'compileFailures',
    'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt',
  ]);
  const lastTrace = ruyiTrace(source.lastTrace, `${field}.lastTrace`);
  const tiers = array(source.usedHintTiers, `${field}.usedHintTiers`).map((item, index) => {
    if (typeof item !== 'string' || !hintTiers.has(item as MissionSession['usedHintTiers'][number])) {
      invalid(`${field}.usedHintTiers[${index}]提示层级无效`);
    }
    return item as MissionSession['usedHintTiers'][number];
  });
  if (new Set(tiers).size !== tiers.length) invalid(`${field}.usedHintTiers提示层级不得重复`);
  const failures = object(source.conceptFailures, `${field}.conceptFailures`);
  exactKeys(failures, `${field}.conceptFailures`, [
    'programStructure', 'sequencePrecondition', 'completeness',
  ]);
  return {
    workspace: ruyiWorkspace(source.workspace, `${field}.workspace`),
    lastTrace: lastTrace.instructions,
    lastRun: ruyiRunResult(source.lastRun, `${field}.lastRun`, lastTrace),
    totalRuns: nonNegativeInteger(source.totalRuns, `${field}.totalRuns`),
    runtimeFailures: nonNegativeInteger(source.runtimeFailures, `${field}.runtimeFailures`),
    compileFailures: nonNegativeInteger(source.compileFailures, `${field}.compileFailures`),
    usedHintTiers: tiers,
    conceptFailures: {
      programStructure: nonNegativeInteger(failures.programStructure, `${field}.conceptFailures.programStructure`),
      sequencePrecondition: nonNegativeInteger(failures.sequencePrecondition, `${field}.conceptFailures.sequencePrecondition`),
      completeness: nonNegativeInteger(failures.completeness, `${field}.conceptFailures.completeness`),
    },
    lastRunAt: nullableDate(source.lastRunAt, `${field}.lastRunAt`),
    savedAt: date(source.savedAt, `${field}.savedAt`),
  };
}

function fourSeasSession(value: unknown, field: string): FourSeasRegaliaMissionSession {
  const source = object(value, field);
  exactKeys(source, field, [
    'workspace', 'lastTrace', 'lastRun', 'totalRuns', 'runtimeFailures', 'compileFailures',
    'usedHintTiers', 'conceptFailures', 'lastRunAt', 'savedAt',
  ]);
  const lastTrace = fourSeasTrace(source.lastTrace, `${field}.lastTrace`);
  const tiers = array(source.usedHintTiers, `${field}.usedHintTiers`).map((item, index) => {
    if (typeof item !== 'string' || !hintTiers.has(item as MissionSession['usedHintTiers'][number])) {
      invalid(`${field}.usedHintTiers[${index}]提示层级无效`);
    }
    return item as MissionSession['usedHintTiers'][number];
  });
  if (new Set(tiers).size !== tiers.length) invalid(`${field}.usedHintTiers提示层级不得重复`);
  const failures = object(source.conceptFailures, `${field}.conceptFailures`);
  exactKeys(failures, `${field}.conceptFailures`, [
    'programStructure', 'sequencePrecondition', 'completeness',
  ]);
  const parsed: FourSeasRegaliaMissionSession = {
    workspace: fourSeasWorkspace(source.workspace, `${field}.workspace`),
    lastTrace: lastTrace.instructions,
    lastRun: fourSeasRunResult(source.lastRun, `${field}.lastRun`, lastTrace),
    totalRuns: nonNegativeInteger(source.totalRuns, `${field}.totalRuns`),
    runtimeFailures: nonNegativeInteger(source.runtimeFailures, `${field}.runtimeFailures`),
    compileFailures: nonNegativeInteger(source.compileFailures, `${field}.compileFailures`),
    usedHintTiers: tiers,
    conceptFailures: {
      programStructure: nonNegativeInteger(failures.programStructure, `${field}.conceptFailures.programStructure`),
      sequencePrecondition: nonNegativeInteger(failures.sequencePrecondition, `${field}.conceptFailures.sequencePrecondition`),
      completeness: nonNegativeInteger(failures.completeness, `${field}.conceptFailures.completeness`),
    },
    lastRunAt: nullableDate(source.lastRunAt, `${field}.lastRunAt`),
    savedAt: date(source.savedAt, `${field}.savedAt`),
  };
  return validateFourSeasSessionEvidence(parsed, field);
}

function sessions(value: unknown): MissionSessions {
  const source = object(value, 'sessions');
  const result: MissionSessions = {};
  for (const [missionId, rawSession] of Object.entries(source)) {
    if (!missionIds.has(missionId)) invalid(`未知任务 ${missionId}`);
    if (missionId === 'w1-m1') {
      result['w1-m1'] = dragonSession(rawSession, `sessions.${missionId}`);
    } else if (missionId === 'w1-m2') {
      result['w1-m2'] = ruyiSession(rawSession, `sessions.${missionId}`);
    } else if (missionId === 'w1-m3') {
      result['w1-m3'] = fourSeasSession(rawSession, `sessions.${missionId}`);
    } else {
      invalid(`任务 ${missionId} 尚不支持可执行会话`);
    }
  }
  return result;
}

function parseV3(source: Record<string, unknown>): ProgressV3 {
  exactKeys(source, '顶层', [
    'version', 'schemaRevision', 'learnerName', 'missions', 'settings', 'privacy', 'recovery', 'sessions', 'savedAt',
  ]);
  if (source.schemaRevision !== 1) invalid('schemaRevision必须是1');
  return {
    version: 3,
    schemaRevision: 1,
    ...common(source, true),
    ...privacyAndRecovery(source),
    sessions: sessions(source.sessions),
  };
}

export function migrateProgress(value: unknown): ProgressV3 {
  if (!isPlainObject(value)) invalid('顶层必须是普通对象');
  if (value.version !== 1 && value.version !== 2 && value.version !== 3) {
    throw new Error('进度版本不受支持');
  }
  if (value.version === 3) return parseV3(value);
  const legacy = value.version === 2 ? parseV2(value) : parseV1(value);
  if (legacy.version === 2) return { ...legacy, version: 3, sessions: {} };
  return {
    version: 3,
    schemaRevision: 1,
    learnerName: legacy.learnerName,
    missions: legacy.missions,
    settings: { ...legacy.settings, reducedMotionOverride: false },
    privacy: { localDataNoticeSeen: false },
    recovery: { lastRecoveredAt: null, source: null },
    sessions: {},
    savedAt: legacy.savedAt,
  };
}

export function parseProgress(raw: string): ProgressV3 {
  if (raw.length > PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes) {
    invalid(`原始JSON的UTF-8字节最多${PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes}`);
  }
  const rawBytes = utf8Encoder.encode(raw).byteLength;
  if (rawBytes > PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes) {
    invalid(`原始JSON的UTF-8字节最多${PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes}`);
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('进度文件无法读取');
  }
  return migrateProgress(value);
}
