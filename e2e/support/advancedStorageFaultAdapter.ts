import { registerAdvancedStorageFaultHandler } from '#storage-fault-adapter';
import type { ProgressV3 } from '../../src/progress/types';

const MODE_KEY = 'xiyou-test-storage-mode';
const FAILURE = 'regalia storage fault';

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
  return JSON.stringify(value);
}

function advancedMissionId(progress: ProgressV3): 'w1-m4' | 'w1-m5' | null {
  for (const missionId of ['w1-m4', 'w1-m5'] as const) if (progress.sessions[missionId] || progress.missions[missionId]) return missionId;
  return null;
}

function exactAdvancedDelta(previous: ProgressV3, next: ProgressV3, kind: 'draft' | 'session' | 'completion') {
  const missionId = advancedMissionId(next);
  if (!missionId) return false;
  const candidate = next.sessions[missionId];
  if (kind === 'draft' && (!candidate || candidate.lastRun !== null || next.missions[missionId] !== undefined)) return false;
  if (kind === 'session' && (!candidate?.lastRun || next.missions[missionId] !== undefined)) return false;
  if (kind === 'completion' && !next.missions[missionId]) return false;
  const expected = structuredClone(previous);
  if (kind === 'completion') expected.missions[missionId] = structuredClone(next.missions[missionId]!);
  else expected.sessions[missionId] = structuredClone(candidate!);
  expected.savedAt = next.savedAt;
  return canonicalJson(expected) === canonicalJson(next);
}

export function activateAdvancedStorageFaults(): void {
  registerAdvancedStorageFaultHandler(({ storage, progress }) => {
    const mode = storage.getItem(MODE_KEY);
    let previous: ProgressV3 | null = null;
    try { const raw = storage.getItem('xiyou-programming-progress-v3'); previous = raw === null ? null : JSON.parse(raw) as ProgressV3; } catch { return null; }
    if (!previous) return null;
    if (mode === 'fail-advanced-draft' && exactAdvancedDelta(previous, progress, 'draft')) return FAILURE;
    if (mode === 'fail-advanced-session' && exactAdvancedDelta(previous, progress, 'session')) return FAILURE;
    if (mode === 'fail-advanced-completion' && exactAdvancedDelta(previous, progress, 'completion')) return FAILURE;
    return null;
  });
}
