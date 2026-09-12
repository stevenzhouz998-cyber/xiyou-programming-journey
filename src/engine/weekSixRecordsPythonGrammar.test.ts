import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEEK_SIX_RECORDS_PYTHON,
  SOLVED_WEEK_SIX_RECORDS_PYTHON,
  parseWeekSixRecordsPython,
} from './weekSixRecordsPythonGrammar';

describe('W6-M1 structured records Python grammar', () => {
  it('keeps the default program executable but proves the second field is wrong', () => {
    const parsed = parseWeekSixRecordsPython(DEFAULT_WEEK_SIX_RECORDS_PYTHON);
    expect('state' in parsed).toBe(false);
    if ('state' in parsed) return;
    expect(parsed.run.completed).toBe(false);
    expect(parsed.run.state).toBe('field-read-conflict');
    expect(parsed.run.rows).toEqual([
      { attempt: '一调', story: '一调' },
      { attempt: '二调', story: '二调' },
      { attempt: '三调', story: '三调' },
    ]);
    expect(parsed.run.failureSnapshots).toHaveLength(1);
    expect(parsed.run.failureSnapshots[0]?.sourceSpans).toEqual([
      expect.objectContaining({ line: 8 }),
    ]);
  });

  it('derives a successful table only from each current dictionary and both field reads', () => {
    const parsed = parseWeekSixRecordsPython(SOLVED_WEEK_SIX_RECORDS_PYTHON);
    expect('state' in parsed).toBe(false);
    if ('state' in parsed) return;
    expect(parsed.run).toMatchObject({ state: 'records-proven', completed: true, failureSnapshots: [] });
    expect(parsed.run.rows).toEqual([
      { attempt: '一调', story: '得到假扇，火势更旺' },
      { attempt: '二调', story: '取得真扇，随后被骗回' },
      { attempt: '三调', story: '最终借得真扇，灭火通行' },
    ]);
    expect(parsed.trace.filter((event) => event.kind === 'field-read')).toHaveLength(6);
  });

  it.each([
    ['hard-coded rows', 'record_attempt("一调", "得到假扇，火势更旺")'],
    ['fixed first item', 'for record in records:\n    record_attempt(records[0]["第几调"], records[0]["经过"])'],
    ['printing', 'for record in records:\n    print(record["第几调"], record["经过"])'],
    ['import', 'import os'],
    ['attribute access', 'for record in records:\n    record_attempt(record.get("第几调"), record.get("经过"))'],
    ['unknown function', 'for record in records:\n    send(record["第几调"], record["经过"])'],
    ['missing field', 'records = [{"第几调": "一调"}]\nfor record in records:\n    record_attempt(record["第几调"], record["经过"])'],
    ['duplicate dictionary key', 'records = [{"第几调": "一调", "第几调": "二调", "经过": "得到假扇，火势更旺"}]\nfor record in records:\n    record_attempt(record["第几调"], record["经过"])'],
  ])('rejects %s as formal success', (_label, source) => {
    const parsed = parseWeekSixRecordsPython(source);
    expect('state' in parsed ? parsed.state : parsed.run.completed).not.toBe(true);
  });

  it('allows comments, formatting, and dictionary key order without changing semantics', () => {
    const source = `# 火焰山事实表\nrecords = [\n      {"经过": "得到假扇，火势更旺", "第几调": "一调"},\n      {"经过": "取得真扇，随后被骗回", "第几调": "二调"},\n      {"经过": "最终借得真扇，灭火通行", "第几调": "三调"},\n]\nfor record in records:\n    record_attempt( record["第几调"] , record["经过"] )\n`;
    const parsed = parseWeekSixRecordsPython(source);
    expect('state' in parsed).toBe(false);
    if (!('state' in parsed)) expect(parsed.run.completed).toBe(true);
  });
});
