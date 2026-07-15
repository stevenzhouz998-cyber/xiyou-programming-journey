import { lazy, Suspense, useMemo, type ComponentType } from 'react';
import { ToolErrorBoundary } from './ToolErrorBoundary';

type ToolMode = 'blockly' | 'python' | 'ai-lab';
type LazyModule = Promise<{ default: ComponentType<any> }>;

export type MissionToolLoaders = {
  scene: () => LazyModule;
  blockly: () => LazyModule;
  python: () => LazyModule;
  'ai-lab': () => LazyModule;
};

const defaultLoaders: MissionToolLoaders = {
  scene: () => import('./LegacyGameScene').then((module) => ({ default: module.LegacyGameScene })),
  blockly: () => import('./LegacyMissionBuilder').then((module) => ({ default: module.LegacyMissionBuilder })),
  python: () => import('./PythonEditor').then((module) => ({ default: module.PythonEditor })),
  'ai-lab': () => import('./AiLab').then((module) => ({ default: module.AiLab })),
};

export function MissionTools({ missionId, mode, toolProps, sceneProps, loaders = defaultLoaders, reloadPage = () => {
  const url = new URL(window.location.href);
  url.searchParams.set('tool-retry', String(Date.now()));
  window.location.replace(url.toString());
} }: {
  missionId: string;
  mode: ToolMode;
  toolProps: Record<string, unknown>;
  sceneProps: Record<string, unknown>;
  loaders?: MissionToolLoaders;
  reloadPage?: () => void;
}) {
  const Scene = useMemo(() => lazy(loaders.scene ?? defaultLoaders.scene), [missionId, loaders]);
  const Tool = useMemo(() => lazy(loaders[mode]), [missionId, mode, loaders]);
  return <div className="legacy-mission-tools" data-mission-id={missionId}><ToolErrorBoundary key={`${missionId}-scene`} label="任务场景" reloadPage={reloadPage}><Suspense fallback={<div className="mission-tools-loading" role="status">任务场景加载中，请稍候……</div>}><Scene {...sceneProps} /></Suspense></ToolErrorBoundary><ToolErrorBoundary key={`${missionId}-${mode}`} label="任务工具" reloadPage={reloadPage}><Suspense fallback={<div className="mission-tools-loading" role="status">任务工具加载中，请稍候……</div>}><Tool {...toolProps} /></Suspense></ToolErrorBoundary></div>;
}
