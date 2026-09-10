import { describe, expect, it } from 'vitest';
import { DEFAULT_WEEK_FOUR_BOSS_PYTHON, parseWeekFourBossPython } from './weekFourBossPythonGrammar';
import { runWeekFourBossTrace } from './weekFourBossContract';
export const solved = 'for card in cards:\n    identity = read_identity(card)\n    if identity == "白骨精":\n        keep_observing(card)\n    else:\n        polite_help(card)';
describe('W4-M5 public two-round identity station', () => {
 it('separates identity and branch errors and executes both public rounds', () => {
  const start = parseWeekFourBossPython(DEFAULT_WEEK_FOUR_BOSS_PYTHON); if ('state' in start) throw Error('invalid default');
  expect(start.run.state).toBe('identity-conflict'); expect(start.trace).toHaveLength(8);
  const one = parseWeekFourBossPython(DEFAULT_WEEK_FOUR_BOSS_PYTHON.replace('read_appearance', 'read_identity')); if ('state' in one) throw Error(); expect(one.run.state).toBe('branch-conflict');
  const good = parseWeekFourBossPython(solved); if ('state' in good) throw Error(); expect(good.run.completed).toBe(true);
  expect(good.trace[4]?.cardId).toBe('practice');
  const onlyOne = good.trace.slice(0,4); expect(runWeekFourBossTrace(onlyOne).completed).toBe(false);
  const altered = structuredClone(good.trace); altered[4]!.action = 'keep_observing'; expect(runWeekFourBossTrace(altered).completed).toBe(false);
  const sparse = structuredClone(good.trace); delete sparse[2]; expect(runWeekFourBossTrace(sparse).state).toBe('python-structure-invalid');
 });
 it.each(['import os','while True:\n    pass',solved.replace('read_identity(card)','card.__class__'),solved.replace('for card in cards:', 'for card in []:'),solved+'\nprint(1)'])('rejects forbidden code %s', code => expect(parseWeekFourBossPython(code)).toMatchObject({state:'python-structure-invalid'}));
});
