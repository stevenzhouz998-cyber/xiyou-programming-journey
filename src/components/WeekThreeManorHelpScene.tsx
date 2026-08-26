import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { ManorHelpRuntimeEvent } from '../blockly/weekThreeManorHelpContract';
import { assetUrl } from '../utils/assets';

const BACKGROUND = '/assets/week-three-manor-help/manor-help-background.webp';
const STATES = '/assets/week-three-manor-help/manor-message-states.webp';
const PLAYBACK_MS = 320;

type SceneProps = {
  events: ManorHelpRuntimeEvent[];
  replayToken: number;
  reducedMotion: boolean;
  muted: boolean;
  onPlaybackComplete?: () => void;
  onResourceStateChange?: (ready: boolean) => void;
};

type SceneState = {
  cell: '0' | '1' | '2' | '3';
  narrative: string;
};

function stateForEvents(events: ManorHelpRuntimeEvent[]): SceneState {
  const event = [...events].reverse().find((candidate) => candidate.scenarioId !== null);
  if (!event || event.scenarioId === 'canon-gaocai-help') {
    if (event && (event.type === 'action-selected' || event.type === 'scenario-settled')
      && event.actualBranch === 'then') return { cell: '1', narrative: '高才回庄禀报，高太公正准备邀请入庄。' };
    return { cell: '0', narrative: '高才说明求助，悟空正在听清口信。' };
  }
  if ((event.type === 'action-selected' || event.type === 'scenario-settled') && event.actualBranch === 'else') {
    return { cell: '3', narrative: '庄客继续前行，悟空也继续问路。' };
  }
  return { cell: '2', narrative: '庄客正在介绍高老庄的道路。' };
}

export function WeekThreeManorHelpScene({
  events,
  replayToken,
  reducedMotion,
  muted,
  onPlaybackComplete,
  onResourceStateChange,
}: SceneProps) {
  const [loaded, setLoaded] = useState({ background: false, states: false });
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const retryOwner = useRef(0);
  const mounted = useRef(true);
  const playbackOwner = useRef(0);
  const completedReplayToken = useRef(0);
  const state = useMemo(() => stateForEvents(events), [events]);
  const ready = loaded.background && loaded.states && !failed;
  const source = (path: string) => `${assetUrl(path)}${retry === 0 ? '' : `?retry=${retry}`}`;
  const stateStyle = { '--manor-state-cell': state.cell } as CSSProperties;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { onResourceStateChange?.(ready); }, [onResourceStateChange, ready]);
  useEffect(() => {
    playbackOwner.current += 1;
    const owner = playbackOwner.current;
    if (!ready || replayToken <= 0 || completedReplayToken.current === replayToken) return undefined;
    const timer = window.setTimeout(() => {
      if (mounted.current && owner === playbackOwner.current) {
        completedReplayToken.current = replayToken;
        onPlaybackComplete?.();
      }
    }, reducedMotion ? 0 : PLAYBACK_MS);
    return () => window.clearTimeout(timer);
  }, [onPlaybackComplete, ready, reducedMotion, replayToken]);

  const ownsRetry = (owner: number) => mounted.current && owner === retryOwner.current;
  const onLoad = (asset: keyof typeof loaded, owner: number) => () => {
    if (!ownsRetry(owner)) return;
    setLoaded((current) => ({ ...current, [asset]: true }));
  };
  const onError = (owner: number) => () => {
    if (!ownsRetry(owner)) return;
    setFailed(true);
  };
  const retryLoading = () => {
    retryOwner.current += 1;
    setLoaded({ background: false, states: false });
    setFailed(false);
    setRetry(retryOwner.current);
  };

  return <section className="horse-care-scene week-three-manor-help-scene">
    <div
      role="img"
      aria-label="庄上求助代码执行场景"
      className="week-three-manor-help-scene-visual"
      data-scene-ready={String(ready)}
      data-motion-mode={reducedMotion ? 'reduced' : 'standard'}
      data-muted={String(muted)}
      data-state-cell={state.cell}
      style={stateStyle}
    >
      <img key={`background-${retry}`} src={source(BACKGROUND)} alt="高老庄求助道路" className="week-three-manor-help-background" onLoad={onLoad('background', retry)} onError={onError(retry)} />
      <div className="week-three-manor-help-sprite-viewport" data-testid="week-three-manor-help-sprite-viewport">
        <img key={`states-${retry}`} src={source(STATES)} alt="高才回庄与庄客问路状态" className="week-three-manor-help-state-sheet" style={stateStyle} onLoad={onLoad('states', retry)} onError={onError(retry)} />
      </div>
    </div>
    {failed
      ? <div role="alert">庄上求助场景图片没有加载成功。<button type="button" onClick={retryLoading}>重试加载场景图片</button></div>
      : <p role="status">{state.narrative}</p>}
  </section>;
}
