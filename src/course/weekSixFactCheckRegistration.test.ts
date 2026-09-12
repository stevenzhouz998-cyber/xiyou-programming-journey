import { describe, expect, it } from 'vitest';
import { getFormalMission } from './formalCourse';
import { isExecutableMissionId } from '../progress/executableMissionIds';
import { createInitialProgress, getWeekSixFactCheckAccess, isMissionUnlocked } from '../progress/progress';

describe('W6-M4 formal fact-check lab registration',()=>{
  it('registers W6-M4 as a formal executable AI lab without legacy expectedSequence',()=>{expect(getFormalMission('w6-m4')).toMatchObject({id:'w6-m4',mode:'ai-lab'});expect(isExecutableMissionId('w6-m4')).toBe(true)});
  it('does not unlock from empty progress',()=>{const progress=createInitialProgress();expect(getWeekSixFactCheckAccess(progress).kind).toBe('locked');expect(isMissionUnlocked(progress,'w6-m4')).toBe(false)});
});
