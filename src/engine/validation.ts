export interface ValidationResult {
  passed: boolean;
  stars: number;
  feedback: string;
  mismatchIndex?: number;
}

export function validateSequence(actual: string[], expected: string[], hintsUsed: number): ValidationResult {
  const mismatchIndex = expected.findIndex((item, index) => actual[index] !== item);
  const sameLength = actual.length === expected.length;
  const passed = mismatchIndex === -1 && sameLength;
  if (passed) {
    return {
      passed: true,
      stars: hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1,
      feedback: hintsUsed === 0 ? '一气呵成！你找到了正确的因果顺序。' : '闯关成功！提示帮你跨过了难点。',
    };
  }
  return {
    passed: false,
    stars: 0,
    feedback: '还差一点，再观察原著事件是谁先发生的。',
    mismatchIndex: mismatchIndex === -1 ? Math.min(actual.length, expected.length) : mismatchIndex,
  };
}

export function inspectPython(code: string): string[] {
  const errors: string[] = [];
  if (/^\s*(?:from\s+\S+\s+)?import\s+/m.test(code)) errors.push('暂时不能使用 import');
  if (/\b(?:open|exec|eval|compile|__import__)\s*\(/.test(code)) errors.push('暂时不能读写文件');
  if (/\bjs\b|pyodide|fetch\s*\(/.test(code)) errors.push('暂时不能访问浏览器');
  if (/\.__[A-Za-z_]+__/.test(code)) errors.push('暂时不能使用双下划线属性');
  return errors;
}
