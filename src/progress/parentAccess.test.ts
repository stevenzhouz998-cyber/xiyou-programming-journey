import { describe, expect, it } from 'vitest';
import {
  createParentAccessRecord,
  generateRecoveryCode,
  isParentAccessUnset,
  verifyParentPin,
  verifyRecoveryCode,
} from './parentAccess';

describe('parent access secrets', () => {
  it('stores hashes rather than the PIN or recovery code', async () => {
    const record = await createParentAccessRecord('4826', 'ABCDEFGHJKLM');
    expect(record).toMatch(/^access-v1:[a-f0-9]{64}:[a-f0-9]{64}$/);
    expect(record).not.toContain('4826');
    expect(record).not.toContain('ABCDEFGHJKLM');
    await expect(verifyParentPin(record, '4826')).resolves.toBe(true);
    await expect(verifyParentPin(record, '2580')).resolves.toBe(false);
    await expect(verifyRecoveryCode(record, 'ABCDEFGHJKLM')).resolves.toBe(true);
  });

  it('treats the retired public default as unset but preserves a custom legacy PIN for one migration login', async () => {
    expect(isParentAccessUnset('2580')).toBe(true);
    expect(isParentAccessUnset('unset')).toBe(true);
    await expect(verifyParentPin('4826', '4826')).resolves.toBe(true);
    await expect(verifyParentPin('2580', '2580')).resolves.toBe(false);
  });

  it('generates readable 12-character recovery codes', () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
  });
});
