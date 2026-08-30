import { deriveFormalMissionFromOutline, type FormalMissionExtension } from './courseOutline';
import type { CanonRef, FormalMissionSpec, StoryBeat } from './types';

export const formalWeekOneCanon: CanonRef = {
  chapters: [3],
  title: '第三回　四海千山皆拱伏　九幽十类尽除名',
  sourceUrl: 'https://zh.wikisource.org/zh-hans/西游记/第003回',
};

export const formalWeekTwoCanon: CanonRef = {
  chapters: [4, 5, 6, 7],
  title: '第四至七回　官封弼马温至五行山定心猿',
  sourceUrl: 'https://zh.wikisource.org/zh-hans/西游记/第004回',
};

export const formalWeekThreeCanon: CanonRef = {
  chapters: [18],
  title: '第十八回　观音院唐僧脱难　高老庄大圣除魔',
  sourceUrl: 'https://zh.wikisource.org/zh-hans/西游记/第018回',
};

const beat = (title: string, summary: string): StoryBeat => ({ title, summary, canon: true });

const formalMission = (id: string, extension: Omit<FormalMissionExtension, 'mode'>): FormalMissionSpec => (
  deriveFormalMissionFromOutline(id, { ...extension, mode: 'blockly' })
);

export const formalWeekOneMissions: FormalMissionSpec[] = [
  formalMission('w1-m1', { subtitle: '按先后试遍兵器', objective: '排列求兵的正确步骤', canon: formalWeekOneCanon, storyBeats: [beat('入东海龙宫', '悟空来到东海龙宫求一件趁手兵器。'), beat('试用兵器', '龙王先后命人抬出兵器，悟空都嫌太轻。')] }),
  formalMission('w1-m2', { subtitle: '找到称心的如意兵器', objective: '比较兵器重量并选出金箍棒', canon: formalWeekOneCanon, storyBeats: [beat('神珍放光', '海藏中的定海神珍铁放出霞光。'), beat('随心变化', '神珍依悟空心意变小，成为如意金箍棒。')] }),
  formalMission('w1-m3', { subtitle: '把装备步骤排整齐', objective: '按原著顺序整理披挂', canon: formalWeekOneCanon, storyBeats: [beat('再求披挂', '悟空得棒后又向龙王索求披挂。'), beat('三海送宝', '其余三海龙王带来金冠、金甲和云履。')] }),
  formalMission('w1-m4', { subtitle: '在名册里找到猴属', objective: '查找并处理生死簿中的猴属名号', canon: formalWeekOneCanon, storyBeats: [beat('梦入幽冥', '悟空被勾魂使者带到幽冥界。'), beat('勾去猴属', '悟空查看生死簿，将猴属有名者一概勾去。')] }),
  formalMission('w1-m5', { subtitle: '重建第三回因果链', objective: '用行程调度台复盘第三回的算法线索', canon: formalWeekOneCanon, storyBeats: [beat('龙宫检查', '悟空在龙宫比较兵器，取得能随心变化的金箍棒。'), beat('名册检查', '随后在幽冥查找并处理猴属名号。')] }),
];

export const formalWeekTwoMissions: FormalMissionSpec[] = [
  formalMission('w2-m1', {
    subtitle: '从受封到反下天宫',
    objective: '用循环完成重复的天马照料任务',
    canon: formalWeekTwoCanon,
    storyBeats: [
      beat('天宫受封', '悟空被招上天庭，受封弼马温。'),
      beat('反下天宫', '得知官职品级后，悟空打出御马监返回花果山。'),
    ],
  }),
  formalMission('w2-m2', {
    subtitle: '让两个事件各自触发正确动作',
    objective: '用事件帽分别处理返回花果山与天庭正式授号',
    canon: formalWeekTwoCanon,
    storyBeats: [
      beat('自称齐天', '悟空返回花果山，竖起齐天大圣旗号。'),
      beat('天庭建府', '天庭依太白金星之议，授齐天大圣虚衔并建立齐天大圣府。'),
    ],
  }),
  formalMission('w2-m3', {
    subtitle: '找出金丹积木为什么跑得太早',
    objective: '调试蟠桃会到兜率宫的真实事件顺序',
    canon: formalWeekTwoCanon,
    storyBeats: [
      beat('管理蟠桃园', '悟空受命管理蟠桃园，后来从七仙女处得知蟠桃会。'),
      beat('瑶池饮酒', '悟空来到尚未开席的瑶池，饮下仙酒。'),
      beat('误入兜率宫', '悟空醉后走错到兜率宫，最后吃下金丹。'),
    ],
  }),
  formalMission('w2-m4', {
    subtitle: '检查循环结束条件',
    objective: '让炼炉计时在正确条件下停止',
    canon: formalWeekTwoCanon,
    storyBeats: [
      beat('二郎神与老君相助', '二郎神与悟空斗法，太上老君以金刚琢相助擒拿。'),
      beat('巽位避火', '悟空进入八卦炉后藏到巽位，等到炉头声响、看见光明才脱身。'),
    ],
  }),
  formalMission('w2-m5', {
    subtitle: '修复四类天宫程序错误',
    objective: '用事件、循环和调试完成天宫总试炼',
    canon: formalWeekTwoCanon,
    storyBeats: [
      beat('由御马监到八卦炉', '悟空从弼马温反下天宫，历经齐天名号、蟠桃金丹和八卦炉脱身。'),
      beat('掌中赌赛与五行山', '悟空脱身后与如来赌赛，最终被压在五行山下。'),
    ],
  }),
];

export const formalWeekThreeMissions: FormalMissionSpec[] = [
  formalMission('w3-m1', {
    subtitle: '同一条件，辨清求助与问路',
    objective: '让同一张条件程序正确处理两张口信',
    canon: formalWeekThreeCanon,
    storyBeats: [
      beat('高才求助', '高才奉高太公之命寻找能降妖的法师，悟空听明缘由后主动应承。'),
      beat('高太公迎请', '高太公得知取经人一行到来，迎请他们入庄说明困扰。'),
    ],
  }),
  formalMission('w3-m2', {
    subtitle: '同一时刻，外形和身份可以一真一假',
    objective: '让两道条件分别判断伪装外形与真实身份',
    canon: formalWeekThreeCanon,
    storyBeats: [
      beat('变化等候', '高翠兰安全离开后，悟空变作她的模样等候妖怪。'),
      beat('取得线索并显形', '妖怪未认出悟空；悟空得知姓名住处后显出本相，妖怪逃走。'),
    ],
  }),
  formalMission('w3-m3', {
    subtitle: '让分支跟着西行使命走',
    objective: '用同一张条件程序处理两轮云栈洞对话',
    canon: { ...formalWeekThreeCanon, chapters: [19], title: '第十九回　云栈洞悟空收八戒', sourceUrl: 'https://zh.wikisource.org/zh-hans/西游记/第019回' },
    storyBeats: [
      beat('先听悟空身份', '只说明孙悟空身份时，猪刚鬣仍继续守着云栈洞。'),
      beat('再说明西行使命', '明确说明保护唐三藏西行取经后，猪刚鬣放下钉耙，说明受观音点化的来历。'),
    ],
  }),
  formalMission('w3-m4', {
    subtitle: '两个必要条件要同时满足',
    objective: '让观音此前授戒与明确愿随唐僧西去两个条件同时满足',
    canon: { ...formalWeekThreeCanon, chapters: [19], title: '第十九回　云栈洞悟空收八戒', sourceUrl: 'https://zh.wikisource.org/zh-hans/西游记/第019回' },
    storyBeats: [
      beat('拜见并复述安排', '猪悟能拜见唐僧并复述观音安排；观音此前已授戒，法名悟能。'),
      beat('另名八戒，挑担西行', '唐僧后来另名八戒，八戒挑担西行。'),
    ],
  }),
  formalMission('w3-m5', {
    subtitle: '在一张图中复盘高老庄条件链',
    objective: '让同一张 Blockly 图从庄口求助依次推进到八戒归队',
    canon: { ...formalWeekThreeCanon, chapters: [18, 19], title: '第十八至十九回　高老庄收八戒', sourceUrl: 'https://zh.wikisource.org/zh-hans/西游记/第018回' },
    storyBeats: [
      beat('四段公开证据', '庄口求助、后宅伪装、云栈洞对话与归队核验必须在同一轮运行中完成。'),
      beat('回顾完成', '八戒挑担随师徒西行，第三周条件学习进入回顾完成。'),
    ],
  }),
];

export function getFormalMission(id: string): FormalMissionSpec | undefined {
  return [...formalWeekOneMissions, ...formalWeekTwoMissions, ...formalWeekThreeMissions]
    .find((mission) => mission.id === id);
}
