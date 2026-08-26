import { useEffect, useState } from 'react';
import type { FurnaceConditionRuntimeEvent } from '../blockly/weekTwoFurnaceConditionContract';
import { assetUrl } from '../utils/assets';

const BACKGROUND = '/assets/week-two-furnace/furnace-interior-background.webp';
const STATES = '/assets/week-two-furnace/furnace-condition-states.webp';
export function WeekTwoFurnaceConditionScene({ events, replayToken, reducedMotion, muted, onPlaybackComplete, onResourceStateChange }: { events: FurnaceConditionRuntimeEvent[]; replayToken: number; reducedMotion: boolean; muted: boolean; onPlaybackComplete?: () => void; onResourceStateChange?: (ready: boolean) => void }) {
  const latest = [...events].reverse().find((event) => event.type === 'state-changed' || event.type === 'instruction-rejected');
  const [loaded, setLoaded] = useState({ background: false, states: false }); const [failed, setFailed] = useState(false); const [retry, setRetry] = useState(0);
  const ready = loaded.background && loaded.states && !failed;
  const source = (asset: string) => `${assetUrl(asset)}${retry ? `?retry=${retry}` : ''}`;
  useEffect(() => onResourceStateChange?.(ready), [onResourceStateChange, ready]);
  useEffect(() => { if (!ready) return; const timer = window.setTimeout(() => onPlaybackComplete?.(), reducedMotion ? 0 : 320); return () => window.clearTimeout(timer); }, [ready, replayToken, reducedMotion, onPlaybackComplete]);
  const fail = () => { setFailed(true); onResourceStateChange?.(false); };
  return <section role="img" aria-label="八卦炉脱身代码执行场景" className="horse-care-scene furnace-condition-scene" data-scene-state={latest?.state ?? 'captured'} data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-muted={String(muted)} data-scene-ready={String(ready)}>
    <img key={`background-${retry}`} src={source(BACKGROUND)} alt="八卦炉内部与炉门" onLoad={() => setLoaded((current) => ({ ...current, background: true }))} onError={fail} />
    <img key={`states-${retry}`} src={source(STATES)} alt="八卦炉七轮等待与脱身状态" onLoad={() => setLoaded((current) => ({ ...current, states: true }))} onError={fail} />
    {failed ? <div role="alert">场景图片没有加载成功。<button type="button" onClick={() => { setLoaded({ background: false, states: false }); setFailed(false); setRetry((value) => value + 1); }}>重试加载场景图片</button></div> : <p role="status">{latest?.type === 'instruction-rejected' ? '循环在需要检查的条件处停下了。' : '等待炉门真正打开。'}</p>}
  </section>;
}
