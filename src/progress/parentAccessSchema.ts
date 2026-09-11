export const ACCESS_PATTERN = /^access-v1:([a-f0-9]{64}):([a-f0-9]{64})$/;

export function isValidParentAccessRecord(value: string): boolean {
  return value === 'unset' || /^\d{4}$/.test(value) || ACCESS_PATTERN.test(value);
}
