import { deriveMissionFromOutline, deriveWeekFromOutline, type MissionExtension } from './courseOutline';
import type { CanonRef, CourseManifest, CourseMissionSpec, MissionMode, MissionSpec, StoryBeat } from './types';
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

const beat = (title: string, summary: string): StoryBeat => ({ title, summary, canon: true });

type LegacyMissionExtension = Omit<MissionExtension, 'mode'> & { mode?: MissionMode };
const mission = (id: string, extension: LegacyMissionExtension): MissionSpec => (
  deriveMissionFromOutline(id, { ...extension, mode: extension.mode ?? 'blockly' })
);

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
        mission('w6-m4', { subtitle: '模型回答也要对照原著', objective: '找出与第五十九至六十一回不符的说法', mode: 'ai-lab', canon: c59to61, storyBeats: [beat('众神助战', '第三次借扇时，悟空一方与牛魔王交战并得神众相助。'), beat('扇息火焰', '最终取得真扇，扇息火焰后师徒继续西行。')], expectedSequence: ['read_claim', 'compare_source', 'mark_conflict', 'keep_canon'], aiDataset: [{ claim: '第二次取得真扇，后来又被骗回', correct: true }, { claim: '第三次最终借得真扇并息火', correct: true }, { claim: '火焰山之后师徒返回东土', correct: false }] }),
        mission('w6-m5', { subtitle: '代码、数据与核验合一', objective: '重建三调芭蕉扇原著事件链并核验结果', mode: 'ai-lab', canon: c59to61, storyBeats: [beat('三调完整经过', '一调得到假扇、二调取得真扇后被骗回、三调最终借得真扇。'), beat('原著结局', '火焰熄灭后，师徒越过火焰山继续西行。')], expectedSequence: ['first_fake', 'second_true', 'fan_reclaimed', 'third_battle', 'true_fan', 'cross_mountain'], aiDataset: [{ step: 1, event: '一调得假扇，火势更旺' }, { step: 2, event: '二调取得真扇，随后被骗回' }, { step: 3, event: '三调最终借得真扇' }, { step: 4, event: '扇息火焰继续西行' }] }),
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
