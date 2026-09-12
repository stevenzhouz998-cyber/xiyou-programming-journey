import { deriveWeekFromOutline } from './courseOutline';
import type { CanonRef, CourseManifest, CourseMissionSpec } from './types';
import {
  formalWeekOneCanon,
  formalWeekOneMissions,
  formalWeekTwoCanon,
  formalWeekTwoMissions,
  formalWeekThreeCanon,
  formalWeekThreeMissions,
  formalWeekFourCanon,
  formalWeekFourMissions,
  formalWeekFiveMissions,
  formalWeekSixMissions,
} from './formalCourse';

const SOURCE_ROOT = 'https://zh.wikisource.org/zh-hans/西游记';

const canon = (chapters: number[], title: string): CanonRef => ({
  chapters,
  title,
  sourceUrl: `${SOURCE_ROOT}/第${String(chapters[0]).padStart(3, '0')}回`,
});

const c3 = formalWeekOneCanon;
const c4to7 = formalWeekTwoCanon;
const c18to19 = {
  ...formalWeekThreeCanon,
  chapters: [18, 19],
  title: '第十八至十九回　高老庄大圣降魔　云栈洞悟空收八戒',
};
const c27 = formalWeekFourCanon;
const c44to46 = canon([44, 45, 46], '第四十四至四十六回　车迟国斗法');
const c59to61 = canon([59, 60, 61], '第五十九至六十一回　三调芭蕉扇');

export const course: CourseManifest = {
  id: 'xiyou-programming-journey',
  title: '西游编程记',
  version: 1,
  weeks: [
    deriveWeekFromOutline('week-1', {
      subtitle: '让每一道指令都有先后',
      canon: c3,
      missions: [
        ...formalWeekOneMissions,
      ],
    }),
    deriveWeekFromOutline('week-2', { subtitle: '重复有规律，错误能修正', canon: c4to7,
      missions: [
        ...formalWeekTwoMissions,
      ],
    }),
    deriveWeekFromOutline('week-3', { subtitle: '看条件，再选择正确分支', canon: c18to19,
      missions: [
        ...formalWeekThreeMissions,
      ],
    }),
    deriveWeekFromOutline('week-4', { subtitle: '从积木跨入 Python', canon: c27,
      missions: [
        ...formalWeekFourMissions,
      ],
    }),
    deriveWeekFromOutline('week-5', { subtitle: '把复杂问题拆成函数', canon: c44to46,
      missions: [
        ...formalWeekFiveMissions,
      ],
    }),
    deriveWeekFromOutline('week-6', { subtitle: '从原著事实学习 AI 思维', canon: c59to61,
      missions: [
        ...formalWeekSixMissions,
      ],
    }),
  ],
};

export function validateCourse(manifest: CourseManifest): string[] {
  const errors: string[] = [];
  if (manifest.weeks.length !== 6) errors.push('课程必须包含6周');
  const missionIds = new Set<string>();
  let previousChapter = 0;

  for (const week of manifest.weeks) {
    if (week.missions.length !== 5) errors.push(`第${week.week}周必须包含5关`);
    if (!week.missions[4]?.isBoss) errors.push(`第${week.week}周第五关必须是Boss`);
    for (const missionItem of week.missions) {
      if (missionIds.has(missionItem.id)) errors.push(`重复关卡ID: ${missionItem.id}`);
      missionIds.add(missionItem.id);
      if (!missionItem.canon.sourceUrl.includes('wikisource.org')) errors.push(`${missionItem.id}缺少原著来源`);
      if (missionItem.storyBeats.some((item) => item.canon !== true)) errors.push(`${missionItem.id}含非原著故事节点`);
      const chapterForOrder = missionItem.isBoss ? Math.max(...missionItem.canon.chapters) : missionItem.canon.chapters[0] ?? 0;
      if (chapterForOrder < previousChapter) errors.push(`${missionItem.id}回目顺序倒退`);
      previousChapter = chapterForOrder;
    }
  }
  if (missionIds.size !== 30) errors.push('课程必须包含30个唯一关卡');
  return errors;
}

export const allMissions = course.weeks.flatMap((week) => week.missions);

export function getMission(id: string): CourseMissionSpec | undefined {
  return allMissions.find((item) => item.id === id);
}
