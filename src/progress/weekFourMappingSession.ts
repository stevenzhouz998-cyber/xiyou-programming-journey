import { compileWeekFourMappingDraft, createDefaultWeekFourMappingDraft, type WeekFourMappingWorkspaceDraftV1 } from '../blockly/weekFourMappingDraft';
import { compareWeekFourMappingTraces, type WeekFourMappingFailureSnapshot, type WeekFourMappingRunResult, type WeekFourMappingTraceItem } from '../blockly/weekFourMappingContract';
import { DEFAULT_WEEK_FOUR_MAPPING_PYTHON, parseWeekFourMappingPython } from '../engine/weekFourPythonMappingGrammar';

export interface WeekFourMappingMissionSession {
  workspace: WeekFourMappingWorkspaceDraftV1;
  /** Compatibility-only neutral fields used by the shared session support APIs. */
  lastTrace: WeekFourMappingTraceItem[];
  runtimeFailures: number;
  compileFailures: number;
  pythonCode: string;
  pythonSourceSpan: { line: 1; from: number; to: number };
  lastBlocklyTrace: WeekFourMappingTraceItem[];
  lastPythonTrace: WeekFourMappingTraceItem[];
  lastRun: WeekFourMappingRunResult | null;
  failureSnapshot: WeekFourMappingFailureSnapshot | null;
  conditionObservationUses: Array<{ snapshotId: string; usedAt: string; workspace: WeekFourMappingWorkspaceDraftV1; pythonCode: string }>;
  totalRuns: number; semanticMismatchFailures: number; validationFailures: number; runnerInfrastructureFailures: number;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  conceptFailures: { mappingField: number; programStructure: number; safeExecution: number; completeness: number };
  lastRunAt: string | null; savedAt: string;
}
const iso = (value: string) => { if (new Date(value).toISOString() !== value) throw new Error('W4-M1 保存时间必须是标准 UTC ISO。'); };
const count = (value: number) => { if (!Number.isSafeInteger(value) || value < 0) throw new Error('W4-M1 计数无效。'); return value + 1; };
export function createWeekFourMappingSession(now: string): WeekFourMappingMissionSession {
  iso(now); const parsed = parseWeekFourMappingPython(DEFAULT_WEEK_FOUR_MAPPING_PYTHON);
  return { workspace: createDefaultWeekFourMappingDraft(), lastTrace: [], runtimeFailures: 0, compileFailures: 0, pythonCode: DEFAULT_WEEK_FOUR_MAPPING_PYTHON, pythonSourceSpan: parsed.sourceSpan, lastBlocklyTrace: [], lastPythonTrace: [], lastRun: null, failureSnapshot: null, conditionObservationUses: [], totalRuns: 0, semanticMismatchFailures: 0, validationFailures: 0, runnerInfrastructureFailures: 0, usedHintTiers: [], conceptFailures: { mappingField: 0, programStructure: 0, safeExecution: 0, completeness: 0 }, lastRunAt: null, savedAt: now };
}
export function updateWeekFourMappingCode(session: WeekFourMappingMissionSession, code: string, now: string): WeekFourMappingMissionSession {
  iso(now);
  if (code === session.pythonCode) return structuredClone(session);
  const parsed = parseWeekFourMappingPython(code);
  return { ...structuredClone(session), pythonCode: code, pythonSourceSpan: parsed.sourceSpan, lastBlocklyTrace: [], lastPythonTrace: [], lastRun: null, failureSnapshot: null, lastRunAt: null, savedAt: now };
}
export function recordWeekFourMappingRun(session: WeekFourMappingMissionSession, value: { blocklyTrace: WeekFourMappingTraceItem[]; pythonTrace: WeekFourMappingTraceItem[]; run: WeekFourMappingRunResult }, now: string): WeekFourMappingMissionSession {
  iso(now);
  const currentBlocklyTrace = compileWeekFourMappingDraft(session.workspace).trace;
  const currentPythonTrace = parseWeekFourMappingPython(session.pythonCode).trace;
  if (JSON.stringify(value.blocklyTrace) !== JSON.stringify(currentBlocklyTrace) || JSON.stringify(value.pythonTrace) !== JSON.stringify(currentPythonTrace)) throw new Error('W4-M1 运行 trace 必须来自当前保存的 Blockly 和 Python 输入。');
  const canonical = compareWeekFourMappingTraces(currentBlocklyTrace, currentPythonTrace);
  if (JSON.stringify(canonical) !== JSON.stringify(value.run)) throw new Error('W4-M1 对照运行不是当前输入的真实语义结果。');
  const next = structuredClone(session); next.lastBlocklyTrace = structuredClone(value.blocklyTrace); next.lastPythonTrace = structuredClone(value.pythonTrace); next.lastRun = structuredClone(canonical); next.failureSnapshot = canonical.failureSnapshot ? structuredClone(canonical.failureSnapshot) : null; next.totalRuns = count(next.totalRuns); if (!canonical.completed) { next.semanticMismatchFailures = count(next.semanticMismatchFailures); next.conceptFailures.mappingField = count(next.conceptFailures.mappingField); } next.lastRunAt = now; next.savedAt = now; return next;
}
export function recordWeekFourMappingValidationFailure(session: WeekFourMappingMissionSession, now: string): WeekFourMappingMissionSession { iso(now); const next = structuredClone(session); next.validationFailures = count(next.validationFailures); next.conceptFailures.safeExecution = count(next.conceptFailures.safeExecution); next.savedAt = now; return next; }
export function recordWeekFourMappingInfrastructureFailure(session: WeekFourMappingMissionSession, now: string): WeekFourMappingMissionSession { iso(now); const next = structuredClone(session); next.runnerInfrastructureFailures = count(next.runnerInfrastructureFailures); next.savedAt = now; return next; }
export function recordWeekFourMappingObservation(session: WeekFourMappingMissionSession, now: string): WeekFourMappingMissionSession { iso(now); if (!session.failureSnapshot) throw new Error('没有已保存的差异快照。'); const snapshotId = session.failureSnapshot.snapshotId; const next = structuredClone(session); if (!next.conditionObservationUses.some((item) => item.snapshotId === snapshotId)) next.conditionObservationUses.push({ snapshotId, usedAt: now, workspace: structuredClone(next.workspace), pythonCode: next.pythonCode }); next.savedAt = now; return next; }
export function recordWeekFourMappingHint(session: WeekFourMappingMissionSession, tier: 'observe' | 'think' | 'partial', now: string): WeekFourMappingMissionSession { iso(now); const next = structuredClone(session); if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier); next.savedAt = now; return next; }
