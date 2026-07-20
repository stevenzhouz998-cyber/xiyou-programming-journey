export type MissionMode = 'blockly' | 'python' | 'ai-lab';

export interface CanonRef {
  chapters: number[];
  title: string;
  sourceUrl: string;
}

export interface StoryBeat {
  title: string;
  summary: string;
  canon: true;
}

export interface HintSet {
  observe: string;
  think: string;
  partial: string;
}

export interface MissionSpec {
  id: string;
  week: number;
  order: number;
  title: string;
  subtitle: string;
  objective: string;
  knowledge: string;
  mode: MissionMode;
  isBoss: boolean;
  canon: CanonRef;
  storyBeats: StoryBeat[];
  hints: HintSet;
  expectedSequence: string[];
  starterCode?: string;
  expectedOutput?: string;
  aiDataset?: Array<Record<string, string | number | boolean>>;
}

export type FormalMissionSpec = Omit<MissionSpec, 'expectedSequence'>;
export type CourseMissionSpec = MissionSpec | FormalMissionSpec;

export interface CourseWeek {
  id: string;
  week: number;
  title: string;
  subtitle: string;
  theme: string;
  canon: CanonRef;
  missions: CourseMissionSpec[];
}

export interface CourseManifest {
  id: string;
  title: string;
  version: number;
  weeks: CourseWeek[];
}
