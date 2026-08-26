import type { MissionProgress } from './types';

export interface ConditionObservationAbility {
  acquiredAt: string | null;
  stableUnlockedAt: string | null;
}

export function deriveConditionObservation(
  missions: Record<string, MissionProgress | undefined>,
): ConditionObservationAbility {
  const acquiredAt = missions['w2-m4']?.completedAt ?? null;
  return {
    acquiredAt,
    stableUnlockedAt: acquiredAt === null ? null : missions['w2-m5']?.completedAt ?? null,
  };
}
