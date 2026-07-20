import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { course, validateCourse } from './course';
import { courseOutline } from './courseOutline';
import { commandLabel } from '../engine/commandLabels';
import { formalWeekOneMissions } from './formalCourse';

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

  it('keeps formal Blockly missions free of legacy flat expectedSequence execution data', () => {
    expect(formalWeekOneMissions).toHaveLength(3);
    for (const mission of formalWeekOneMissions) expect(mission).not.toHaveProperty('expectedSequence');
    const formalSource = readFileSync('src/course/formalCourse.ts', 'utf8');
    expect(formalSource).not.toMatch(/request_armor|receive_crown|receive_armor|receive_boots/);
    const pageSource = readFileSync('src/components/MissionPageContent.tsx', 'utf8');
    expect(pageSource).toMatch(/mission\.id === 'w1-m3'[\s\S]*FourSeasRegaliaRouteBoundary/);
  });

  it('gives every selectable command a child-readable Chinese label', () => {
    for (const command of course.weeks.flatMap((week) => week.missions.flatMap((mission) => mission.expectedSequence))) {
      expect(commandLabel(command)).not.toContain('_');
      expect(commandLabel(command)).toMatch(/[\u4e00-\u9fff]/);
    }
  });
});
