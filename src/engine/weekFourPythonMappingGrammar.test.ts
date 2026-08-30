import { describe, expect, it } from 'vitest';
import { DEFAULT_WEEK_FOUR_MAPPING_PYTHON, parseWeekFourMappingPython, SOLVED_WEEK_FOUR_MAPPING_PYTHON } from './weekFourPythonMappingGrammar';

describe('W4-M1 exact Python allowlist grammar', () => {
  it('derives the editable source span and canonical trace from the exact four-line grammar', () => {
    expect(parseWeekFourMappingPython(DEFAULT_WEEK_FOUR_MAPPING_PYTHON)).toMatchObject({ field: 'appearance', sourceSpan: { line: 1, from: 3, to: 13 } });
    expect(parseWeekFourMappingPython(SOLVED_WEEK_FOUR_MAPPING_PYTHON).trace.map((item) => item.branchAction)).toEqual(['continue-verification', 'polite-pass']);
  });

  it.each(['import os', 'open("x")', 'from js import fetch', 'identity.__class__', 'while True:\n pass', 'print("白骨精")', `${DEFAULT_WEEK_FOUR_MAPPING_PYTHON}\npolite_pass()`])('rejects non-allowlisted Python: %s', (code) => {
    expect(() => parseWeekFourMappingPython(code)).toThrow();
  });
});
