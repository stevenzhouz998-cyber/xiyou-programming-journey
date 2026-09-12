import { describe, expect, it } from 'vitest';
import { getFormalMission } from './formalCourse';
import { isExecutableMissionId } from '../progress/executableMissionIds';
import { createInitialProgress } from '../progress/schema';
import { getWeekSixRecordsAccess, isMissionUnlocked } from '../progress/progress';

describe('W6-M1 registration and proof gate', () => {
  it('registers W6-M1 as a formal executable Python mission', () => {
    expect(getFormalMission('w6-m1')).toMatchObject({ id: 'w6-m1', mode: 'python' });
    expect(isExecutableMissionId('w6-m1')).toBe(true);
  });

  it('requires a formal W5-M5 proof before entering W6-M1', () => {
    const progress = createInitialProgress();
    progress.missions['w5-m5'] = { status: 'completed', stars: 3, hintsUsed: 0, attempts: 1, completedAt: '2026-09-12T00:00:01.000Z' };
    expect(getWeekSixRecordsAccess(progress).kind).toBe('locked');
    expect(isMissionUnlocked(progress, 'w6-m1')).toBe(false);
  });
});
