import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { CuilanBooleanRuntimeEvent } from '../blockly/weekThreeCuilanBooleanContract';
import { assetUrl } from '../utils/assets';

export interface WeekThreeCuilanBooleanSceneProps {
  events: CuilanBooleanRuntimeEvent[];
  replayToken: number;
  reducedMotion: boolean;
  muted: boolean;
  onPlaybackComplete?: () => void;
  onResourceStateChange?: (ready: boolean) => void;
}
const background = '/assets/week-three-cuilan/cuilan-disguise-background.webp';
const states = '/assets/week-three-cuilan/cuilan-boolean-states.webp';
const PLAYBACK_MS = 300;
const CELL_BY_STATE = { transforming: '0', disguised: '1', clue: '2', revealed: '3', fled: '4' } as const;
const stateFor = (events: CuilanBooleanRuntimeEvent[]) => {
  const state = [...events].reverse().find((event) => event.type === 'instruction-accepted' || event.type === 'run-finished')?.state ?? 'cuilan-safe';
  return state === 'demon-fled' ? ['fled', '悟空显出本相，妖怪逃走。'] as const : state === 'revealed' ? ['revealed', '悟空已经显出本相。'] as const : state === 'clue-acquired' || state === 'identity-checked' ? ['clue', '悟空从对话中取得了线索。'] as const : state === 'disguise-ready' ? ['disguised', '悟空保持伪装等待妖怪。'] as const : ['transforming', '悟空正在变化并准备等候。'] as const;
};
export function WeekThreeCuilanBooleanScene({ events, replayToken, reducedMotion, muted, onPlaybackComplete, onResourceStateChange }: WeekThreeCuilanBooleanSceneProps) {
  const [loaded, setLoaded] = useState({ background: false, states: false }); const [failed, setFailed] = useState(false); const [retry, setRetry] = useState(0); const mounted = useRef(true); const retryOwner = useRef(0); const playbackOwner = useRef(0); const completedReplayToken = useRef(0);
  const [state, narrative] = useMemo(() => stateFor(events), [events]); const cell = CELL_BY_STATE[state]; const ready = loaded.background && loaded.states && !failed;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (loaded.background && loaded.states && failed) setFailed(false); }, [loaded, failed]);
  useEffect(() => { onResourceStateChange?.(ready); }, [ready, replayToken, onResourceStateChange]);
  useEffect(() => { playbackOwner.current += 1; const owner = playbackOwner.current; if (!ready || replayToken === 0 || completedReplayToken.current === replayToken) return undefined; const id = window.setTimeout(() => { if (mounted.current && owner === playbackOwner.current) { completedReplayToken.current = replayToken; onPlaybackComplete?.(); } }, reducedMotion ? 0 : PLAYBACK_MS); return () => window.clearTimeout(id); }, [onPlaybackComplete, ready, reducedMotion, replayToken]);
  const source = (path: string) => `${assetUrl(path)}${retry === 0 ? '' : `?retry=${retry}`}`;
  const style = { '--cuilan-state-cell': cell } as CSSProperties;
  const ownsRetry = (owner: number) => mounted.current && owner === retryOwner.current;
  const onLoad = (asset: keyof typeof loaded, owner: number) => () => { if (ownsRetry(owner)) setLoaded((value) => ({ ...value, [asset]: true })); };
  const onError = (owner: number) => () => { if (ownsRetry(owner)) setFailed(true); };
  const retryLoading = () => { retryOwner.current += 1; setLoaded({ background: false, states: false }); setFailed(false); setRetry(retryOwner.current); };
  return <section className="week-three-cuilan-scene"><div role="img" aria-label="变化高翠兰执行场景" className="week-three-cuilan-scene-visual" data-scene-ready={String(ready)} data-state={state} data-state-cell={cell} data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-muted={String(muted)} style={style}>
    <img key={`background-${retry}`} src={source(background)} alt="高老庄庭院等待场景" className="week-three-cuilan-background" onLoad={onLoad('background', retry)} onError={onError(retry)} />
    <div className="week-three-cuilan-sprite-viewport" data-testid="week-three-cuilan-sprite-viewport"><img key={`states-${retry}`} src={source(states)} alt="悟空变化、等候和显出本相状态" className="week-three-cuilan-state-sheet" style={style} onLoad={onLoad('states', retry)} onError={onError(retry)} /></div>
  </div>{failed ? <div role="alert">变化高翠兰场景图片没有加载成功。<button type="button" onClick={retryLoading}>重试加载场景图片</button></div> : <p role="status">{narrative}</p>}</section>;
}
