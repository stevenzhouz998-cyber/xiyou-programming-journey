import { Component, lazy, Suspense, useMemo, type ComponentType, type ErrorInfo, type ReactNode } from 'react';

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
  blockly: () => import('./BlocklyWorkspace').then((module) => ({ default: module.BlocklyWorkspace })),
  python: () => import('./PythonEditor').then((module) => ({ default: module.PythonEditor })),
  'ai-lab': () => import('./AiLab').then((module) => ({ default: module.AiLab })),
};

export class ToolErrorBoundary extends Component<{ children: ReactNode; reloadPage: () => void; label: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Visible recovery is rendered below. */ }
  render() {
    if (this.state.failed) return <div className="mission-tools-error" role="alert"><strong>{this.props.label}加载失败</strong><p>请确认网络恢复后重新加载页面，当前已保存的进度不会丢失。</p><button className="button button-primary" type="button" onClick={this.props.reloadPage}>重新加载页面</button></div>;
    return this.props.children;
  }
}

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
  return <><ToolErrorBoundary key={`${missionId}-scene`} label="任务场景" reloadPage={reloadPage}><Suspense fallback={<div className="mission-tools-loading" role="status">任务场景加载中，请稍候……</div>}><Scene {...sceneProps} /></Suspense></ToolErrorBoundary><ToolErrorBoundary key={`${missionId}-${mode}`} label="任务工具" reloadPage={reloadPage}><Suspense fallback={<div className="mission-tools-loading" role="status">任务工具加载中，请稍候……</div>}><Tool {...toolProps} /></Suspense></ToolErrorBoundary></>;
}
