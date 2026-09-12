import { describe, expect, it } from 'vitest';
import { getFormalMission } from './formalCourse';
import { isExecutableMissionId } from '../progress/executableMissionIds';
import { createInitialProgress, getWeekSixClassificationAccess, isMissionUnlocked } from '../progress/progress';

describe('W6-M2 formal classification registration', () => {
  it('registers the evidence classification lab as a formal executable mission', () => {
    expect(getFormalMission('w6-m2')).toMatchObject({ id: 'w6-m2', mode: 'ai-lab' });
    expect(isExecutableMissionId('w6-m2')).toBe(true);
  });

  it('does not unlock from an empty or historical-only prerequisite', () => {
    const progress = createInitialProgress();
    expect(getWeekSixClassificationAccess(progress).kind).toBe('locked');
    expect(isMissionUnlocked(progress, 'w6-m2')).toBe(false);
  });
});
