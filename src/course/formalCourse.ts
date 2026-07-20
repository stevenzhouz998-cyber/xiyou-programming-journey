import { deriveMissionFromOutline, type MissionExtension } from './courseOutline';
import type { CanonRef, MissionSpec, StoryBeat } from './types';

export const formalWeekOneCanon: CanonRef = {
  chapters: [3],
  title: '第三回　四海千山皆拱伏　九幽十类尽除名',
  sourceUrl: 'https://zh.wikisource.org/zh-hans/西游记/第003回',
};

const beat = (title: string, summary: string): StoryBeat => ({ title, summary, canon: true });

const formalMission = (id: string, extension: Omit<MissionExtension, 'mode'>): MissionSpec => (
  deriveMissionFromOutline(id, { ...extension, mode: 'blockly' })
);

export const formalWeekOneMissions: MissionSpec[] = [
  formalMission('w1-m1', { subtitle: '按先后试遍兵器', objective: '排列求兵的正确步骤', canon: formalWeekOneCanon, storyBeats: [beat('入东海龙宫', '悟空来到东海龙宫求一件趁手兵器。'), beat('试用兵器', '龙王先后命人抬出兵器，悟空都嫌太轻。')], expectedSequence: ['enter_palace', 'ask_weapon', 'test_weapon'] }),
  formalMission('w1-m2', { subtitle: '找到称心的如意兵器', objective: '比较兵器重量并选出金箍棒', canon: formalWeekOneCanon, storyBeats: [beat('神珍放光', '海藏中的定海神珍铁放出霞光。'), beat('随心变化', '神珍依悟空心意变小，成为如意金箍棒。')], expectedSequence: ['inspect_weight', 'choose_heaviest', 'shrink_staff'] }),
  formalMission('w1-m3', { subtitle: '把装备步骤排整齐', objective: '按原著顺序整理披挂', canon: formalWeekOneCanon, storyBeats: [beat('再求披挂', '悟空得棒后又向龙王索求披挂。'), beat('三海送宝', '其余三海龙王带来金冠、金甲和云履。')], expectedSequence: ['request_armor', 'receive_crown', 'receive_armor', 'receive_boots'] }),
];

export function getFormalMission(id: string): MissionSpec | undefined {
  return formalWeekOneMissions.find((mission) => mission.id === id);
}
