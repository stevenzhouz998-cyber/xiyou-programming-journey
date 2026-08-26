import { describe, expect, it } from 'vitest';
import type { MissionProgress } from './types';
import { deriveConditionObservation } from './conditionObservation';

const completed = (completedAt: string): MissionProgress => ({
  status: 'completed',
  stars: 3,
  attempts: 1,
  hintsUsed: 0,
  completedAt,
});

describe('condition observation ability', () => {
  it('starts unacquired when neither prerequisite mission is completed', () => {
    expect(deriveConditionObservation({})).toEqual({
      acquiredAt: null,
      stableUnlockedAt: null,
    });
  });

  it('derives acquisition from the persisted w2-m4 completion', () => {
    expect(deriveConditionObservation({ 'w2-m4': completed('2026-08-24T00:00:00.000Z') })).toEqual({
      acquiredAt: '2026-08-24T00:00:00.000Z',
      stableUnlockedAt: null,
    });
  });

  it('derives stable unlock only after both w2-m4 and w2-m5 are completed', () => {
    expect(deriveConditionObservation({
      'w2-m4': completed('2026-08-24T00:00:00.000Z'),
      'w2-m5': completed('2026-08-25T00:00:00.000Z'),
    })).toEqual({
      acquiredAt: '2026-08-24T00:00:00.000Z',
      stableUnlockedAt: '2026-08-25T00:00:00.000Z',
    });
  });

  it('cannot stably unlock from w2-m5 before acquisition', () => {
    expect(deriveConditionObservation({ 'w2-m5': completed('2026-08-25T00:00:00.000Z') })).toEqual({
      acquiredAt: null,
      stableUnlockedAt: null,
    });
  });
});
