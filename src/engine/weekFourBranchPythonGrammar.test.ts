import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEEK_FOUR_BRANCH_PYTHON,
  INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON,
  NESTED_WEEK_FOUR_BRANCH_PYTHON,
  parseWeekFourBranchDraftEnvelope,
  parseWeekFourBranchPython,
  SOLVED_WEEK_FOUR_BRANCH_PYTHON,
} from './weekFourBranchPythonGrammar';

const expectedCode = {
  default: 'if identity == "白骨精":\n    keep_observing()\npolite_help()',
  nested: 'if identity == "白骨精":\n    keep_observing()\n    polite_help()',
  invalidElse: 'if identity == "白骨精":\n    keep_observing()\nelse:\npolite_help()',
  solved: 'if identity == "白骨精":\n    keep_observing()\nelse:\n    polite_help()',
} as const;

describe('W4-M3 safe draft envelope', () => {
  it('publishes the four exact visible-code fixtures', () => {
    expect({
      default: DEFAULT_WEEK_FOUR_BRANCH_PYTHON,
      nested: NESTED_WEEK_FOUR_BRANCH_PYTHON,
      invalidElse: INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON,
      solved: SOLVED_WEEK_FOUR_BRANCH_PYTHON,
    }).toEqual(expectedCode);
  });

  it('preserves an incomplete connector draft byte-for-byte while exposing normalized structure', () => {
    const code = 'if identity == "白骨精":\r\n    keep_observing()\r\nel\r\n  polite_help()';
    expect(parseWeekFourBranchDraftEnvelope(code)).toEqual({
      code,
      normalizedCode: code.replaceAll('\r\n', '\n'),
      lineEnding: 'crlf',
      connector: 'el',
      connectorSpan: { line: 3, from: 0, to: 2 },
      actionIndent: 2,
      actionIndentSpan: { line: 4, from: 0, to: 2 },
    });
  });

  it.each(['', 'e', 'el', 'els', 'else', 'else:'])('allows only the exact canonical connector prefix state %j', (connector) => {
    const code = `if identity == "白骨精":\n    keep_observing()\n${connector}\n    polite_help()`;
    expect(parseWeekFourBranchDraftEnvelope(code)).toMatchObject({ code, connector });
  });

  it.each([
    [undefined, 'non-string'],
    [null, 'non-string'],
    [{}, 'non-string'],
    ['if appearance == "白骨精":\n    keep_observing()\npolite_help()', 'condition rewrite'],
    ['if identity == "白骨精":\n  keep_observing()\npolite_help()', 'fixed indent rewrite'],
    ['if identity == "白骨精":\n    keep_observing(1)\npolite_help()', 'fixed action rewrite'],
    ['if identity == "白骨精":\n    keep_observing()\nhelp()', 'unknown final action'],
    ['if identity == "白骨精":\n    keep_observing()\nelse:\n    polite_help()\nprint(1)', 'extra statement'],
    ['if identity == "白骨精":\n    keep_observing()\nelse:\n    polite_help()\n', 'trailing line'],
    ['if identity == "白骨精":\n    keep_observing()\nel\u0000se:\n    polite_help()', 'connector control'],
    ['if identity == "白骨精":\n    keep_observing()\nel\tse:\n    polite_help()', 'connector tab'],
    ['if identity == "白骨精":\n    keep_observing()\nel\u200bse:\n    polite_help()', 'connector zero-width space'],
    ['if identity == "白骨精":\n    keep_observing()\n\u200eelse:\n    polite_help()', 'connector left-to-right mark'],
    ['if identity == "白骨精":\n    keep_observing()\nelse\u202e:\n    polite_help()', 'connector bidi override'],
    ['if identity == "白骨精":\n    keep_observing()\n\ufeffelse:\n    polite_help()', 'connector byte-order mark'],
    ['if identity == "白骨精":\n    keep_observing()\nelseif:\n    polite_help()', 'unknown connector'],
    ['if identity == "白骨精":\n    keep_observing()\n else:\n    polite_help()', 'connector leading ASCII space'],
    ['if identity == "白骨精":\n    keep_observing()\nelse: \n    polite_help()', 'connector trailing ASCII space'],
    [`if identity == "白骨精":\n    keep_observing()\n${'x'.repeat(33)}\n    polite_help()`, 'connector length'],
    [`if identity == "白骨精":\n    keep_observing()\n${' '.repeat(33)}polite_help()`, 'action indent length'],
    ['if identity == "白骨精":\r    keep_observing()\rpolite_help()', 'bare carriage returns'],
  ])('rejects envelope corruption or out-of-bounds edits: %s (%s)', (code, _label) => {
    expect(() => parseWeekFourBranchDraftEnvelope(code)).toThrow();
  });
});

describe('W4-M3 canonical branch Python grammar', () => {
  it.each([
    ['fallthrough', DEFAULT_WEEK_FOUR_BRANCH_PYTHON, { line: 3, from: 0, to: 13 }],
    ['nested', NESTED_WEEK_FOUR_BRANCH_PYTHON, { line: 3, from: 4, to: 17 }],
    ['else', SOLVED_WEEK_FOUR_BRANCH_PYTHON, { line: 4, from: 4, to: 17 }],
  ] as const)('derives the exact %s trace and canonical run', (structure, code, politeSpan) => {
    const parsed = parseWeekFourBranchPython(code);
    expect(parsed).toMatchObject({ structure, pythonCode: code, normalizedCode: code, actionIndentSpan: { line: politeSpan.line, from: 0, to: politeSpan.from } });
    if ('state' in parsed) throw new Error('expected runnable parse');
    expect(parsed.trace
      .filter((event): event is Extract<(typeof parsed.trace)[number], { kind: 'action' }> => event.kind === 'action')
      .filter((event) => event.action === 'polite-help')
      .map((event) => event.span)).toEqual(
      structure === 'fallthrough' ? [politeSpan, politeSpan] : [politeSpan],
    );
    expect(parsed.trace.map((event) => event.order)).toEqual(Array.from({ length: parsed.trace.length }, (_, index) => index + 1));
    expect(parsed.run).toEqual(structure === 'else'
      ? {
        cardResults: [
          { cardId: 'canon-old-woman-disguise', actions: ['keep-observing'], result: 'single-route', sceneState: 'old-woman-observed' },
          { cardId: 'practice-herbalist-elder', actions: ['polite-help'], result: 'single-route', sceneState: 'herbalist-helped' },
        ], state: 'branch-proven', completed: true, failureSnapshots: [], penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
      }
      : expect.objectContaining({ state: 'branch-conflict', completed: false, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } }));
  });

  it('normalizes CRLF only for execution while retaining the saved Python text', () => {
    const code = SOLVED_WEEK_FOUR_BRANCH_PYTHON.replaceAll('\n', '\r\n');
    expect(parseWeekFourBranchPython(code)).toMatchObject({ pythonCode: code, normalizedCode: SOLVED_WEEK_FOUR_BRANCH_PYTHON, structure: 'else' });
  });

  it.each([
    [INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON, { state: 'python-structure-invalid', line: 4, reason: 'indentation' }],
    ['if identity == "白骨精":\n    keep_observing()\ne\npolite_help()', { state: 'python-structure-invalid', line: 3, reason: 'incomplete-connector' }],
    ['if identity == "白骨精":\n    keep_observing()\nelse\n    polite_help()', { state: 'python-structure-invalid', line: 3, reason: 'incomplete-connector' }],
    ['if identity == "白骨精":\n    keep_observing()\n  polite_help()', { state: 'python-structure-invalid', line: 3, reason: 'indentation' }],
  ] as const)('returns typed invalid state without fabricating trace or work', (code, expected) => {
    const parsed = parseWeekFourBranchPython(code);
    expect(parsed).toEqual(expected);
    expect(parsed).not.toHaveProperty('trace');
    expect(parsed).not.toHaveProperty('run');
  });

  it('is deterministic for the immutable primitive text input', () => {
    const code = SOLVED_WEEK_FOUR_BRANCH_PYTHON;
    expect(parseWeekFourBranchPython(code)).toEqual(parseWeekFourBranchPython(code));
    expect(code).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
  });

  it('rejects a boxed String object instead of silently coercing it', () => {
    expect(() => parseWeekFourBranchPython(new String(SOLVED_WEEK_FOUR_BRANCH_PYTHON))).toThrow();
  });
});
