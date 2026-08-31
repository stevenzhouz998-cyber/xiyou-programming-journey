import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { course, getMission, validateCourse } from './course';
import { courseOutline, getMissionOutline, isFormalMissionOutline } from './courseOutline';
import { commandLabel } from '../engine/commandLabels';
import { formalWeekFourCanon, formalWeekOneMissions, formalWeekThreeMissions, formalWeekTwoMissions } from './formalCourse';
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

  it('promotes week two and W3-M1 through M5 without legacy fallback', () => {
    expect(formalWeekOneMissions).toHaveLength(5);
    expect(formalWeekTwoMissions).toHaveLength(5);
    expect(formalWeekThreeMissions).toHaveLength(5);
    for (const mission of formalWeekOneMissions) expect(mission).not.toHaveProperty('expectedSequence');
    const formalIds = new Set(['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4', 'w2-m5', 'w3-m1', 'w3-m2', 'w3-m3', 'w3-m4', 'w3-m5', 'w4-m1', 'w4-m2']);
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
    expect(pageSource).toMatch(/mission\.id === 'w3-m4'[\s\S]*WeekThreeBajieJoiningRouteBoundary/);
    expect(pageSource).toMatch(/export function WeekThreeBajieJoiningRouteBoundary/);
    expect(pageSource).toMatch(/import\(["']\.\/WeekThreeManorHelpExperience["']\)/);
    expect(pageSource).toMatch(/export function WeekThreeManorHelpRouteBoundary/);
    expect(courseSource).not.toMatch(/mission\('w2-m5'[\s\S]*expectedSequence/);
    expect(pageSource).not.toMatch(/legacySequence\s*\?\?\s*\[\]/);
  });

  it('registers w3-m1 through w3-m5 as formal missions without legacy sequences', () => {
    const mission = getMission('w3-m2');
    expect(mission).toBeDefined();
    expect(isFormalMissionOutline(getMissionOutline('w3-m2'))).toBe(true);
    expect(isExecutableMissionId('w3-m2')).toBe(true);
    expect('expectedSequence' in mission!).toBe(false);
    expect(isFormalMissionOutline(getMissionOutline('w3-m3'))).toBe(true);
    expect(isExecutableMissionId('w3-m3')).toBe(true);
    const bajie = getMission('w3-m4');
    expect(bajie).toBeDefined();
    expect(isFormalMissionOutline(getMissionOutline('w3-m4'))).toBe(true);
    expect(isExecutableMissionId('w3-m4')).toBe(true);
    expect('expectedSequence' in bajie!).toBe(false);
    expect(bajie?.mode).toBe('blockly');
    expect(bajie?.canon.chapters).toEqual([19]);
    expect(bajie?.subtitle).toMatch(/两个必要条件.*同时/);
    expect(bajie?.objective).toMatch(/同时满足/);
    expect(bajie?.storyBeats.map((beat) => beat.summary).join('\n')).toContain('观音此前已授戒，法名悟能');
    expect(bajie?.storyBeats.map((beat) => beat.summary).join('\n')).toContain('唐僧后来另名八戒');
    expect(bajie?.storyBeats.map((beat) => beat.summary).join('\n')).toContain('挑担西行');
    expect(bajie?.storyBeats.map((beat) => beat.summary).join('\n')).not.toContain('唐僧为他摩顶受戒');
    const boss = getMission('w3-m5');
    expect(isFormalMissionOutline(getMissionOutline('w3-m5'))).toBe(true);
    expect(boss).not.toHaveProperty('expectedSequence');
  });

  it('registers w4-m1 as formal Blockly-to-Python mapping without legacy answers', () => {
    const mission = getMission('w4-m1');
    expect(mission).toBeDefined();
    expect(isFormalMissionOutline(getMissionOutline('w4-m1'))).toBe(true);
    expect(isExecutableMissionId('w4-m1')).toBe(true);
    expect(mission?.mode).toBe('blockly');
    expect(mission?.canon.chapters).toEqual([27]);
    expect(mission?.canon).toEqual(formalWeekFourCanon);
    expect(mission).not.toHaveProperty('expectedSequence');
    expect(mission).not.toHaveProperty('expectedOutput');
    expect(mission).not.toHaveProperty('starterCode');
    for (const id of ['w4-m3', 'w4-m4', 'w4-m5']) {
      expect(isFormalMissionOutline(getMissionOutline(id))).toBe(false);
      expect(isExecutableMissionId(id)).toBe(false);
    }
  });

  it('registers W4-M2 as a formal Python variable task without legacy answers', () => {
    const mission = getMission('w4-m2');
    expect(mission).toBeDefined();
    expect(isFormalMissionOutline(getMissionOutline('w4-m2'))).toBe(true);
    expect(isExecutableMissionId('w4-m2')).toBe(true);
    expect(mission?.mode).toBe('python');
    expect(mission?.canon).toEqual(formalWeekFourCanon);
    const story = mission?.storyBeats.map((beat) => beat.summary).join('\n') ?? '';
    expect(story).toContain('送斋女子');
    expect(story).toContain('悟空以火眼金睛识破；变化者借法脱身，山岭疑云仍未散去。');
    expect(story).not.toMatch(/老妇|老翁|骷髅|贬书/);
    expect(story).not.toMatch(/攻击|尸体|蛆虫|青蛙|羞辱|惩罚/);
    expect(mission?.hints).toEqual({
      observe: '看看两次核验分别写进了哪只证据匣，哪一只后来没有留下记录。',
      think: '同一个变量再次赋值会覆盖旧值；两种事实需要各自保存。',
      partial: '检查第二行写入的目标变量，是否和这次火眼核验的事实类型相符。',
    });
    expect(mission).not.toHaveProperty('expectedSequence');
    expect(mission).not.toHaveProperty('expectedOutput');
    expect(mission).not.toHaveProperty('starterCode');
    for (const id of ['w4-m3', 'w4-m4', 'w4-m5']) {
      expect(isFormalMissionOutline(getMissionOutline(id))).toBe(false);
      expect(isExecutableMissionId(id)).toBe(false);
    }
  });

  it('keeps W4-M3 through W4-M5 as the exact legacy Python snapshots while W4-M2 is formalized', () => {
    expect(getMission('w4-m1')?.mode).toBe('blockly');
    expect(getMission('w4-m3')).toMatchObject({
      expectedSequence: ['appearance_old_woman', 'if_identity_demon'],
      expectedOutput: '识破变化',
      starterCode: "appearance = '老妇'\nidentity = '白骨精'\nif identity == '白骨精':\n    print('识破变化')",
    });
    expect(getMission('w4-m4')).toMatchObject({
      expectedSequence: ['woman', 'old_woman', 'old_man', 'banish_wukong'],
      expectedOutput: '女子\n老妇\n老翁',
      starterCode: "appearances = ['女子', '老妇', '老翁']\nfor item in appearances:\n    print(item)",
    });
    expect(getMission('w4-m5')).toMatchObject({
      expectedSequence: ['woman_is_demon', 'old_woman_is_demon', 'old_man_is_demon', 'canon_ending'],
      expectedOutput: '女子: 识破\n老妇: 识破\n老翁: 识破',
      starterCode: "records = [('女子', '白骨精'), ('老妇', '白骨精'), ('老翁', '白骨精')]\nfor appearance, identity in records:\n    if identity == '白骨精':\n        print(appearance + ': 识破')",
    });
    for (const id of ['w4-m3', 'w4-m4', 'w4-m5']) {
      const mission = getMission(id);
      expect(isFormalMissionOutline(getMissionOutline(id))).toBe(false);
      expect(isExecutableMissionId(id)).toBe(false);
      expect(mission).toHaveProperty('expectedSequence');
      expect(mission).toHaveProperty('expectedOutput');
      expect(mission).toHaveProperty('starterCode');
    }
  });

  it('gives every selectable command a child-readable Chinese label', () => {
    for (const command of course.weeks.flatMap((week) => week.missions.flatMap((mission) => 'expectedSequence' in mission ? mission.expectedSequence : []))) {
      expect(commandLabel(command)).not.toContain('_');
      expect(commandLabel(command)).toMatch(/[\u4e00-\u9fff]/);
    }
  });
});
