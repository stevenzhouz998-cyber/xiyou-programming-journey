import { expect,it } from 'vitest';
import { allMissionOutlines } from '../course/courseOutline';
import { MISSION_ORDER } from './missionCatalog';
it('keeps the synchronous mission catalog in exact presentation order',()=>expect(MISSION_ORDER).toEqual(allMissionOutlines.map(item=>item.id)));
