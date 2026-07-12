import { allMissions } from '../course/course';
import type { MissionProgress, ProgressSettings, ProgressV1, ProgressV2 } from './types';

const missionIds = new Set(allMissions.map((mission) => mission.id));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && Object.getPrototypeOf(value) === Object.prototype;
}

function invalid(detail: string): never {
  throw new Error(`进度文件格式无效：${detail}`);
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!isPlainObject(value)) invalid(`${field}必须是对象`);
  return value;
}

function exactKeys(value: Record<string, unknown>, field: string, allowed: readonly string[]): void {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) invalid(`${field}包含未知字段 ${unexpected}`);
}

function string(value: unknown, field: string): string {
  if (typeof value !== 'string') invalid(`${field}必须是文本`);
  return value;
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

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    invalid(`${field}必须是非负整数`);
  }
  return value;
}

function pin(value: unknown): string {
  const result = string(value, 'settings.parentPin');
  if (!/^\d{4,6}$/.test(result)) invalid('settings.parentPin必须是4至6位数字');
  return result;
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

function settings(value: unknown, isV2: boolean): ProgressSettings {
  const source = object(value, 'settings');
  exactKeys(
    source,
    'settings',
    isV2
      ? ['muted', 'reducedMotion', 'reducedMotionOverride', 'parentPin']
      : ['muted', 'reducedMotion', 'parentPin'],
  );
  return {
    muted: boolean(source.muted, 'settings.muted'),
    reducedMotion: boolean(source.reducedMotion, 'settings.reducedMotion'),
    reducedMotionOverride: isV2
      ? boolean(source.reducedMotionOverride, 'settings.reducedMotionOverride')
      : false,
    parentPin: pin(source.parentPin),
  };
}

function common(source: Record<string, unknown>, isV2: boolean) {
  return {
    learnerName: string(source.learnerName, 'learnerName'),
    missions: missions(source.missions),
    settings: settings(source.settings, isV2),
    savedAt: date(source.savedAt, 'savedAt'),
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
  const privacy = object(source.privacy, 'privacy');
  const recovery = object(source.recovery, 'recovery');
  exactKeys(privacy, 'privacy', ['localDataNoticeSeen']);
  exactKeys(recovery, 'recovery', ['lastRecoveredAt', 'source']);
  const lastRecoveredAt = recovery.lastRecoveredAt === null
    ? null
    : date(recovery.lastRecoveredAt, 'recovery.lastRecoveredAt');
  const recoverySource = recovery.source;
  if (recoverySource !== null && recoverySource !== 'snapshot' && recoverySource !== 'initial') {
    invalid('recovery.source无效');
  }
  return {
    version: 2,
    schemaRevision: 1,
    ...common(source, true),
    privacy: { localDataNoticeSeen: boolean(privacy.localDataNoticeSeen, 'privacy.localDataNoticeSeen') },
    recovery: { lastRecoveredAt, source: recoverySource },
  };
}

export function migrateProgress(value: unknown): ProgressV2 {
  if (!isPlainObject(value)) invalid('顶层必须是普通对象');
  if (value.version !== 1 && value.version !== 2) throw new Error('进度版本不受支持');
  if (value.version === 2) return parseV2(value);

  const legacy = parseV1(value);
  return {
    version: 2,
    schemaRevision: 1,
    learnerName: legacy.learnerName,
    missions: legacy.missions,
    settings: { ...legacy.settings, reducedMotionOverride: false },
    privacy: { localDataNoticeSeen: false },
    recovery: { lastRecoveredAt: null, source: null },
    savedAt: legacy.savedAt,
  };
}

export function parseProgress(raw: string): ProgressV2 {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('进度文件无法读取');
  }
  return migrateProgress(value);
}
