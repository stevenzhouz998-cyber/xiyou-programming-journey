import type { CourseMissionSpec, CourseWeek, FormalMissionSpec, HintSet, MissionSpec } from './types';

export interface CourseOutlineMission {
  id: string;
  week: number;
  order: number;
  title: string;
  knowledge: string;
  isBoss: boolean;
}

export interface CourseOutlineWeek {
  id: string;
  week: number;
  title: string;
  theme: string;
  missions: CourseOutlineMission[];
}

const mission = (week: number, order: number, title: string, knowledge: string): CourseOutlineMission => ({
  id: `w${week}-m${order}`,
  week,
  order,
  title,
  knowledge,
  isBoss: order === 5,
});

export const courseOutline: { weeks: CourseOutlineWeek[] } = {
  weeks: [
    { id: 'week-1', week: 1, title: '龙宫借宝', theme: '顺序 · 指令 · 基础算法', missions: [
      mission(1, 1, '龙宫求兵', '顺序执行'), mission(1, 2, '定海神针', '数值比较'), mission(1, 3, '四海披挂', '分解任务'), mission(1, 4, '幽冥勾名', '查找与删除'), mission(1, 5, '第三回总试炼', '算法复盘'),
    ] },
    { id: 'week-2', week: 2, title: '大闹天宫', theme: '循环 · 事件 · 调试', missions: [
      mission(2, 1, '弼马温', '重复与循环'), mission(2, 2, '齐天大圣', '事件触发'), mission(2, 3, '蟠桃与金丹', '顺序调试'), mission(2, 4, '八卦炉脱身', '循环条件'), mission(2, 5, '天宫总试炼', '循环与调试复盘'),
    ] },
    { id: 'week-3', week: 3, title: '高老庄收八戒', theme: '条件 · 布尔值 · 分支', missions: [
      mission(3, 1, '庄上求助', '真假条件'), mission(3, 2, '变化高翠兰', '布尔判断'), mission(3, 3, '云栈洞交锋', '条件分支'), mission(3, 4, '八戒归队', '多条件组合'), mission(3, 5, '高老庄总试炼', '条件与分支复盘'),
    ] },
    { id: 'week-4', week: 4, title: '三打白骨精', theme: '变量 · 条件 · Python 入门', missions: [
      mission(4, 1, '积木变代码', '代码映射'), mission(4, 2, '第一次变化', 'Python 变量'), mission(4, 3, '第二次变化', 'Python 条件'), mission(4, 4, '第三次变化', '列表与循环'), mission(4, 5, '白骨迷踪总试炼', '变量与条件复盘'),
    ] },
    { id: 'week-5', week: 5, title: '车迟国斗法', theme: 'Python 循环 · 函数 · 调试', missions: [
      mission(5, 1, '解救僧众', 'for 循环'), mission(5, 2, '三清观', '函数定义'), mission(5, 3, '祈雨赌胜', '函数参数'), mission(5, 4, '后续比试', '问题分解'), mission(5, 5, '车迟国总试炼', 'Python 综合'),
    ] },
    { id: 'week-6', week: 6, title: '三调芭蕉扇', theme: '数据 · 分类 · 提示词 · 核验', missions: [
      mission(6, 1, '三次借扇记录', '结构化数据'), mission(6, 2, '真假扇分类', '分类与标签'), mission(6, 3, '清楚的提示词', '提示词结构'), mission(6, 4, '核验而非猜测', '偏差与事实核验'), mission(6, 5, '火焰山终局试炼', '编程与 AI 综合'),
    ] },
  ],
};

export const allMissionOutlines = courseOutline.weeks.flatMap((week) => week.missions);

type MissionPresentationExtension = Omit<MissionSpec, keyof CourseOutlineMission | 'hints' | 'expectedSequence'>;
export type MissionExtension = MissionPresentationExtension & Pick<MissionSpec, 'expectedSequence'>;
export type FormalMissionExtension = MissionPresentationExtension;
export type CourseWeekExtension = Omit<CourseWeek, keyof CourseOutlineWeek | 'missions'> & { missions: CourseMissionSpec[] };

export function getMissionOutline(id: string): CourseOutlineMission | undefined {
  return allMissionOutlines.find((missionOutline) => missionOutline.id === id);
}

export function isFormalMissionOutline(outline: CourseOutlineMission | undefined): boolean {
  return outline?.week === 1 || outline?.id === 'w2-m1' || outline?.id === 'w2-m2' || outline?.id === 'w2-m3' || outline?.id === 'w2-m4' || outline?.id === 'w2-m5' || outline?.id === 'w3-m1' || outline?.id === 'w3-m2' || outline?.id === 'w3-m3' || outline?.id === 'w3-m4';
}

function deriveHints(extension: MissionPresentationExtension, stepCount: number): HintSet {
  return {
    observe: `先看清“${extension.objective}”里谁先发生、谁后发生。`,
    think: `把大任务拆成 ${Math.max(2, stepCount)} 个小步骤，再逐个检查。`,
    partial: `先从“${extension.storyBeats[0].title}”开始，后面的步骤按原著因果接上。`,
  };
}

export function deriveMissionFromOutline(id: string, extension: MissionExtension): MissionSpec {
  const outline = getMissionOutline(id);
  if (!outline) throw new Error(`Unknown course outline mission: ${id}`);
  return {
    ...outline,
    ...extension,
    hints: deriveHints(extension, extension.expectedSequence.length),
  };
}

export function deriveFormalMissionFromOutline(id: string, extension: FormalMissionExtension): FormalMissionSpec {
  const outline = getMissionOutline(id);
  if (!outline || !isFormalMissionOutline(outline)) throw new Error(`Unknown formal course outline mission: ${id}`);
  return { ...outline, ...extension, hints: deriveHints(extension, extension.storyBeats.length) };
}

export function deriveWeekFromOutline(id: string, extension: CourseWeekExtension): CourseWeek {
  const outline = courseOutline.weeks.find((weekOutline) => weekOutline.id === id);
  if (!outline) throw new Error(`Unknown course outline week: ${id}`);
  return { ...outline, ...extension };
}
