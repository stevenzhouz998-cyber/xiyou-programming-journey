import type { StorageFaultAdapter } from '../../src/progress/storageFaultAdapter';
import type { ProgressV3 } from '../../src/progress/types';

const MODE_KEY = 'xiyou-test-storage-mode';
const CURRENT_KEY = 'xiyou-programming-progress-v3';
const SNAPSHOT_KEY = 'xiyou-programming-progress-snapshot-v3';
const FAILURE = 'regalia storage fault';
let advancedStorageFaultHandler: StorageFaultAdapter['beforeProgressWrite'] = () => null;

export function registerAdvancedStorageFaultHandler(handler: StorageFaultAdapter['beforeProgressWrite']): void {
  advancedStorageFaultHandler = handler;
}

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
    expected.equipment = structuredClone(next.equipment);
  });
}

function exactMonkeyDraftDelta(previous: ProgressV3, next: ProgressV3) {
  const candidate = next.sessions['w2-m2'];
  if (!candidate || candidate.lastRun !== null || next.missions['w2-m2'] !== undefined) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const prior = expected.sessions['w2-m2'];
    if (!prior) expected.sessions['w2-m2'] = structuredClone(candidate);
    else {
      prior.workspace = structuredClone(candidate.workspace);
      prior.lastTrace = [];
      prior.lastRun = null;
      prior.lastRunAt = null;
      prior.savedAt = candidate.savedAt;
    }
  });
}

function exactMonkeySessionDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w2-m2'];
  const candidate = next.sessions['w2-m2'];
  if (!prior || !candidate?.lastRun || next.missions['w2-m2'] !== undefined) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w2-m2']!;
    session.lastTrace = structuredClone(candidate.lastTrace);
    session.lastRun = structuredClone(candidate.lastRun);
    session.totalRuns = candidate.totalRuns;
    session.runtimeFailures = candidate.runtimeFailures;
    session.compileFailures = candidate.compileFailures;
    session.conceptFailures = structuredClone(candidate.conceptFailures);
    session.lastRunAt = candidate.lastRunAt;
    session.savedAt = candidate.savedAt;
  });
}

function exactMonkeyCompletionDelta(previous: ProgressV3, next: ProgressV3) {
  const completion = next.missions['w2-m2'];
  if (!completion) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    expected.missions['w2-m2'] = structuredClone(completion);
  });
}

function exactPeachDraftDelta(previous: ProgressV3, next: ProgressV3) {
  const candidate = next.sessions['w2-m3'];
  if (!candidate || candidate.lastRun !== null || next.missions['w2-m3'] !== undefined) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const prior = expected.sessions['w2-m3'];
    if (!prior) expected.sessions['w2-m3'] = structuredClone(candidate);
    else {
      prior.workspace = structuredClone(candidate.workspace);
      prior.lastTrace = [];
      prior.lastRun = null;
      prior.lastRunAt = null;
      prior.savedAt = candidate.savedAt;
    }
  });
}

function exactPeachSessionDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w2-m3'];
  const candidate = next.sessions['w2-m3'];
  if (!prior || !candidate?.lastRun || next.missions['w2-m3'] !== undefined) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w2-m3']!;
    session.lastTrace = structuredClone(candidate.lastTrace);
    session.lastRun = structuredClone(candidate.lastRun);
    session.totalRuns = candidate.totalRuns;
    session.runtimeFailures = candidate.runtimeFailures;
    session.compileFailures = candidate.compileFailures;
    session.conceptFailures = structuredClone(candidate.conceptFailures);
    session.lastRunAt = candidate.lastRunAt;
    session.savedAt = candidate.savedAt;
  });
}

function exactPeachCompletionDelta(previous: ProgressV3, next: ProgressV3) {
  const completion = next.missions['w2-m3'];
  if (!completion) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    expected.missions['w2-m3'] = structuredClone(completion);
  });
}

function exactFurnaceDraftDelta(previous: ProgressV3, next: ProgressV3) {
  const candidate = next.sessions['w2-m4'];
  if (previous.sessions['w2-m4'] !== undefined || !candidate || candidate.lastRun !== null || next.missions['w2-m4'] !== undefined) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    expected.sessions['w2-m4'] = structuredClone(candidate);
  });
}

function exactFurnaceSessionDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w2-m4'];
  const candidate = next.sessions['w2-m4'];
  if (!prior || !candidate?.lastRun || next.missions['w2-m4'] !== undefined) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w2-m4']!;
    session.lastTrace = structuredClone(candidate.lastTrace);
    session.lastRun = structuredClone(candidate.lastRun);
    session.totalRuns = candidate.totalRuns;
    session.runtimeFailures = candidate.runtimeFailures;
    session.compileFailures = candidate.compileFailures;
    session.conceptFailures = structuredClone(candidate.conceptFailures);
    session.lastRunAt = candidate.lastRunAt;
    session.savedAt = candidate.savedAt;
  });
}

function exactBossDraftDelta(previous: ProgressV3, next: ProgressV3) {
  const candidate = next.sessions['w2-m5'];
  if (previous.sessions['w2-m5'] !== undefined || !candidate || candidate.lastRun !== null || next.missions['w2-m5'] !== undefined) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    expected.sessions['w2-m5'] = structuredClone(candidate);
  });
}

function exactBossSessionDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w2-m5'];
  const candidate = next.sessions['w2-m5'];
  if (!prior || !candidate?.lastRun || next.missions['w2-m5'] !== undefined) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w2-m5']!;
    session.lastTrace = structuredClone(candidate.lastTrace);
    session.lastRun = structuredClone(candidate.lastRun);
    session.totalRuns = candidate.totalRuns;
    session.runtimeFailures = candidate.runtimeFailures;
    session.compileFailures = candidate.compileFailures;
    session.conceptFailures = structuredClone(candidate.conceptFailures);
    session.lastRunAt = candidate.lastRunAt;
    session.savedAt = candidate.savedAt;
  });
}

function exactBossCompletionDelta(previous: ProgressV3, next: ProgressV3) {
  const completion = next.missions['w2-m5'];
  const previousAbility = previous.abilities.conditionObservation;
  const nextAbility = next.abilities.conditionObservation;
  if (!completion || nextAbility.acquiredAt !== previousAbility.acquiredAt || nextAbility.stableUnlockedAt !== completion.completedAt) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    expected.missions['w2-m5'] = structuredClone(completion);
    expected.equipment = structuredClone(next.equipment);
    expected.abilities = structuredClone(next.abilities);
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

function hasZeroManorCounters(session: NonNullable<ProgressV3['sessions']['w3-m1']>): boolean {
  return session.totalRuns === 0
    && session.runtimeFailures === 0
    && session.compileFailures === 0
    && canonicalJson(session.conceptFailures) === canonicalJson({
      programStructure: 0, conditionSelection: 0, branchRouting: 0, completeness: 0,
    });
}

function isManorWorkspace(value: unknown): boolean {
  return isPlainRecord(value) && value.missionId === 'w3-m1';
}

function exactManorDraftDelta(previous: ProgressV3, next: ProgressV3) {
  const candidate = next.sessions['w3-m1'];
  const prior = previous.sessions['w3-m1'];
  if (!candidate || candidate.lastRun !== null || next.missions['w3-m1'] !== undefined) return false;
  if (prior && canonicalJson(prior) === canonicalJson(candidate)) return false;
  if (!prior) {
    if (
      !isManorWorkspace(candidate.workspace)
      || !hasZeroManorCounters(candidate)
      || !hasEmptyArray(candidate.usedHintTiers)
      || !hasEmptyArray(candidate.lastTrace)
      || !hasEmptyArray(candidate.scenarioResults)
      || !hasEmptyArray(candidate.conditionObservationUses)
      || candidate.failureSnapshot !== null
      || candidate.lastRunAt !== null
    ) return false;
    return exactAfterAllowedDelta(previous, next, (expected) => {
      expected.sessions['w3-m1'] = structuredClone(candidate);
    });
  }
  const preserved = exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w3-m1']!;
    session.workspace = structuredClone(candidate.workspace);
    session.savedAt = candidate.savedAt;
  });
  if (preserved) return true;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w3-m1']!;
    session.workspace = structuredClone(candidate.workspace);
    session.lastTrace = [];
    session.lastRun = null;
    session.scenarioResults = [];
    session.failureSnapshot = null;
    session.lastRunAt = null;
    session.savedAt = candidate.savedAt;
  });
}

function exactManorSessionDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w3-m1'];
  const candidate = next.sessions['w3-m1'];
  if (!prior || !candidate?.lastRun || candidate.lastRunAt === null || next.missions['w3-m1'] !== undefined) return false;
  if (
    canonicalJson(candidate.workspace) !== canonicalJson(prior.workspace)
    || canonicalJson(candidate.usedHintTiers) !== canonicalJson(prior.usedHintTiers)
    || canonicalJson(candidate.conditionObservationUses) !== canonicalJson(prior.conditionObservationUses)
    || candidate.totalRuns !== prior.totalRuns + 1
  ) return false;
  const diagnostic = candidate.lastRun.diagnostic;
  const expectedRuntimeFailures = candidate.lastRun.completed ? prior.runtimeFailures : prior.runtimeFailures + 1;
  const expectedFailures = structuredClone(prior.conceptFailures);
  if (!candidate.lastRun.completed) {
    if (!diagnostic || !isPlainRecord(diagnostic)) return false;
    if (diagnostic.concept === 'condition-selection') expectedFailures.conditionSelection += 1;
    else if (diagnostic.concept === 'branch-routing') expectedFailures.branchRouting += 1;
    else expectedFailures.completeness += 1;
  }
  if (candidate.runtimeFailures !== expectedRuntimeFailures || canonicalJson(candidate.conceptFailures) !== canonicalJson(expectedFailures)) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w3-m1']!;
    session.lastTrace = structuredClone(candidate.lastTrace);
    session.lastRun = structuredClone(candidate.lastRun);
    session.scenarioResults = structuredClone(candidate.scenarioResults);
    session.failureSnapshot = structuredClone(candidate.failureSnapshot);
    session.totalRuns = candidate.totalRuns;
    session.runtimeFailures = candidate.runtimeFailures;
    session.conceptFailures = structuredClone(candidate.conceptFailures);
    session.lastRunAt = candidate.lastRunAt;
    session.savedAt = candidate.savedAt;
  });
}

function exactManorObservationDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w3-m1'];
  const candidate = next.sessions['w3-m1'];
  const observation = candidate?.conditionObservationUses.at(-1);
  if (!prior || !candidate || !observation || candidate.conditionObservationUses.length !== prior.conditionObservationUses.length + 1) return false;
  if (
    canonicalJson(candidate.conditionObservationUses.slice(0, -1)) !== canonicalJson(prior.conditionObservationUses)
    || prior.conditionObservationUses.some((use) => use.snapshotId === observation.snapshotId)
  ) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w3-m1']!;
    session.conditionObservationUses.push(structuredClone(observation));
    session.savedAt = candidate.savedAt;
  });
}

function exactManorCompletionDelta(previous: ProgressV3, next: ProgressV3) {
  const session = previous.sessions['w3-m1'];
  const completion = next.missions['w3-m1'];
  const evidence = next.missionCompletionEvidence['w3-m1'];
  if (!session || previous.missions['w3-m1'] !== undefined || !completion || evidence?.kind !== 'formal-v3') return false;
  const run = session.lastRun;
  if (
    !run
    || !run.completed
    || run.diagnostic !== null
    || run.failureSnapshot !== null
    || session.failureSnapshot !== null
    || run.penalty.livesLost !== 0 || run.penalty.resourcesLost !== 0 || run.penalty.starsLost !== 0
    || run.scenarioResults.length !== 2
    || !run.scenarioResults.every((scenario) => scenario.passed)
    || completion.status !== 'completed'
    || !Number.isSafeInteger(completion.stars) || completion.stars < 1 || completion.stars > 3
    || completion.attempts !== 1 || !Number.isSafeInteger(completion.hintsUsed) || completion.hintsUsed < 0
    || completion.completedAt !== next.savedAt
    || evidence.completedAt !== completion.completedAt || evidence.verifiedAt !== next.savedAt
    || canonicalJson(evidence.workspace) !== canonicalJson(session.workspace)
    || canonicalJson(evidence.trace) !== canonicalJson(session.lastTrace)
    || canonicalJson(evidence.run) !== canonicalJson(session.lastRun)
  ) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    expected.missions['w3-m1'] = structuredClone(completion);
    expected.missionCompletionEvidence['w3-m1'] = structuredClone(evidence);
  });
}

function isCuilanWorkspace(value: unknown): boolean { return isPlainRecord(value) && value.missionId === 'w3-m2'; }

function hasZeroCuilanCounters(session: NonNullable<ProgressV3['sessions']['w3-m2']>): boolean {
  return session.totalRuns === 0 && session.runtimeFailures === 0 && session.compileFailures === 0
    && canonicalJson(session.conceptFailures) === canonicalJson({ programStructure: 0, conditionSelection: 0, branchRouting: 0, sequencePrecondition: 0, completeness: 0 });
}

function exactCuilanDraftDelta(previous: ProgressV3, next: ProgressV3) {
  const candidate = next.sessions['w3-m2']; const prior = previous.sessions['w3-m2'];
  if (!candidate || candidate.lastRun !== null || next.missions['w3-m2'] !== undefined || (prior && canonicalJson(prior) === canonicalJson(candidate))) return false;
  if (!prior) {
    if (!isCuilanWorkspace(candidate.workspace) || !hasZeroCuilanCounters(candidate) || !hasEmptyArray(candidate.usedHintTiers) || !hasEmptyArray(candidate.lastTrace) || !hasEmptyArray(candidate.checkpointResults) || !hasEmptyArray(candidate.conditionObservationUses) || candidate.failureSnapshot !== null || candidate.lastRunAt !== null) return false;
    return exactAfterAllowedDelta(previous, next, (expected) => { expected.sessions['w3-m2'] = structuredClone(candidate); });
  }
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w3-m2']!;
    session.workspace = structuredClone(candidate.workspace); session.lastTrace = []; session.lastRun = null; session.checkpointResults = []; session.failureSnapshot = null; session.lastRunAt = null; session.savedAt = candidate.savedAt;
  });
}

function exactCuilanRunDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w3-m2']; const candidate = next.sessions['w3-m2'];
  if (!prior || !candidate?.lastRun || candidate.lastRunAt === null || next.missions['w3-m2'] !== undefined || canonicalJson(candidate.workspace) !== canonicalJson(prior.workspace) || canonicalJson(candidate.usedHintTiers) !== canonicalJson(prior.usedHintTiers) || canonicalJson(candidate.conditionObservationUses) !== canonicalJson(prior.conditionObservationUses) || candidate.totalRuns !== prior.totalRuns + 1) return false;
  const diagnostic = candidate.lastRun.diagnostic; const expectedFailures = structuredClone(prior.conceptFailures);
  const expectedRuntimeFailures = candidate.lastRun.completed ? prior.runtimeFailures : prior.runtimeFailures + 1;
  if (!candidate.lastRun.completed) {
    if (!diagnostic || !isPlainRecord(diagnostic)) return false;
    if (diagnostic.concept === 'condition-selection') expectedFailures.conditionSelection += 1;
    else if (diagnostic.concept === 'branch-routing') expectedFailures.branchRouting += 1;
    else if (diagnostic.concept === 'sequence-precondition') expectedFailures.sequencePrecondition += 1;
    else expectedFailures.completeness += 1;
  }
  if (candidate.runtimeFailures !== expectedRuntimeFailures || canonicalJson(candidate.conceptFailures) !== canonicalJson(expectedFailures)) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w3-m2']!;
    session.lastTrace = structuredClone(candidate.lastTrace); session.lastRun = structuredClone(candidate.lastRun); session.checkpointResults = structuredClone(candidate.checkpointResults); session.failureSnapshot = structuredClone(candidate.failureSnapshot); session.totalRuns = candidate.totalRuns; session.runtimeFailures = candidate.runtimeFailures; session.conceptFailures = structuredClone(candidate.conceptFailures); session.lastRunAt = candidate.lastRunAt; session.savedAt = candidate.savedAt;
  });
}

function exactCuilanObservationDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w3-m2']; const candidate = next.sessions['w3-m2']; const observation = candidate?.conditionObservationUses.at(-1);
  if (!prior || !candidate || !observation || candidate.conditionObservationUses.length !== prior.conditionObservationUses.length + 1 || canonicalJson(candidate.conditionObservationUses.slice(0, -1)) !== canonicalJson(prior.conditionObservationUses) || prior.conditionObservationUses.some((use) => use.snapshotId === observation.snapshotId)) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => { const session = expected.sessions['w3-m2']!; session.conditionObservationUses.push(structuredClone(observation)); session.savedAt = candidate.savedAt; });
}

function exactCuilanCompletionDelta(previous: ProgressV3, next: ProgressV3) {
  const session = previous.sessions['w3-m2']; const completion = next.missions['w3-m2']; const evidence = next.missionCompletionEvidence['w3-m2']; const run = session?.lastRun;
  if (!session || previous.missions['w3-m2'] !== undefined || !completion || evidence?.kind !== 'formal-v3' || !run || !run.completed || run.diagnostic !== null || run.failureSnapshot !== null || session.failureSnapshot !== null || run.finalState !== 'demon-fled' || run.penalty.livesLost !== 0 || run.penalty.resourcesLost !== 0 || run.penalty.starsLost !== 0 || completion.status !== 'completed' || !Number.isSafeInteger(completion.stars) || completion.stars < 1 || completion.stars > 3 || completion.attempts !== 1 || !Number.isSafeInteger(completion.hintsUsed) || completion.hintsUsed < 0 || completion.completedAt !== next.savedAt || evidence.completedAt !== completion.completedAt || evidence.verifiedAt !== next.savedAt || canonicalJson(evidence.workspace) !== canonicalJson(session.workspace) || canonicalJson(evidence.trace) !== canonicalJson(session.lastTrace) || canonicalJson(evidence.run) !== canonicalJson(run)) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => { expected.missions['w3-m2'] = structuredClone(completion); expected.missionCompletionEvidence['w3-m2'] = structuredClone(evidence); });
}

function isYunzhanWorkspace(value: unknown): boolean { return isPlainRecord(value) && value.missionId === 'w3-m3'; }
function hasZeroYunzhanCounters(session: NonNullable<ProgressV3['sessions']['w3-m3']>): boolean {
  return session.totalRuns === 0 && session.runtimeFailures === 0 && session.compileFailures === 0
    && canonicalJson(session.conceptFailures) === canonicalJson({ programStructure: 0, branchRouting: 0, completeness: 0 });
}
function exactYunzhanDraftDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w3-m3']; const candidate = next.sessions['w3-m3'];
  if (!candidate || next.missions['w3-m3'] !== undefined || (prior && canonicalJson(prior) === canonicalJson(candidate))) return false;
  if (!prior) {
    if (!isYunzhanWorkspace(candidate.workspace) || !hasZeroYunzhanCounters(candidate) || !hasEmptyArray(candidate.usedHintTiers) || !hasEmptyArray(candidate.lastTrace) || !hasEmptyArray(candidate.roundResults) || !hasEmptyArray(candidate.conditionObservationUses) || candidate.lastRun !== null || candidate.failureSnapshot !== null || candidate.lastRunAt !== null) return false;
    return exactAfterAllowedDelta(previous, next, (expected) => { expected.sessions['w3-m3'] = structuredClone(candidate); });
  }
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w3-m3']!;
    session.workspace = structuredClone(candidate.workspace); session.lastTrace = []; session.lastRun = null; session.roundResults = []; session.failureSnapshot = null; session.lastRunAt = null; session.savedAt = candidate.savedAt;
  });
}
function exactYunzhanRunDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w3-m3']; const candidate = next.sessions['w3-m3'];
  if (!prior || !candidate?.lastRun || candidate.lastRunAt === null || next.missions['w3-m3'] !== undefined || canonicalJson(candidate.workspace) !== canonicalJson(prior.workspace) || canonicalJson(candidate.usedHintTiers) !== canonicalJson(prior.usedHintTiers) || canonicalJson(candidate.conditionObservationUses) !== canonicalJson(prior.conditionObservationUses) || candidate.totalRuns !== prior.totalRuns + 1) return false;
  const expectedFailures = structuredClone(prior.conceptFailures); const expectedRuntimeFailures = candidate.lastRun.completed ? prior.runtimeFailures : prior.runtimeFailures + 1;
  if (!candidate.lastRun.completed) {
    if (!candidate.lastRun.diagnostic || !isPlainRecord(candidate.lastRun.diagnostic)) return false;
    if (candidate.lastRun.diagnostic.concept === 'branch-routing') expectedFailures.branchRouting += 1; else expectedFailures.completeness += 1;
  }
  if (candidate.runtimeFailures !== expectedRuntimeFailures || canonicalJson(candidate.conceptFailures) !== canonicalJson(expectedFailures)) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => {
    const session = expected.sessions['w3-m3']!;
    session.lastTrace = structuredClone(candidate.lastTrace); session.lastRun = structuredClone(candidate.lastRun); session.roundResults = structuredClone(candidate.roundResults); session.failureSnapshot = structuredClone(candidate.failureSnapshot); session.totalRuns = candidate.totalRuns; session.runtimeFailures = candidate.runtimeFailures; session.conceptFailures = structuredClone(candidate.conceptFailures); session.lastRunAt = candidate.lastRunAt; session.savedAt = candidate.savedAt;
  });
}
function exactYunzhanObservationDelta(previous: ProgressV3, next: ProgressV3) {
  const prior = previous.sessions['w3-m3']; const candidate = next.sessions['w3-m3']; const observation = candidate?.conditionObservationUses.at(-1);
  if (!prior || !candidate || !observation || candidate.conditionObservationUses.length !== prior.conditionObservationUses.length + 1 || canonicalJson(candidate.conditionObservationUses.slice(0, -1)) !== canonicalJson(prior.conditionObservationUses) || prior.conditionObservationUses.some((use) => use.snapshotId === observation.snapshotId)) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => { const session = expected.sessions['w3-m3']!; session.conditionObservationUses.push(structuredClone(observation)); session.savedAt = candidate.savedAt; });
}
function exactYunzhanCompletionDelta(previous: ProgressV3, next: ProgressV3) {
  const session = previous.sessions['w3-m3']; const completion = next.missions['w3-m3']; const evidence = next.missionCompletionEvidence['w3-m3']; const run = session?.lastRun;
  if (!session || previous.missions['w3-m3'] !== undefined || !completion || evidence?.kind !== 'formal-v3' || !run || !run.completed || run.diagnostic !== null || run.failureSnapshot !== null || session.failureSnapshot !== null || run.finalState !== 'origin-explained' || run.penalty.livesLost !== 0 || run.penalty.resourcesLost !== 0 || run.penalty.starsLost !== 0 || completion.status !== 'completed' || !Number.isSafeInteger(completion.stars) || completion.stars < 1 || completion.stars > 3 || !Number.isSafeInteger(completion.hintsUsed) || completion.hintsUsed < 0 || completion.attempts !== 1 || completion.completedAt !== next.savedAt || evidence.completedAt !== completion.completedAt || evidence.verifiedAt !== next.savedAt || canonicalJson(evidence.workspace) !== canonicalJson(session.workspace) || canonicalJson(evidence.trace) !== canonicalJson(session.lastTrace) || canonicalJson(evidence.run) !== canonicalJson(run)) return false;
  return exactAfterAllowedDelta(previous, next, (expected) => { expected.missions['w3-m3'] = structuredClone(completion); expected.missionCompletionEvidence['w3-m3'] = structuredClone(evidence); });
}

export const storageFaultAdapter: StorageFaultAdapter = {
  beforeProgressWrite: ({ storage, progress }) => {
    const mode = storage.getItem(MODE_KEY);
    const previous = currentProgress(storage);
    if (!previous) return null;
    if (mode === 'fail-regalia-draft' && exactDraftDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-regalia-session' && exactSessionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-regalia-completion' && exactCompletionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-monkey-draft' && exactMonkeyDraftDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-monkey-session' && exactMonkeySessionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-monkey-completion' && exactMonkeyCompletionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-peach-draft' && exactPeachDraftDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-peach-session' && exactPeachSessionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-peach-completion' && exactPeachCompletionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-furnace-draft' && exactFurnaceDraftDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-furnace-session' && exactFurnaceSessionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-boss-draft' && exactBossDraftDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-boss-session' && exactBossSessionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-boss-completion' && exactBossCompletionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-manor-draft' && exactManorDraftDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-manor-session' && exactManorSessionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-manor-observation' && exactManorObservationDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-manor-completion' && exactManorCompletionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-cuilan-draft' && exactCuilanDraftDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-cuilan-run' && exactCuilanRunDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-cuilan-observation' && exactCuilanObservationDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-cuilan-completion' && exactCuilanCompletionDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-yunzhan-draft' && exactYunzhanDraftDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-yunzhan-run' && exactYunzhanRunDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-yunzhan-observation' && exactYunzhanObservationDelta(previous, progress)) return FAILURE;
    if (mode === 'fail-yunzhan-completion' && exactYunzhanCompletionDelta(previous, progress)) return FAILURE;
    const advancedFailure = advancedStorageFaultHandler({ storage, progress });
    if (advancedFailure !== null) return advancedFailure;
    return null;
  },
  beforeProgressLoad: (storage) => {
    const mode = storage.getItem(MODE_KEY);
    if (mode !== 'corrupt-regalia-current' && mode !== 'corrupt-advanced-current' && mode !== 'corrupt-horse-current' && mode !== 'corrupt-monkey-current' && mode !== 'corrupt-peach-current' && mode !== 'corrupt-boss-current' && mode !== 'corrupt-manor-current' && mode !== 'corrupt-cuilan-current' && mode !== 'corrupt-yunzhan-current') return;
    const legal = storage.getItem(CURRENT_KEY);
    if (legal !== null) storage.setItem(SNAPSHOT_KEY, legal);
    storage.setItem(CURRENT_KEY, mode === 'corrupt-regalia-current' ? '{broken w1-m3 current' : mode === 'corrupt-advanced-current' ? '{broken advanced current' : mode === 'corrupt-horse-current' ? '{broken w2-m1 current' : mode === 'corrupt-monkey-current' ? '{broken w2-m2 current' : mode === 'corrupt-peach-current' ? '{broken w2-m3 current' : mode === 'corrupt-boss-current' ? '{broken w2-m5 current' : mode === 'corrupt-manor-current' ? '{broken w3-m1 current' : mode === 'corrupt-cuilan-current' ? '{broken w3-m2 current' : '{broken w3-m3 current');
    storage.setItem(MODE_KEY, 'off');
  },
};
