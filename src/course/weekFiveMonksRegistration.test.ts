import {expect,it} from 'vitest';
import {getFormalMission} from './formalCourse';
it('W5-M1 uses a formal child-authored Python loop rather than output equality',()=>{expect(getFormalMission('w5-m1')?.mode).toBe('python');expect(getFormalMission('w5-m1')).not.toHaveProperty('expectedOutput');});
