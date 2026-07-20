import type { StorageFaultAdapter } from '../../src/progress/storageFaultAdapter';
import type { ProgressV3 } from '../../src/progress/types';

const MODE_KEY = 'xiyou-test-storage-mode';
const CURRENT_KEY = 'xiyou-programming-progress-v3';
const SNAPSHOT_KEY = 'xiyou-programming-progress-snapshot-v3';
const FAILURE = 'regalia storage fault';

function currentProgress(storage: Storage): ProgressV3 | null {
  try {
    const raw = storage.getItem(CURRENT_KEY);
    return raw === null ? null : JSON.parse(raw) as ProgressV3;
  } catch {
    return null;
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function exactAfterAllowedDelta(previous: ProgressV3, next: ProgressV3, apply: (expected: ProgressV3) => void) {
  const expected = structuredClone(previous);
  apply(expected);
  expected.savedAt = next.savedAt;
  return canonicalJson(expected) === canonicalJson(next);
}

function exactDraftDelta(previous: ProgressV3, next: ProgressV3) {
  const candidate = next.sessions['w1-m3'];
  if (!candidate || candidate.lastRun !== null || next.missions['w1-m3'] !== undefined) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const prior = expected.sessions['w1-m3'];
    if (!prior) expected.sessions['w1-m3'] = structuredClone(candidate);
    else {
      prior.workspace = structuredClone(candidate.workspace);
      prior.savedAt = candidate.savedAt;
    }
  });
}

function exactSessionDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w1-m3'];
  const candidate = next.sessions['w1-m3'];
  if (!prior || !candidate?.lastRun || next.missions['w1-m3'] !== undefined) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w1-m3']!;
    session.lastTrace = structuredClone(candidate.lastTrace);
    session.lastRun = structuredClone(candidate.lastRun);
    session.totalRuns = candidate.totalRuns;
    session.runtimeFailures = candidate.runtimeFailures;
    session.conceptFailures = structuredClone(candidate.conceptFailures);
    session.lastRunAt = candidate.lastRunAt;
    session.savedAt = candidate.savedAt;
  });
}

function exactCompletionDelta(previous: ProgressV3, next: ProgressV3) {
  const completion = next.missions['w1-m3'];
  if (!completion) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    expected.missions['w1-m3'] = structuredClone(completion);
  });
}

export const storageFaultAdapter: StorageFaultAdapter = {
  beforeProgressWrite: ({ storage, progress }) => {
    const mode = storage.getItem(MODE_KEY);
    const previous = currentProgress(storage);
    if (!previous) return null;
    if (mode === 'fail-regalia-draft' && exactDraftDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-regalia-session' && exactSessionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-regalia-completion' && exactCompletionDelta(previous, progress)) return FAILURE;
    return null;
  },
  beforeProgressLoad: (storage) => {
    if (storage.getItem(MODE_KEY) !== 'corrupt-regalia-current') return;
    const legal = storage.getItem(CURRENT_KEY);
    if (legal !== null) storage.setItem(SNAPSHOT_KEY, legal);
    storage.setItem(CURRENT_KEY, '{broken w1-m3 current');
    storage.setItem(MODE_KEY, 'off');
  },
};
