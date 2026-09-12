import { WEEK_SIX_RECORD_FACTS, type WeekSixRecordsRow } from './weekSixRecordsContract';

export type WeekSixAttempt = '一调' | '二调' | '三调';
export type FanAuthenticityLabel = 'genuine' | 'false' | null;
export type PassageOutcomeLabel = 'passed' | 'not-passed' | null;
export type PracticeAuthenticityLabel = 'genuine' | 'false' | 'insufficient' | null;

export type WeekSixEvidenceId = 'one-not-real'|'one-fire-worse'|'two-true-fan'|'two-stolen-back'|'three-true-fan'|'three-fire-cleared';

export interface WeekSixClassificationSelection {
  attempt: WeekSixAttempt;
  fanAuthenticity: FanAuthenticityLabel;
  fanEvidenceId: WeekSixEvidenceId | null;
  passageOutcome: PassageOutcomeLabel;
  passageEvidenceId: WeekSixEvidenceId | null;
}

export interface WeekSixClassificationInput {
  labels: WeekSixClassificationSelection[];
  practiceAuthenticity: PracticeAuthenticityLabel;
}

export interface WeekSixClassificationGroups {
  authenticity: { genuine: WeekSixAttempt[]; false: WeekSixAttempt[]; unlabelled: WeekSixAttempt[] };
  passage: { passed: WeekSixAttempt[]; notPassed: WeekSixAttempt[]; unlabelled: WeekSixAttempt[] };
}

export type WeekSixClassificationState =
  | 'source-invalid'
  | 'input-invalid'
  | 'selection-incomplete'
  | 'label-conflict'
  | 'evidence-conflict'
  | 'practice-conflict'
  | 'classification-proven';

export interface WeekSixClassificationFailureSnapshot {
  snapshotId: string;
  result: Exclude<WeekSixClassificationState, 'classification-proven'>;
  attempt: WeekSixAttempt | '材料练习' | null;
  dimension: 'fan-authenticity' | 'passage-outcome' | 'practice' | 'source' | 'input';
}

export interface WeekSixClassificationRunResult {
  state: WeekSixClassificationState;
  completed: boolean;
  groups: WeekSixClassificationGroups;
  failureSnapshots: WeekSixClassificationFailureSnapshot[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

export function createEmptyWeekSixClassificationInput(): WeekSixClassificationInput {
  return {
    labels: (['一调', '二调', '三调'] as const).map((attempt) => ({
      attempt, fanAuthenticity: null, fanEvidenceId: null, passageOutcome: null, passageEvidenceId: null,
    })),
    practiceAuthenticity: null,
  };
}

const canonicalSource = WEEK_SIX_RECORD_FACTS;
const attempts = canonicalSource.map((row) => row.attempt) as WeekSixAttempt[];
const evidenceIds = new Set<WeekSixEvidenceId>(['one-not-real','one-fire-worse','two-true-fan','two-stolen-back','three-true-fan','three-fire-cleared']);
const answers: Record<WeekSixAttempt, { fan: Exclude<FanAuthenticityLabel, null>; fanEvidence: WeekSixEvidenceId; passage: Exclude<PassageOutcomeLabel, null>; passageEvidence: WeekSixEvidenceId }> = {
  一调: { fan: 'false', fanEvidence: 'one-not-real', passage: 'not-passed', passageEvidence: 'one-fire-worse' },
  二调: { fan: 'genuine', fanEvidence: 'two-true-fan', passage: 'not-passed', passageEvidence: 'two-stolen-back' },
  三调: { fan: 'genuine', fanEvidence: 'three-true-fan', passage: 'passed', passageEvidence: 'three-fire-cleared' },
};
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const exact = (value: Record<string, unknown>, keys: string[]) => Reflect.ownKeys(value).length === keys.length && Reflect.ownKeys(value).every((key) => typeof key === 'string' && keys.includes(key));

function emptyGroups(): WeekSixClassificationGroups {
  return { authenticity: { genuine: [], false: [], unlabelled: [] }, passage: { passed: [], notPassed: [], unlabelled: [] } };
}
const penalty={livesLost:0,resourcesLost:0,starsLost:0} as const;

function failure(state: Exclude<WeekSixClassificationState, 'classification-proven'>, groups: WeekSixClassificationGroups, attempt: WeekSixClassificationFailureSnapshot['attempt'], dimension: WeekSixClassificationFailureSnapshot['dimension']): WeekSixClassificationRunResult {
  return { state, completed: false, groups, failureSnapshots: [{ snapshotId: `${state}:${attempt??''}:${dimension}`, result: state, attempt, dimension }], penalty };
}

function parsedInput(value: unknown): WeekSixClassificationInput | null {
  if (!plain(value) || !exact(value, ['labels', 'practiceAuthenticity']) || !Array.isArray(value.labels) || value.labels.length !== 3 || ![null, 'genuine', 'false', 'insufficient'].includes(value.practiceAuthenticity as never)) return null;
  const labels: WeekSixClassificationSelection[] = [];
  for (const raw of value.labels) {
    if (!plain(raw) || !exact(raw, ['attempt', 'fanAuthenticity', 'fanEvidenceId', 'passageOutcome', 'passageEvidenceId']) || !attempts.includes(raw.attempt as WeekSixAttempt)
      || ![null, 'genuine', 'false'].includes(raw.fanAuthenticity as never) || ![null, 'passed', 'not-passed'].includes(raw.passageOutcome as never)
      || !(raw.fanEvidenceId === null || evidenceIds.has(raw.fanEvidenceId as WeekSixEvidenceId)) || !(raw.passageEvidenceId === null || evidenceIds.has(raw.passageEvidenceId as WeekSixEvidenceId))) return null;
    labels.push(raw as unknown as WeekSixClassificationSelection);
  }
  if (new Set(labels.map((label) => label.attempt)).size !== 3) return null;
  return { labels, practiceAuthenticity: value.practiceAuthenticity as PracticeAuthenticityLabel };
}

export function runWeekSixClassification(input: unknown, sourceRows: unknown): WeekSixClassificationRunResult {
  const blank = emptyGroups();
  if (!same(sourceRows, canonicalSource)) return failure('source-invalid', blank, null, 'source');
  const parsed = parsedInput(input);
  if (!parsed) return failure('input-invalid', blank, null, 'input');
  const byAttempt = new Map(parsed.labels.map((label) => [label.attempt, label]));
  const groups = emptyGroups();
  for (const attempt of attempts) {
    const label = byAttempt.get(attempt)!;
    (label.fanAuthenticity === 'genuine' ? groups.authenticity.genuine : label.fanAuthenticity === 'false' ? groups.authenticity.false : groups.authenticity.unlabelled).push(attempt);
    (label.passageOutcome === 'passed' ? groups.passage.passed : label.passageOutcome === 'not-passed' ? groups.passage.notPassed : groups.passage.unlabelled).push(attempt);
  }
  for (const attempt of attempts) {
    const label = byAttempt.get(attempt)!; const answer = answers[attempt];
    if (label.fanAuthenticity === null || label.fanEvidenceId === null) return failure('selection-incomplete', groups, attempt, 'fan-authenticity');
    if (label.passageOutcome === null || label.passageEvidenceId === null) return failure('selection-incomplete', groups, attempt, 'passage-outcome');
    if (label.fanAuthenticity !== answer.fan) return failure('label-conflict', groups, attempt, 'fan-authenticity');
    if (label.fanEvidenceId !== answer.fanEvidence) return failure('evidence-conflict', groups, attempt, 'fan-authenticity');
    if (label.passageOutcome !== answer.passage) return failure('label-conflict', groups, attempt, 'passage-outcome');
    if (label.passageEvidenceId !== answer.passageEvidence) return failure('evidence-conflict', groups, attempt, 'passage-outcome');
  }
  if (parsed.practiceAuthenticity === null) return failure('selection-incomplete', groups, '材料练习', 'practice');
  if (parsed.practiceAuthenticity !== 'insufficient') return failure('practice-conflict', groups, '材料练习', 'practice');
  return { state: 'classification-proven', completed: true, groups, failureSnapshots: [], penalty };
}
