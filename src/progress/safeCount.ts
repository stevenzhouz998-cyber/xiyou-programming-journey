export function safeCount(base: number, increment: number): number {
  if (!Number.isSafeInteger(base) || base < 0 || !Number.isSafeInteger(increment) || increment < 0) {
    throw new Error('任务进度计数超出安全范围');
  }
  const result = base + increment;
  if (!Number.isSafeInteger(result)) throw new Error('任务进度计数超出安全范围');
  return result;
}
