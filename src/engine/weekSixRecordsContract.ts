export const WEEK_SIX_RECORD_FACTS = [
  { attempt: '一调', story: '得到假扇，火势更旺' },
  { attempt: '二调', story: '取得真扇，随后被骗回' },
  { attempt: '三调', story: '最终借得真扇，灭火通行' },
] as const;

export type WeekSixRecordsRow = { attempt: string; story: string };
export type WeekSixRecordsTraceItem =
  | { kind: 'records-defined'; records: WeekSixRecordsRow[]; line: number; order: number }
  | { kind: 'loop-started'; variable: 'record'; source: 'records'; line: number; order: number }
  | { kind: 'field-read'; iteration: number; field: string; value: string; argument: 1 | 2; line: number; order: number }
  | { kind: 'action'; action: 'record_attempt'; iteration: number; attempt: string; story: string; line: number; order: number };

export type WeekSixRecordsState = 'record-shape-conflict' | 'field-read-conflict' | 'records-proven' | 'python-structure-invalid';
export interface WeekSixRecordsFailureSnapshot {
  snapshotId: string;
  result: Exclude<WeekSixRecordsState, 'records-proven' | 'python-structure-invalid'>;
  message: string;
  sourceSpans: Array<{ line: number; from: number; to: number }>;
}
export interface WeekSixRecordsRunResult {
  state: WeekSixRecordsState;
  completed: boolean;
  rows: WeekSixRecordsRow[];
  failureSnapshots: WeekSixRecordsFailureSnapshot[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export function runWeekSixRecordsTrace(raw: unknown): WeekSixRecordsRunResult {
  const penalty = { livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const };
  const invalid = (): WeekSixRecordsRunResult => ({ state: 'python-structure-invalid', completed: false, rows: [], failureSnapshots: [], penalty });
  if (!Array.isArray(raw)) return invalid();
  const events = raw as WeekSixRecordsTraceItem[];
  const defined = events[0]; const loop = events[1];
  if (!defined || defined.kind !== 'records-defined' || !loop || loop.kind !== 'loop-started') return invalid();
  if (!Array.isArray(defined.records) || defined.records.some((row) => !row || typeof row.attempt !== 'string' || typeof row.story !== 'string')) return invalid();
  const rows: WeekSixRecordsRow[] = [];
  let cursor = 2;
  for (let iteration = 1; iteration <= defined.records.length; iteration += 1) {
    const first = events[cursor++]; const second = events[cursor++]; const action = events[cursor++];
    if (!first || first.kind !== 'field-read' || first.iteration !== iteration || first.argument !== 1
      || !second || second.kind !== 'field-read' || second.iteration !== iteration || second.argument !== 2
      || !action || action.kind !== 'action' || action.iteration !== iteration
      || action.attempt !== first.value || action.story !== second.value) return invalid();
    rows.push({ attempt: action.attempt, story: action.story });
  }
  if (cursor !== events.length) return invalid();
  const canonicalRecords = WEEK_SIX_RECORD_FACTS.map((row) => ({ ...row }));
  if (!same(defined.records, canonicalRecords)) {
    return { state: 'record-shape-conflict', completed: false, rows, failureSnapshots: [{ snapshotId: `w6-records-${JSON.stringify(defined.records)}`, result: 'record-shape-conflict', message: '三张事实记录还没有完整保留公开的调次和经过。', sourceSpans: [{ line: defined.line, from: 0, to: 7 }] }], penalty };
  }
  const fieldsCorrect = events.filter((event): event is Extract<WeekSixRecordsTraceItem, {kind:'field-read'}> => event.kind === 'field-read')
    .every((event) => event.field === (event.argument === 1 ? '第几调' : '经过'));
  if (!fieldsCorrect || !same(rows, canonicalRecords)) {
    const bad = events.find((event): event is Extract<WeekSixRecordsTraceItem, {kind:'field-read'}> => event.kind === 'field-read' && event.field !== (event.argument === 1 ? '第几调' : '经过'));
    const message=bad?.argument===1?'第一列没有读取“第几调”字段。':'第一行的经过栏重复了调次，还没有记录发生的事情。';
    return { state: 'field-read-conflict', completed: false, rows, failureSnapshots: [{ snapshotId: `w6-field-${bad?.line ?? 0}-${bad?.argument ?? 0}`, result: 'field-read-conflict', message, sourceSpans: [{ line: bad?.line ?? loop.line + 1, from: 0, to: 80 }] }], penalty };
  }
  return { state: 'records-proven', completed: true, rows, failureSnapshots: [], penalty };
}
