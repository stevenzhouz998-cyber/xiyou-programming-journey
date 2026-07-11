import { describe, expect, it } from 'vitest';
import { inspectPython, validateSequence } from './validation';

describe('mission validation', () => {
  it('awards stars without blocking completion when hints were used', () => {
    expect(validateSequence(['a', 'b'], ['a', 'b'], 0)).toMatchObject({ passed: true, stars: 3 });
    expect(validateSequence(['a', 'b'], ['a', 'b'], 1)).toMatchObject({ passed: true, stars: 2 });
    expect(validateSequence(['a', 'b'], ['a', 'b'], 3)).toMatchObject({ passed: true, stars: 1 });
  });

  it('returns child-friendly feedback for a wrong sequence', () => {
    const result = validateSequence(['b', 'a'], ['a', 'b'], 0);
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('再观察');
    expect(result.mismatchIndex).toBe(0);
  });

  it('allows beginner Python but rejects imports, browser access and files', () => {
    expect(inspectPython("name = '悟空'\nprint(name)")).toEqual([]);
    expect(inspectPython('import os')).toContain('暂时不能使用 import');
    expect(inspectPython("open('secret.txt')")).toContain('暂时不能读写文件');
    expect(inspectPython('from js import fetch')).toContain('暂时不能访问浏览器');
    expect(inspectPython("value.__class__")).toContain('暂时不能使用双下划线属性');
  });
});
