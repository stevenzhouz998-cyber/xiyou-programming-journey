import { deriveFormalMissionFromOutline, type FormalMissionExtension } from './courseOutline';
import type { CanonRef, FormalMissionSpec, StoryBeat } from './types';

export const formalWeekOneCanon: CanonRef = {
  chapters: [3],
  title: '第三回　四海千山皆拱伏　九幽十类尽除名',
  sourceUrl: 'https://zh.wikisource.org/zh-hans/西游记/第003回',
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

export function getFormalMission(id: string): FormalMissionSpec | undefined {
  return formalWeekOneMissions.find((mission) => mission.id === id);
}
