import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEEK_FOUR_VARIABLE_PYTHON,
  parseWeekFourVariablePython,
  SOLVED_WEEK_FOUR_VARIABLE_PYTHON,
} from './weekFourVariablePythonGrammar';

describe('W4-M2 exact variable Python grammar', () => {
  it('keeps the Worker raw-text gate and trace source tied to real callback events before AST execution', () => {
    const workerSource = readFileSync(`${process.cwd()}/src/workers/weekFourVariablePython.worker.ts`, 'utf8');

    expect(workerSource).toContain('normalized = candidate_code.replace("\\r\\n", "\\n")');
    expect(workerSource).toContain('if normalized not in (DEFAULT_CODE, SOLVED_CODE):');
    expect(workerSource).toContain('callback_events = []');
    expect(workerSource).toContain('callback_events.pop(0)');
    expect(workerSource).toContain('expected_source =');
    expect(workerSource).not.toContain('"source": "ordinary-eyes" if index == 0 else "fiery-eye-check"');
  });

  it('normalizes CRLF and derives the default overwrite trace from the saved three lines', () => {
    const parsed = parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON.replaceAll('\n', '\r\n'));

    expect(parsed).toMatchObject({
      target: 'appearance',
      sourceSpan: { line: 2, from: 0, to: 10 },
      run: { completed: false, finalState: 'evidence-unsealed' },
    });
    expect(parsed.trace).toMatchObject([
      { kind: 'assign', line: 1, target: 'appearance', source: 'ordinary-eyes', value: '送斋女子', previousValue: null, overwrote: false, span: { line: 1, from: 0, to: 10 } },
      { kind: 'assign', line: 2, target: 'appearance', source: 'fiery-eye-check', value: '白骨精', previousValue: '送斋女子', overwrote: true, span: { line: 2, from: 0, to: 10 } },
      { kind: 'seal', line: 3, executed: false, appearance: '白骨精', identity: null, missingVariable: 'identity', span: { line: 3, from: 0, to: 33 } },
    ]);
  });

  it('derives the sealed trace only when line two writes the identity evidence label', () => {
    const parsed = parseWeekFourVariablePython(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);

    expect(parsed).toMatchObject({
      target: 'identity',
      sourceSpan: { line: 2, from: 0, to: 8 },
      run: { completed: true, finalState: 'evidence-sealed', sealedRecord: { appearance: '送斋女子', identity: '白骨精' } },
    });
    expect(parsed.trace.at(-1)).toMatchObject({ kind: 'seal', executed: true, appearance: '送斋女子', identity: '白骨精', missingVariable: null });
  });

  it.each([
    'identity = ordinary_eyes()\nappearance = fiery_eye_check()\nseal_record(appearance, identity)',
    'appearance = fiery_eye_check()\nappearance = ordinary_eyes()\nseal_record(appearance, identity)',
    'appearance = ordinary_eyes()\nappearance = fiery_eye_check(1)\nseal_record(appearance, identity)',
    'appearance = ordinary_eyes()\nappearance = fiery_eye_check()\nseal_record(identity, appearance)',
    'appearance = ordinary_eyes()\nappearance = fiery_eye_check()\nseal_record(appearance, identity)\n',
    'appearance = ordinary_eyes()\n    appearance = fiery_eye_check()\nseal_record(appearance, identity)',
    'appearance = ordinary_eyes()\nappearance = fiery_eye_check()\nprint(identity)',
    'import os\nappearance = fiery_eye_check()\nseal_record(appearance, identity)',
    'appearance.__class__ = ordinary_eyes()\nappearance = fiery_eye_check()\nseal_record(appearance, identity)',
    'appearance = ordinary_eyes()\nappearance = fiery_eye_check()\nseal_record(appearance[0], identity)',
    'def identity(): pass\nappearance = fiery_eye_check()\nseal_record(appearance, identity)',
    'appearance = ordinary_eyes()\nwhile True: pass\nseal_record(appearance, identity)',
  ])('rejects anything outside the exact three-statement allowlist: %s', (code) => {
    expect(() => parseWeekFourVariablePython(code)).toThrow();
  });
});
