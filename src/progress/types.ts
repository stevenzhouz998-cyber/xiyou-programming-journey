import type { BattleInstruction, BattleRunResult } from '../battle/types';
import type { WorkspaceDraftV1 } from '../blockly/draft';

export interface MissionProgress {
  status: 'completed';
  stars: 1 | 2 | 3;
  attempts: number;
  hintsUsed: number;
  completedAt: string;
}

export interface ProgressSettings {
  muted: boolean;
  reducedMotion: boolean;
  reducedMotionOverride: boolean;
  parentPin: string;
}

export interface ProgressV1 {
  version: 1;
  learnerName: string;
  missions: Record<string, MissionProgress>;
  settings: Omit<ProgressSettings, 'reducedMotionOverride'>;
  savedAt: string;
}

export interface ProgressV2 {
  version: 2;
  schemaRevision: 1;
  learnerName: string;
  missions: Record<string, MissionProgress>;
  settings: ProgressSettings;
  privacy: { localDataNoticeSeen: boolean };
  recovery: {
    lastRecoveredAt: string | null;
    source: 'snapshot' | 'initial' | null;
  };
  savedAt: string;
}

export interface MissionSession {
  workspace: WorkspaceDraftV1;
  lastTrace: BattleInstruction[];
  lastRun: BattleRunResult | null;
  totalRuns: number;
  runtimeFailures: number;
  compileFailures: number;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  conceptFailures: {
    programStructure: number;
    sequencePrecondition: number;
    completeness: number;
  };
  lastRunAt: string | null;
  savedAt: string;
}

export interface ProgressV3 {
  version: 3;
  schemaRevision: 1;
  learnerName: string;
  missions: Record<string, MissionProgress>;
  settings: ProgressSettings;
  privacy: { localDataNoticeSeen: boolean };
  recovery: {
    lastRecoveredAt: string | null;
    source: 'snapshot' | 'initial' | null;
  };
  sessions: Record<string, MissionSession>;
  savedAt: string;
}

export type ProgressDocument = ProgressV1 | ProgressV2 | ProgressV3;
