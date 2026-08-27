import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { course, getMission, validateCourse } from './course';
import { courseOutline, getMissionOutline, isFormalMissionOutline } from './courseOutline';
import { commandLabel } from '../engine/commandLabels';
import { formalWeekOneMissions, formalWeekThreeMissions, formalWeekTwoMissions } from './formalCourse';
import { isExecutableMissionId } from '../progress/executableMissionIds';

describe('course manifest', () => {
  it('contains six weeks with four main missions and one boss each', () => {
    expect(course.weeks).toHaveLength(6);
    expect(course.weeks.flatMap((week) => week.missions)).toHaveLength(30);

    for (const week of course.weeks) {
      expect(week.missions).toHaveLength(5);
      expect(week.missions.slice(0, 4).every((mission) => !mission.isBoss)).toBe(true);
      expect(week.missions[4].isBoss).toBe(true);
    }
  });

  it('keeps canonical chapters chronological and every mission traceable', () => {
    const chapters = course.weeks.flatMap((week) => week.canon.chapters);
    expect(chapters).toEqual([...chapters].sort((a, b) => a - b));

    for (const week of course.weeks) {
      for (const mission of week.missions) {
        expect(mission.canon.sourceUrl).toContain('wikisource.org');
        expect(mission.canon.chapters.length).toBeGreaterThan(0);
        expect(mission.storyBeats.length).toBeGreaterThan(0);
        expect(mission.storyBeats.every((beat) => beat.canon === true)).toBe(true);
      }
    }
  });

  it('uses Blockly, Python and deterministic AI labs in the planned order', () => {
    expect(course.weeks[0].missions.every((mission) => mission.mode === 'blockly')).toBe(true);
    expect(course.weeks[3].missions.some((mission) => mission.mode === 'python')).toBe(true);
    expect(course.weeks[5].missions.some((mission) => mission.mode === 'ai-lab')).toBe(true);
    expect(validateCourse(course)).toEqual([]);
  });

  it('keeps the lightweight navigation outline exactly aligned with the full course', () => {
    expect(courseOutline.weeks.map(({ id, week, title, theme, missions }) => ({
      id, week, title, theme, missions,
    }))).toEqual(course.weeks.map(({ id, week, title, theme, missions }) => ({
      id, week, title, theme,
      missions: missions.map(({ id: missionId, week: missionWeek, order, title: missionTitle, knowledge, isBoss }) => ({
        id: missionId, week: missionWeek, order, title: missionTitle, knowledge, isBoss,
      })),
    })));
  });

  it('stores only course extension fields and derives every navigation field from courseOutline', () => {
    const legacySource = readFileSync('src/course/course.ts', 'utf8');
    const formalSource = readFileSync('src/course/formalCourse.ts', 'utf8');
    for (const source of [legacySource, formalSource]) {
      expect(source).not.toMatch(/(?:mission|formalMission)\(\{\s*week:/);
    }
    expect(legacySource).not.toMatch(/\{\s*id:\s*'week-/);
    expect(legacySource).toMatch(/deriveMissionFromOutline/);
    expect(formalSource).toMatch(/deriveFormalMissionFromOutline/);
  });

  it('loads formal and legacy story catalogs independently without a formal-route fallback', () => {
    const pageSource = readFileSync('src/components/MissionPageContent.tsx', 'utf8');
    const appSource = readFileSync('src/App.tsx', 'utf8');
    expect(pageSource).not.toMatch(/import\s+\{\s*getFormalMission\s*\}\s+from/);
    expect(pageSource).toContain("import('../course/formalCourse')");
    expect(pageSource).toContain("import('../course/course')");
    expect(pageSource).toMatch(/isFormalMissionOutline\(outline\)/);
    expect(pageSource).not.toMatch(/formalMission\s*\?\?\s*legacy/);
    expect(appSource).not.toMatch(/from ['"]\.\/course\/(?:course|formalCourse)['"]/);
  });

  it('promotes week two and W3-M1/M2 without legacy fallback', () => {
    expect(formalWeekOneMissions).toHaveLength(5);
    expect(formalWeekTwoMissions).toHaveLength(5);
    expect(formalWeekThreeMissions).toHaveLength(2);
    for (const mission of formalWeekOneMissions) expect(mission).not.toHaveProperty('expectedSequence');
    const formalIds = new Set(['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4', 'w2-m5', 'w3-m1', 'w3-m2']);
    for (const mission of course.weeks.flatMap((week) => week.missions)) {
      if (formalIds.has(mission.id)) expect(mission).not.toHaveProperty('expectedSequence');
      else expect(mission).toHaveProperty('expectedSequence', expect.any(Array));
    }
    expect(isFormalMissionOutline(getMissionOutline('w2-m1'))).toBe(true);
    expect(isFormalMissionOutline(getMissionOutline('w2-m2'))).toBe(true);
    expect(isFormalMissionOutline(getMissionOutline('w2-m3'))).toBe(true);
    expect(isFormalMissionOutline(getMissionOutline('w2-m4'))).toBe(true);
    expect(isFormalMissionOutline(getMissionOutline('w2-m5'))).toBe(true);
    expect(isFormalMissionOutline(getMissionOutline('w3-m1'))).toBe(true);
    const formalSource = readFileSync('src/course/formalCourse.ts', 'utf8');
    const courseSource = readFileSync('src/course/course.ts', 'utf8');
    expect(formalSource).not.toMatch(/request_armor|receive_crown|receive_armor|receive_boots/);
    expect(courseSource).not.toMatch(/legacyFormalSequences|legacyFormalWeekOneMissions/);
    const pageSource = readFileSync('src/components/MissionPageContent.tsx', 'utf8');
    expect(pageSource).toMatch(/mission\.id === 'w1-m3'[\s\S]*FourSeasRegaliaRouteBoundary/);
    expect(pageSource).toMatch(/mission\.id === 'w1-m4'[\s\S]*AdvancedWeekOneRouteBoundary/);
    expect(pageSource).toMatch(/mission\.id === 'w1-m5'[\s\S]*AdvancedWeekOneRouteBoundary/);
    expect(pageSource).toMatch(/mission\.id === 'w2-m1'[\s\S]*WeekTwoHorseRouteBoundary/);
    expect(pageSource).toMatch(/mission\.id === 'w2-m2'[\s\S]*WeekTwoMonkeyKingRouteBoundary/);
    expect(pageSource).toMatch(/mission\.id === 'w2-m3'[\s\S]*WeekTwoPeachElixirRouteBoundary/);
    expect(pageSource).toMatch(/mission\.id === 'w2-m4'[\s\S]*WeekTwoFurnaceConditionRouteBoundary/);
    expect(pageSource).toMatch(/mission\.id === 'w3-m1'[\s\S]*WeekThreeManorHelpRouteBoundary/);
    expect(pageSource).toMatch(/import\(["']\.\/WeekThreeManorHelpExperience["']\)/);
    expect(pageSource).toMatch(/export function WeekThreeManorHelpRouteBoundary/);
    expect(courseSource).not.toMatch(/mission\('w2-m5'[\s\S]*expectedSequence/);
    expect(pageSource).not.toMatch(/legacySequence\s*\?\?\s*\[\]/);
  });

  it('registers w3-m1 and w3-m2 as formal executable missions without legacy sequences', () => {
    const mission = getMission('w3-m2');
    expect(mission).toBeDefined();
    expect(isFormalMissionOutline(getMissionOutline('w3-m2'))).toBe(true);
    expect(isExecutableMissionId('w3-m2')).toBe(true);
    expect('expectedSequence' in mission!).toBe(false);
    for (const id of ['w3-m3', 'w3-m4', 'w3-m5']) {
      expect(isFormalMissionOutline(getMissionOutline(id))).toBe(false);
      expect(isExecutableMissionId(id)).toBe(false);
    }
  });

  it('gives every selectable command a child-readable Chinese label', () => {
    for (const command of course.weeks.flatMap((week) => week.missions.flatMap((mission) => 'expectedSequence' in mission ? mission.expectedSequence : []))) {
      expect(commandLabel(command)).not.toContain('_');
      expect(commandLabel(command)).toMatch(/[\u4e00-\u9fff]/);
    }
  });
});
