import { describe, expect, it } from 'vitest';
import { getFormalMission } from './formalCourse';
import { isExecutableMissionId } from '../progress/executableMissionIds';
import { createInitialProgress, getWeekSixPromptAccess, isMissionUnlocked } from '../progress/progress';

describe('W6-M3 formal prompt lab registration', () => {
  it('registers W6-M3 as a formal executable AI lab without legacy expectedSequence', () => {
    expect(getFormalMission('w6-m3')).toMatchObject({id:'w6-m3',mode:'ai-lab'});
    expect(isExecutableMissionId('w6-m3')).toBe(true);
  });
  it('does not unlock from empty progress', () => {
    const progress=createInitialProgress();
    expect(getWeekSixPromptAccess(progress).kind).toBe('locked');
    expect(isMissionUnlocked(progress,'w6-m3')).toBe(false);
  });
});
