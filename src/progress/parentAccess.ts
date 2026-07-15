const ACCESS_PREFIX = 'access-v1';
const ACCESS_PATTERN = /^access-v1:([a-f0-9]{64}):([a-f0-9]{64})$/;
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('当前浏览器不支持安全密钥摘要，请升级浏览器后再试。');
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeRecoveryCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, '');
}

export function isParentAccessUnset(record: string): boolean {
  return record === 'unset' || record === '2580';
}

export function isLegacyParentPin(record: string): boolean {
  return /^\d{4}$/.test(record) && record !== '2580';
}

export function generateRecoveryCode(): string {
  if (!globalThis.crypto?.getRandomValues) throw new Error('当前浏览器不支持安全随机数，请升级浏览器后再试。');
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]).join('');
}

export async function createParentAccessRecord(pin: string, recoveryCode: string): Promise<string> {
  const [pinHash, recoveryHash] = await Promise.all([
    sha256(`xiyou-parent-pin:${pin}`),
    sha256(`xiyou-parent-recovery:${normalizeRecoveryCode(recoveryCode)}`),
  ]);
  return `${ACCESS_PREFIX}:${pinHash}:${recoveryHash}`;
}

export async function verifyParentPin(record: string, candidate: string): Promise<boolean> {
  if (isParentAccessUnset(record)) return false;
  if (isLegacyParentPin(record)) return record === candidate;
  const match = ACCESS_PATTERN.exec(record);
  if (!match) return false;
  return match[1] === await sha256(`xiyou-parent-pin:${candidate}`);
}

export async function verifyRecoveryCode(record: string, candidate: string): Promise<boolean> {
  const match = ACCESS_PATTERN.exec(record);
  if (!match) return false;
  return match[2] === await sha256(`xiyou-parent-recovery:${normalizeRecoveryCode(candidate)}`);
}

export function isValidParentAccessRecord(value: string): boolean {
  return value === 'unset' || /^\d{4}$/.test(value) || ACCESS_PATTERN.test(value);
}
