import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { YunzhanDialogueRuntimeEvent } from '../blockly/weekThreeYunzhanDialogueContract';
import { assetUrl } from '../utils/assets';

export interface WeekThreeYunzhanDialogueSceneProps { events: YunzhanDialogueRuntimeEvent[]; replayToken: number; reducedMotion: boolean; muted: boolean; onResourceStateChange: (ready: boolean) => void; onPlaybackComplete: () => void; }
const BACKGROUND = 'assets/week-three-yunzhan-dialogue/yunzhan-dialogue-background.webp';
const STATES = 'assets/week-three-yunzhan-dialogue/yunzhan-dialogue-states.webp';
export function WeekThreeYunzhanDialogueScene({ events, replayToken, reducedMotion, muted, onResourceStateChange, onPlaybackComplete }: WeekThreeYunzhanDialogueSceneProps) {
  const [loaded, setLoaded] = useState<Set<string>>(new Set()); const [failed, setFailed] = useState(false); const [retry, setRetry] = useState(0); const [eventIndex, setEventIndex] = useState(0); const completedToken = useRef<number | null>(null); const completeRef = useRef(onPlaybackComplete); completeRef.current = onPlaybackComplete;
  const ready = loaded.size === 2 && !failed; useEffect(() => { onResourceStateChange(ready); }, [ready, onResourceStateChange]);
  useEffect(() => { setEventIndex(0); }, [replayToken]);
  useEffect(() => { if (!ready || replayToken <= 0) return; if (eventIndex < events.length - 1) { const id = window.setTimeout(() => setEventIndex((value) => value + 1), reducedMotion ? 0 : 200); return () => window.clearTimeout(id); } if (completedToken.current !== replayToken) { completedToken.current = replayToken; completeRef.current(); } }, [ready, replayToken, reducedMotion, eventIndex, events.length]);
  const event = events[Math.min(eventIndex, Math.max(0, events.length - 1))]; const stateCell = event?.type === 'round-started' ? event.roundId === 'pilgrimage-explicit' ? 2 : 0 : event?.opcode === 'guard-cave' ? 1 : event?.opcode === 'explain-guanyin-origin' ? 3 : 0;
  const label = event?.type === 'round-started' ? event.roundId === 'pilgrimage-explicit' ? '悟空明确说明要保护唐三藏西行取经。' : '悟空先说明自己的身份。' : event?.opcode === 'explain-guanyin-origin' ? '猪刚鬣放下钉耙，说明受观音点化的来历。' : event?.opcode === 'guard-cave' ? '猪刚鬣继续守住云栈洞。' : '云栈洞前正在进行两轮对话。';
  const mark = (path: string) => () => setLoaded((current) => new Set(current).add(path)); const src = (path: string) => `${assetUrl(path)}${retry ? `?retry=${retry}` : ''}`;
  return <section className="week-three-yunzhan-scene" role="img" aria-label="云栈洞执行场景" data-scene-ready={String(ready)} data-state-cell={stateCell} data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-muted={String(muted)}><img className="week-three-yunzhan-background" data-state-cell="background" src={src(BACKGROUND)} alt="" onLoad={mark(BACKGROUND)} onError={() => setFailed(true)} /><div className="week-three-yunzhan-sprite-viewport"><img className="week-three-yunzhan-state-sheet" style={{ '--yunzhan-state-cell': stateCell } as CSSProperties} data-state-cell="states" src={src(STATES)} alt="" onLoad={mark(STATES)} onError={() => setFailed(true)} /></div><p>{label}</p>{failed ? <div role="alert">场景图片没有加载成功。<button type="button" onClick={() => { setFailed(false); setLoaded(new Set()); setRetry((value) => value + 1); }}>重试加载场景图片</button></div> : null}</section>;
}
