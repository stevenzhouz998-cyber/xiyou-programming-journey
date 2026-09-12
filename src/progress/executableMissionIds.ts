import type { ExecutableMissionId } from './types';

const EXECUTABLE_MISSION_IDS = {
  'w1-m1': true,
  'w1-m2': true,
  'w1-m3': true,
  'w1-m4': true,
  'w1-m5': true,
  'w2-m1': true,
  'w2-m2': true,
  'w2-m3': true,
  'w2-m4': true,
  'w2-m5': true,
  'w3-m1': true,
  'w3-m2': true,
  'w3-m3': true,
  'w3-m4': true,
  'w3-m5': true,
  'w4-m1': true,
  'w4-m2': true,
  'w4-m3': true,
  'w4-m4': true,
  'w4-m5': true,
  'w5-m1': true,
  'w5-m2': true,
  'w5-m3': true,
  'w5-m4': true,
  'w5-m5': true,
  'w6-m1': true,
  'w6-m2': true,
  'w6-m3': true,
} as const satisfies Record<ExecutableMissionId, true>;

export function isExecutableMissionId(value: string): value is ExecutableMissionId {
  return Object.prototype.hasOwnProperty.call(EXECUTABLE_MISSION_IDS, value);
}
