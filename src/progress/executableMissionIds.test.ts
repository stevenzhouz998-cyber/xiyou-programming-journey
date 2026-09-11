import { readFileSync } from 'node:fs';
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
      'w4-m2',
      'w4-m3',
      'w4-m4',
      'w4-m5',
      'w5-m1',
      'w5-m2',
    ]) {
      expect(isExecutableMissionId(id)).toBe(true);
    }

    for (const id of ['legacy-mission', '', 'w2-m6']) {
      expect(isExecutableMissionId(id)).toBe(false);
    }

    for (const id of ['w5-m3']) {
      expect(isExecutableMissionId(id)).toBe(false);
    }
  });

  it('promotes W4-M3 to the executable Python mission registry', () => {
    expect(isExecutableMissionId('w4-m3')).toBe(true);
  });

  it('uses one executable mission type boundary for every registered session', () => {
    const source = readFileSync('src/progress/types.ts', 'utf8');
    expect(source).not.toContain('SessionMissionId');
    expect(source).toMatch(/export type ExecutableMissionId = keyof MissionSessionById;/);
    expect(source).toMatch(/export type AnyMissionSession = MissionSession;/);
  });
});
