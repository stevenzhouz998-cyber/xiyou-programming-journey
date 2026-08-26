import { useEffect, useMemo, useState } from 'react';
import type { MonkeyKingRuntimeEvent, MonkeyKingState } from '../blockly/weekTwoMonkeyKingContract';
import { assetUrl } from '../utils/assets';

const BACKGROUND = '/assets/week-two-great-sage/flower-fruit-background.webp';
const STATES = '/assets/week-two-great-sage/great-sage-event-states.webp';

function stageFor(state: MonkeyKingState): number {
  if (state === 'flag-raised') return 1;
  if (state === 'title-accepted') return 2;
  if (state === 'residence-built') return 3;
  return 0;
}

function progressCopy(stage: number): string {
  return ['等待“返回花果山”事件', '齐天大圣旗已经竖起', '齐天大圣名号已经接受', '齐天大圣府已经建立'][stage] ?? '继续派发事件';
}

export function WeekTwoMonkeyKingScene({ events, replayToken, reducedMotion, muted, onPlaybackComplete, onResourceStateChange }: {
  events: MonkeyKingRuntimeEvent[];
  replayToken: number;
  reducedMotion: boolean;
  muted: boolean;
  onPlaybackComplete?: () => void;
  onResourceStateChange?: (ready: boolean) => void;
}) {
  const state = [...events].reverse().find((event) => event.type === 'state-changed' || event.type === 'instruction-rejected')?.state ?? 'awaiting-return';
  const rejected = events.some((event) => event.type === 'instruction-rejected');
  const stage = stageFor(state);
  const [loaded, setLoaded] = useState({ background: false, sprite: false });
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const ready = loaded.background && loaded.sprite && !failed;
  const spriteStyle = useMemo(() => ({
    width: '200%',
    height: '200%',
    maxWidth: 'none',
    transform: `translate(-${(stage % 2) * 50}%, -${Math.floor(stage / 2) * 50}%)`,
  }), [stage]);
  const succeed = (resource: 'background' | 'sprite') => setLoaded((current) => ({ ...current, [resource]: true }));
  const fail = () => { setFailed(true); onResourceStateChange?.(false); };
  const retryLoad = () => { setLoaded({ background: false, sprite: false }); setFailed(false); setRetry((value) => value + 1); onResourceStateChange?.(false); };

  useEffect(() => onResourceStateChange?.(ready), [onResourceStateChange, ready]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => onPlaybackComplete?.(), reducedMotion ? 0 : 260);
    return () => window.clearTimeout(timer);
  }, [ready, replayToken, reducedMotion, onPlaybackComplete]);

  return <section role="img" aria-label="齐天大圣事件代码执行场景" className="monkey-king-scene" data-scene-state={state} data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-muted={String(muted)} data-scene-ready={String(ready)}>
    <img key={`background-${retry}`} className="monkey-king-background" src={assetUrl(BACKGROUND)} srcSet={retry > 0 ? `${assetUrl(BACKGROUND)}?retry=${retry}` : undefined} alt="花果山齐天大圣营地" onLoad={() => succeed('background')} onError={fail} />
    <div className="monkey-king-sprite-viewport" aria-hidden="true"><img key={`sprite-${retry}`} className="monkey-king-sprite" src={assetUrl(STATES)} srcSet={retry > 0 ? `${assetUrl(STATES)}?retry=${retry}` : undefined} alt="齐天大圣事件进度状态" data-sprite-stage={String(stage)} style={spriteStyle} onLoad={() => succeed('sprite')} onError={fail} /></div>
    {failed ? <div role="alert">场景图片没有加载成功。<button type="button" onClick={retryLoad}>重试加载场景图片</button></div> : <p role="status">{rejected ? '事件在问题积木处停下了，请检查它连接的事件帽与先后顺序。' : `当前进度：${progressCopy(stage)}`}</p>}
  </section>;
}
