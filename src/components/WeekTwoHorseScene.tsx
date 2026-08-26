import { useEffect, useMemo, useState } from 'react';
import type { HorseCareEvent, HorseCareState } from '../blockly/weekTwoHorseContract';
import { assetUrl } from '../utils/assets';

const BACKGROUND = '/assets/week-two-heaven/stable-background.webp';
const STATES = '/assets/week-two-heaven/horse-care-states.webp';

function stageFor(state: HorseCareState): number {
  if (state === 'horses-cared-1') return 1;
  if (state === 'horses-cared-2') return 2;
  if (state === 'horses-cared-3' || state === 'care-loop-finished' || state === 'rank-learned' || state === 'left-heaven') return 3;
  return 0;
}

function progressCopy(stage: number): string {
  return ['三匹天马正在等待照料', '已完成第一轮照料', '已完成第二轮照料', '三轮循环照料全部完成'][stage] ?? '继续运行循环';
}

export function WeekTwoHorseScene({ events, replayToken, reducedMotion, muted, onPlaybackComplete, onResourceStateChange }: {
  events: HorseCareEvent[];
  replayToken: number;
  reducedMotion: boolean;
  muted: boolean;
  onPlaybackComplete?: () => void;
  onResourceStateChange?: (ready: boolean) => void;
}) {
  const state = [...events].reverse().find((event) => event.type === 'horse-cared' || event.type === 'state-changed' || event.type === 'instruction-rejected')?.state ?? 'awaiting-post';
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
  const fail = () => {
    setFailed(true);
    onResourceStateChange?.(false);
  };
  const retryLoad = () => {
    setLoaded({ background: false, sprite: false });
    setFailed(false);
    setRetry((value) => value + 1);
    onResourceStateChange?.(false);
  };

  useEffect(() => onResourceStateChange?.(ready), [onResourceStateChange, ready]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => onPlaybackComplete?.(), reducedMotion ? 0 : 240);
    return () => window.clearTimeout(timer);
  }, [ready, replayToken, reducedMotion, onPlaybackComplete]);

  return <section role="img" aria-label="弼马温循环代码执行场景" className="horse-care-scene" data-scene-state={state} data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-muted={String(muted)} data-scene-ready={String(ready)}>
    <img key={`background-${retry}`} className="horse-care-background" src={assetUrl(BACKGROUND)} srcSet={retry > 0 ? `${assetUrl(BACKGROUND)}?retry=${retry}` : undefined} alt="天宫御马监庭院" onLoad={() => succeed('background')} onError={fail} />
    <div className="horse-care-sprite-viewport" aria-hidden="true"><img key={`sprite-${retry}`} className="horse-care-sprite" src={assetUrl(STATES)} srcSet={retry > 0 ? `${assetUrl(STATES)}?retry=${retry}` : undefined} alt="三匹天马循环照料状态" data-sprite-stage={String(stage)} style={spriteStyle} onLoad={() => succeed('sprite')} onError={fail} /></div>
    {failed ? <div role="alert">场景图片没有加载成功。<button type="button" onClick={retryLoad}>重试加载场景图片</button></div> : <p role="status">{rejected ? '这一步还不能继续，请检查循环次数和积木位置。' : `当前进度：${progressCopy(stage)}`}</p>}
  </section>;
}
