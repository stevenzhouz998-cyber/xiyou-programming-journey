import { deriveMissionFromOutline, deriveWeekFromOutline, type MissionExtension } from './courseOutline';
import type { CanonRef, CourseManifest, CourseMissionSpec, MissionMode, MissionSpec, StoryBeat } from './types';
import {
  formalWeekOneCanon,
  formalWeekOneMissions,
  formalWeekTwoCanon,
  formalWeekTwoMissions,
  formalWeekThreeCanon,
  formalWeekThreeMissions,
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
const c27 = canon([27], '第二十七回　尸魔三戏唐三藏　圣僧恨逐美猴王');
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
        mission('w3-m2', { subtitle: '身份与外形分开判断', objective: '用条件区分变化后的外形与真实身份', canon: c18to19, storyBeats: [beat('悟空变化', '悟空变作高翠兰模样等待妖怪。'), beat('妖怪现身', '妖怪不知是悟空变化，来到庄中。')], expectedSequence: ['transform', 'wait', 'if_demon_arrives', 'reveal_identity'] }),
        mission('w3-m3', { subtitle: '让分支跟着条件走', objective: '按原著线索选择追赶与交锋分支', canon: c18to19, storyBeats: [beat('追至云栈洞', '妖怪败走，悟空追到云栈洞。'), beat('说出来历', '妖怪听说是取经人，交代自己受菩萨点化的来历。')], expectedSequence: ['chase', 'reach_cave', 'fight', 'if_pilgrim_named', 'tell_origin'] }),
        mission('w3-m4', { subtitle: '满足条件才加入取经队伍', objective: '组合八戒归队的必要条件', canon: c18to19, storyBeats: [beat('拜见唐僧', '妖怪随悟空前来拜见唐僧。'), beat('得名八戒', '唐僧为他摩顶受戒，取别名八戒。')], expectedSequence: ['meet_tang', 'tell_guanyin_order', 'receive_precepts', 'join_team'] }),
        mission('w3-m5', { subtitle: '用条件复原收徒经过', objective: '完整复现第十八至十九回的条件链', canon: c18to19, storyBeats: [beat('由求助到降魔', '悟空依据高才所述前往庄中。'), beat('由交锋到收徒', '云栈洞交锋后，八戒随唐僧取经。')], expectedSequence: ['hear_report', 'transform', 'chase', 'learn_origin', 'join_team'] }),
      ],
    }),
    deriveWeekFromOutline('week-4', { subtitle: '从积木跨入 Python', canon: c27,
      missions: [
        mission('w4-m1', { subtitle: '同一逻辑，两种写法', objective: '把三次变化的积木流程映射为 Python', mode: 'blockly', canon: c27, storyBeats: [beat('尸魔设变', '白骨精为吃唐僧肉，先后设计三次变化。'), beat('悟空识破', '悟空三次都识破变化。')], expectedSequence: ['repeat_three', 'observe_appearance', 'keep_identity'] }),
        mission('w4-m2', { subtitle: '女子外形，身份未变', objective: '用变量记录外形与身份', mode: 'python', canon: c27, storyBeats: [beat('变作女子', '白骨精先变作送斋女子接近唐僧。'), beat('悟空识破', '悟空赶回后识破妖怪。')], expectedSequence: ['appearance_woman', 'identity_demon'], starterCode: "appearance = '女子'\nidentity = '白骨精'\nprint(identity)", expectedOutput: '白骨精' }),
        mission('w4-m3', { subtitle: '老妇外形，条件不变', objective: '用 if 判断身份是否改变', mode: 'python', canon: c27, storyBeats: [beat('变作老妇', '白骨精第二次变作老妇人。'), beat('再次识破', '悟空认出仍是妖怪。')], expectedSequence: ['appearance_old_woman', 'if_identity_demon'], starterCode: "appearance = '老妇'\nidentity = '白骨精'\nif identity == '白骨精':\n    print('识破变化')", expectedOutput: '识破变化' }),
        mission('w4-m4', { subtitle: '老翁之后的原著结果', objective: '用列表保持三次变化的原著顺序', mode: 'python', canon: c27, storyBeats: [beat('变作老翁', '白骨精第三次变作老翁寻找妻女。'), beat('悟空被逐', '悟空打死白骨精后，唐僧写下贬书将他逐走。')], expectedSequence: ['woman', 'old_woman', 'old_man', 'banish_wukong'], starterCode: "appearances = ['女子', '老妇', '老翁']\nfor item in appearances:\n    print(item)", expectedOutput: '女子\n老妇\n老翁' }),
        mission('w4-m5', { subtitle: '外形会变，事实要核验', objective: '用 Python 判断三次变化背后的同一身份', mode: 'python', canon: c27, storyBeats: [beat('三次变化', '女子、老妇、老翁都是白骨精变化。'), beat('原著结局', '白骨精被打死，悟空却被唐僧逐走。')], expectedSequence: ['woman_is_demon', 'old_woman_is_demon', 'old_man_is_demon', 'canon_ending'], starterCode: "records = [('女子', '白骨精'), ('老妇', '白骨精'), ('老翁', '白骨精')]\nfor appearance, identity in records:\n    if identity == '白骨精':\n        print(appearance + ': 识破')", expectedOutput: '女子: 识破\n老妇: 识破\n老翁: 识破' }),
      ],
    }),
    deriveWeekFromOutline('week-5', { subtitle: '把复杂问题拆成函数', canon: c44to46,
      missions: [
        mission('w5-m1', { subtitle: '用循环处理重复任务', objective: '用循环记录被役使僧众获救', mode: 'python', canon: c44to46, storyBeats: [beat('僧众受役', '车迟国尊道灭僧，众僧被迫做苦工。'), beat('悟空解救', '悟空施法让僧众离开。')], expectedSequence: ['find_monks', 'release_each'], starterCode: "monks = ['甲', '乙', '丙']\nfor monk in monks:\n    print('放行' + monk)", expectedOutput: '放行甲\n放行乙\n放行丙' }),
        mission('w5-m2', { subtitle: '把重复动作写成函数', objective: '定义函数整理三清观事件', mode: 'python', canon: c44to46, storyBeats: [beat('夜入三清观', '悟空、八戒、沙僧夜里来到三清观。'), beat('留下名号', '三人变化并在观中留下名号。')], expectedSequence: ['enter_temple', 'transform_three', 'leave_names'], starterCode: "def leave_name(name):\n    print(name + '留名')\n\nfor name in ['悟空', '八戒', '沙僧']:\n    leave_name(name)", expectedOutput: '悟空留名\n八戒留名\n沙僧留名' }),
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
      const firstChapter = missionItem.canon.chapters[0] ?? 0;
      if (firstChapter < previousChapter) errors.push(`${missionItem.id}回目顺序倒退`);
      previousChapter = firstChapter;
    }
  }
  if (missionIds.size !== 30) errors.push('课程必须包含30个唯一关卡');
  return errors;
}

export const allMissions = course.weeks.flatMap((week) => week.missions);

export function getMission(id: string): CourseMissionSpec | undefined {
  return allMissions.find((item) => item.id === id);
}
