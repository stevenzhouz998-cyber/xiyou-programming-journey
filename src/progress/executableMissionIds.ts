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
} as const satisfies Record<ExecutableMissionId, true>;

export function isExecutableMissionId(value: string): value is ExecutableMissionId {
  return Object.prototype.hasOwnProperty.call(EXECUTABLE_MISSION_IDS, value);
}
