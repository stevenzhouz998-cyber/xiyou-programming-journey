import { useEffect, useMemo, useState } from 'react';
import type { PeachElixirRuntimeEvent, PeachElixirState } from '../blockly/weekTwoPeachElixirContract';
import { assetUrl } from '../utils/assets';

const BACKGROUND = '/assets/week-two-peach-elixir/heavenly-route-background.webp';
const STATES = '/assets/week-two-peach-elixir/peach-elixir-states.webp';
const stageFor = (state: PeachElixirState) => ['awaiting-garden', 'garden-guarded', 'banquet-learned', 'banquet-visited', 'tusita-entered', 'elixir-eaten'].indexOf(state);
const progressCopy = ['等待开始检查故事', '已经看守蟠桃园', '已经得知蟠桃会', '已经进入瑶池', '已经误入兜率宫', '故事顺序调试完成'];

export function WeekTwoPeachElixirScene({ events, replayToken, reducedMotion, muted, onPlaybackComplete, onResourceStateChange }: {
  events: PeachElixirRuntimeEvent[];
  replayToken: number;
  reducedMotion: boolean;
  muted: boolean;
  onPlaybackComplete?: () => void;
  onResourceStateChange?: (ready: boolean) => void;
}) {
  const state = [...events].reverse().find((event) => event.type === 'state-changed' || event.type === 'instruction-rejected')?.state ?? 'awaiting-garden';
  const rejected = events.some((event) => event.type === 'instruction-rejected');
  const stage = Math.max(0, stageFor(state));
  const [loaded, setLoaded] = useState({ background: false, sprite: false });
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const ready = loaded.background && loaded.sprite && !failed;
  const spriteStyle = useMemo(() => ({ width: '300%', height: '200%', maxWidth: 'none', transform: `translate(-${(stage % 3) * (100 / 3)}%, -${Math.floor(stage / 3) * 50}%)` }), [stage]);
  const succeed = (resource: 'background' | 'sprite') => setLoaded((current) => ({ ...current, [resource]: true }));
  const fail = () => { setFailed(true); onResourceStateChange?.(false); };
  const retryLoad = () => { setLoaded({ background: false, sprite: false }); setFailed(false); setRetry((value) => value + 1); onResourceStateChange?.(false); };
  useEffect(() => onResourceStateChange?.(ready), [onResourceStateChange, ready]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => onPlaybackComplete?.(), reducedMotion ? 0 : 280);
    return () => window.clearTimeout(timer);
  }, [ready, replayToken, reducedMotion, onPlaybackComplete]);
  return <section role="img" aria-label="蟠桃与金丹代码执行场景" className="peach-elixir-scene" data-scene-state={state} data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-muted={String(muted)} data-scene-ready={String(ready)}>
    <img key={`background-${retry}`} className="peach-elixir-background" src={assetUrl(BACKGROUND)} srcSet={retry ? `${assetUrl(BACKGROUND)}?retry=${retry}` : undefined} alt="蟠桃园到兜率宫的天宫路线" onLoad={() => succeed('background')} onError={fail} />
    <div className="peach-elixir-sprite-viewport" aria-hidden="true"><img key={`sprite-${retry}`} className="peach-elixir-sprite" src={assetUrl(STATES)} srcSet={retry ? `${assetUrl(STATES)}?retry=${retry}` : undefined} alt="蟠桃与金丹调试进度状态" data-sprite-stage={String(stage)} style={spriteStyle} onLoad={() => succeed('sprite')} onError={fail} /></div>
    {failed ? <div role="alert">场景图片没有加载成功。<button type="button" onClick={retryLoad}>重试加载场景图片</button></div> : <p role="status">{rejected ? '故事在问题积木处停下了，请检查它前面的真实步骤。' : `当前进度：${progressCopy[stage]}`}</p>}
  </section>;
}
