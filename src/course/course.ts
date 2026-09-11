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
        mission('w5-m3', { subtitle: '函数接收不同参数', objective: '用参数记录祈雨号令的先后', mode: 'python', canon: c44to46, storyBeats: [beat('登坛祈雨', '唐僧与虎力大仙在车迟国登坛祈雨。'), beat('悟空查明', '悟空到空中查明风云雷雨诸神受谁差遣。')], expectedSequence: ['wind', 'cloud', 'thunder', 'rain'], starterCode: "def weather(order):\n    print(order)\n\nfor item in ['风', '云', '雷', '雨']:\n    weather(item)", expectedOutput: '风\n云\n雷\n雨' }),
        mission('w5-m4', { subtitle: '分解多个试炼项目', objective: '把原著比试拆成可检查的函数', mode: 'python', canon: c44to46, storyBeats: [beat('云梯显圣', '双方继续比试坐禅等项目。'), beat('外道败亡', '三位国师在后续赌赛中先后败亡。')], expectedSequence: ['meditation', 'guess_objects', 'beheading', 'disembowel', 'oil_bath'], starterCode: "tests = ['坐禅', '猜物', '砍头', '剖腹', '油锅']\ndef announce(item):\n    return '比试:' + item\nfor item in tests:\n    print(announce(item))", expectedOutput: '比试:坐禅\n比试:猜物\n比试:砍头\n比试:剖腹\n比试:油锅' }),
        mission('w5-m5', { subtitle: '函数重建斗法次序', objective: '用函数与循环输出第四十四至四十六回事件链', mode: 'python', canon: c44to46, storyBeats: [beat('先救僧众', '师徒先遇受役僧众并施救。'), beat('再经斗法', '三清观后，双方在朝中展开多项赌赛。')], expectedSequence: ['save_monks', 'temple', 'rain', 'later_tests'], starterCode: "events = ['解救僧众', '三清观留名', '祈雨赌胜', '后续比试']\ndef record(event):\n    print(event)\nfor event in events:\n    record(event)", expectedOutput: '解救僧众\n三清观留名\n祈雨赌胜\n后续比试' }),
      ],
    }),
    deriveWeekFromOutline('week-6', { subtitle: '从原著事实学习 AI 思维', canon: c59to61,
      missions: [
        mission('w6-m1', { subtitle: '先整理事实，再谈智能', objective: '用 Python 输出一调、二调、三调顺序', mode: 'python', canon: c59to61, storyBeats: [beat('路阻火焰山', '师徒西行被火焰山阻住。'), beat('三次调扇', '悟空先后三次设法取得芭蕉扇。')], expectedSequence: ['first_fan', 'second_fan', 'third_fan'], starterCode: "attempts = ['一调', '二调', '三调']\nfor attempt in attempts:\n    print(attempt)", expectedOutput: '一调\n二调\n三调' }),
        mission('w6-m2', { subtitle: '分类前先看证据', objective: '依据原著结果分类扇子真假与效果', mode: 'ai-lab', canon: c59to61, storyBeats: [beat('一调受挫', '悟空初次借扇未能如愿。'), beat('二调得假扇', '悟空第二次取得假扇，火势反而更旺。')], expectedSequence: ['label_first', 'label_fake', 'verify_effect'], aiDataset: [{ attempt: 1, result: '受挫', effective: false }, { attempt: 2, result: '假扇火旺', effective: false }, { attempt: 3, result: '真扇息火', effective: true }] }),
        mission('w6-m3', { subtitle: '把任务、事实与限制说完整', objective: '从原著材料中选择完整提示词要素', mode: 'ai-lab', canon: c59to61, storyBeats: [beat('变化牛魔王', '悟空曾变作牛魔王模样骗取芭蕉扇。'), beat('牛王夺回', '牛魔王又变作八戒模样将扇骗回。')], expectedSequence: ['state_task', 'provide_canon_facts', 'forbid_alt_ending', 'request_format'], aiDataset: [{ field: '任务', value: '按原著整理二调芭蕉扇' }, { field: '事实', value: '悟空变牛魔王，牛魔王变八戒' }, { field: '限制', value: '不改变原著结局' }] }),
        mission('w6-m4', { subtitle: '模型回答也要对照原著', objective: '找出与第五十九至六十一回不符的说法', mode: 'ai-lab', canon: c59to61, storyBeats: [beat('众神助战', '第三次借扇时，悟空一方与牛魔王交战并得神众相助。'), beat('扇息火焰', '最终取得真扇，扇息火焰后师徒继续西行。')], expectedSequence: ['read_claim', 'compare_source', 'mark_conflict', 'keep_canon'], aiDataset: [{ claim: '第二次拿到真扇', correct: false }, { claim: '第三次取得真扇并息火', correct: true }, { claim: '火焰山之后师徒返回东土', correct: false }] }),
        mission('w6-m5', { subtitle: '代码、数据与核验合一', objective: '重建三调芭蕉扇原著事件链并核验结果', mode: 'ai-lab', canon: c59to61, storyBeats: [beat('三调完整经过', '一调受挫、二调得假扇、三调终得真扇。'), beat('原著结局', '火焰熄灭后，师徒越过火焰山继续西行。')], expectedSequence: ['first_attempt', 'second_fake', 'third_battle', 'true_fan', 'cross_mountain'], aiDataset: [{ step: 1, event: '一调受挫' }, { step: 2, event: '二调得假扇' }, { step: 3, event: '三调得真扇' }, { step: 4, event: '扇息火焰继续西行' }] }),
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
