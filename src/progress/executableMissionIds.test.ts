import { describe, expect, it } from 'vitest';
import { isExecutableMissionId } from './executableMissionIds';

describe('executable mission ids', () => {
  it('recognizes every current session mission and rejects other ids', () => {
    for (const id of [
      'w1-m1',
      'w1-m2',
      'w1-m3',
      'w1-m4',
      'w1-m5',
      'w2-m1',
      'w2-m2',
      'w2-m3',
      'w2-m4',
      'w2-m5',
      'w3-m1',
      'w3-m2',
      'w3-m3',
      'w3-m4',
      'w3-m5',
      'w4-m1',
    ]) {
      expect(isExecutableMissionId(id)).toBe(true);
    }

    for (const id of ['legacy-mission', '', 'w2-m6']) {
      expect(isExecutableMissionId(id)).toBe(false);
    }

    for (const id of ['w4-m2', 'w4-m3', 'w4-m4', 'w4-m5']) {
      expect(isExecutableMissionId(id)).toBe(false);
    }
  });
});
