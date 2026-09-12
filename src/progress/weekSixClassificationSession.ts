import type { WeekSixRecordsRow } from '../engine/weekSixRecordsContract';
import type {
  WeekSixClassificationFailureSnapshot,
  WeekSixClassificationInput,
  WeekSixClassificationRunResult,
} from '../engine/weekSixClassificationContract';
import { createEmptyWeekSixClassificationInput, runWeekSixClassification } from '../engine/weekSixClassificationContract';

export interface WeekSixClassificationMissionSession {
  kind: 'ai-evidence-classification-v1';
  sourceWorkId: 'w6-m1-structured-records-table';
  sourceVerifiedAt: string;
  sourceRows: WeekSixRecordsRow[];
  input: WeekSixClassificationInput;
  groupingDimension: 'authenticity' | 'passage';
  lastRun: WeekSixClassificationRunResult | null;
  failureSnapshot: WeekSixClassificationFailureSnapshot | null;
  totalChecks: number;
  incompleteChecks: number;
  labelFailures: number;
  evidenceFailures: number;
  practiceFailures: number;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  firstBlockingConcept: 'selection' | 'label' | 'evidence' | 'practice' | null;
  lastCheckedAt: string | null;
  savedAt: string;
}

const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const checkedTime = (now: string) => { if (!UTC.test(now) || new Date(now).toISOString() !== now) throw Error('W6-M2 会话时间必须是标准 UTC ISO。'); };
const after = (session: WeekSixClassificationMissionSession, now: string) => { checkedTime(now); if (now < session.savedAt) throw Error('W6-M2 会话时间不得倒退。'); };
const increment = (value: number) => { if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) throw Error('W6-M2 计数超出安全范围。'); return value + 1; };

export function createWeekSixClassificationSession(source: { workId: 'w6-m1-structured-records-table'; verifiedAt: string; rows: WeekSixRecordsRow[] }, now: string): WeekSixClassificationMissionSession {
  checkedTime(now); checkedTime(source.verifiedAt);
  const input = createEmptyWeekSixClassificationInput();
  if (source.verifiedAt > now || source.workId !== 'w6-m1-structured-records-table' || runWeekSixClassification(input, source.rows).state === 'source-invalid') throw Error('W6-M2 来源作品无效。');
  return { kind: 'ai-evidence-classification-v1', sourceWorkId: source.workId, sourceVerifiedAt: source.verifiedAt, sourceRows: structuredClone(source.rows), input, groupingDimension: 'authenticity', lastRun: null, failureSnapshot: null, totalChecks: 0, incompleteChecks: 0, labelFailures: 0, evidenceFailures: 0, practiceFailures: 0, usedHintTiers: [], firstBlockingConcept: null, lastCheckedAt: null, savedAt: now };
}

export function updateWeekSixClassificationInput(session: WeekSixClassificationMissionSession, input: WeekSixClassificationInput, now: string): WeekSixClassificationMissionSession {
  after(session, now); const preview = runWeekSixClassification(input, session.sourceRows);
  if (preview.state === 'source-invalid' || preview.state === 'input-invalid') throw Error('W6-M2 分类输入无效。');
  if (same(input, session.input)) return structuredClone(session);
  return { ...structuredClone(session), input: structuredClone(input), lastRun: null, failureSnapshot: null, lastCheckedAt: null, savedAt: now };
}

export function updateWeekSixClassificationGrouping(session: WeekSixClassificationMissionSession, dimension: 'authenticity' | 'passage', now: string): WeekSixClassificationMissionSession {
  after(session, now); if (dimension !== 'authenticity' && dimension !== 'passage') throw Error('W6-M2 分组维度无效。');
  if (dimension === session.groupingDimension) return structuredClone(session);
  return { ...structuredClone(session), groupingDimension: dimension, savedAt: now };
}

export function recordWeekSixClassificationCheck(session: WeekSixClassificationMissionSession, input: WeekSixClassificationInput, run: WeekSixClassificationRunResult, now: string): WeekSixClassificationMissionSession {
  after(session, now); if (!same(input, session.input)) throw Error('W6-M2 核验必须来自当前保存的分类输入。');
  const canonical = runWeekSixClassification(session.input, session.sourceRows);
  if (canonical.state === 'source-invalid' || canonical.state === 'input-invalid' || !same(run, canonical)) throw Error('W6-M2 核验证据必须由当前输入确定性重算。');
  const next = structuredClone(session); next.lastRun = structuredClone(canonical); next.failureSnapshot = structuredClone(canonical.failureSnapshots[0] ?? null); next.totalChecks = increment(next.totalChecks); next.lastCheckedAt = now; next.savedAt = now;
  const concept = canonical.state === 'selection-incomplete' ? 'selection' : canonical.state === 'label-conflict' ? 'label' : canonical.state === 'evidence-conflict' ? 'evidence' : canonical.state === 'practice-conflict' ? 'practice' : null;
  if (concept === 'selection') next.incompleteChecks = increment(next.incompleteChecks);
  if (concept === 'label') next.labelFailures = increment(next.labelFailures);
  if (concept === 'evidence') next.evidenceFailures = increment(next.evidenceFailures);
  if (concept === 'practice') next.practiceFailures = increment(next.practiceFailures);
  if (next.firstBlockingConcept === null && concept !== null) next.firstBlockingConcept = concept;
  return next;
}

export function recordWeekSixClassificationHint(session: WeekSixClassificationMissionSession, tier: 'observe' | 'think' | 'partial', now: string): WeekSixClassificationMissionSession {
  after(session, now); if (!['observe', 'think', 'partial'].includes(tier)) throw Error('W6-M2 提示层级无效。'); const next = structuredClone(session); if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier); next.savedAt = now; return next;
}
