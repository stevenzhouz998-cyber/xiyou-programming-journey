import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { publicWeekThreeBossScenario, type WeekThreeBossInstruction } from '../blockly/weekThreeBossContract';
import { assetUrl } from '../utils/assets';

export interface WeekThreeBossSceneProps {
  events: WeekThreeBossInstruction[];
  replayToken: number;
  reducedMotion: boolean;
  muted: boolean;
  onResourceStateChange: (ready: boolean) => void;
  onPlaybackComplete: () => void;
}

const background = 'assets/week-three-boss/week-three-boss-background.webp';
const states = 'assets/week-three-boss/week-three-boss-states.webp';
const stageLabel = (event: WeekThreeBossInstruction | null) => event?.stateAfter === 'week-three-recap-complete' ? '第三周回顾完成' : event?.stateAfter ?? '等待运行';
const conditionLabels: Record<string, string> = { 'mentions-gaolao': '提到高老庄', 'explicit-demon-help': '明确请求降妖帮助', 'appearance-matches-cuilan': '外形与高翠兰相同', 'identity-is-cuilan': '真实身份是高翠兰', 'pilgrimage-explicit': '明确说明唐僧正在西行取经', 'guanyin-precepts': '已蒙观音劝善受戒', 'willing-westward': '明确愿随唐僧西去' };
const actionLabels: Record<string, string> = { 'accept-demon-help': '应承并进入庄中调查', 'continue-directions': '继续问路', 'keep-disguise': '维持伪装并继续询问', 'reveal-wukong-and-chase': '显出悟空本相并追向云栈洞', 'guard-cave': '守洞', 'explain-guanyin-origin': '放下钉耙并说明受观音点化', 'formally-join-team': '正式归队', 'continue-verification': '继续核对' };
const stateFrame: Record<WeekThreeBossInstruction['stateAfter'], { frame: 0 | 1 | 2 | 3; x: 0 | 1; y: 0 | 1 }> = { 'manor-request': { frame: 0, x: 0, y: 0 }, 'cuilan-disguise': { frame: 1, x: 1, y: 0 }, 'yunzhan-dialogue': { frame: 2, x: 0, y: 1 }, 'bajie-joining': { frame: 3, x: 1, y: 1 }, 'week-three-recap-complete': { frame: 3, x: 1, y: 1 } };

export function WeekThreeBossScene({ events, replayToken, reducedMotion, muted, onResourceStateChange, onPlaybackComplete }: WeekThreeBossSceneProps) {
  const [generation, setGeneration] = useState(0); const [ready, setReady] = useState<[boolean, boolean]>([false, false]); const [error, setError] = useState(false); const [eventIndex, setEventIndex] = useState(0); const completed = useRef<number | null>(null); const backgroundRef = useRef<HTMLImageElement>(null); const statesRef = useRef<HTMLImageElement>(null);
  useEffect(() => { setReady([false, false]); setError(false); }, [generation]);
  useEffect(() => { setEventIndex(0); setError(false); completed.current = null; }, [generation, replayToken]);
  const resourcesReady = ready[0] && ready[1] && !error;
  useEffect(() => { onResourceStateChange(resourcesReady); }, [resourcesReady, onResourceStateChange]);
  useEffect(() => {
    if (!resourcesReady || completed.current === replayToken) return;
    const token = replayToken; const stepDelay = reducedMotion ? 0 : 180;
    const timer = window.setTimeout(() => {
      if (completed.current === token) return;
      setEventIndex((current) => {
        if (current + 1 < events.length) return current + 1;
        completed.current = token; onPlaybackComplete(); return current;
      });
    }, Math.max(1, stepDelay));
    return () => window.clearTimeout(timer);
  }, [resourcesReady, replayToken, reducedMotion, events.length, eventIndex, onPlaybackComplete]);
  const source = (path: string) => `${assetUrl(path)}${generation ? `?retry=${generation}` : ''}`;
  const load = (index: 0 | 1) => setReady((previous) => index === 0 ? [true, previous[1]] : [previous[0], true]);
  const failed = () => { setError(true); onResourceStateChange(false); };
  const retryResources = () => { setReady([false, false]); setError(false); setGeneration((value) => value + 1); };
  const currentEvent = events[Math.min(eventIndex, Math.max(events.length - 1, 0))] ?? null;
  const scenario = currentEvent ? publicWeekThreeBossScenario(currentEvent.scenarioId) : null;
  const frame = currentEvent ? stateFrame[currentEvent.stateAfter] : null;
  useEffect(() => {
    if (backgroundRef.current?.complete && backgroundRef.current.naturalWidth > 0) load(0);
    if (statesRef.current?.complete && statesRef.current.naturalWidth > 0) load(1);
  }, [generation, Boolean(frame)]);
  return <section className="week-three-boss-scene" role="region" aria-label="高老庄总试炼故事舞台" data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-muted={String(muted)} data-scene-ready={String(resourcesReady)}>
    <div role="img" aria-label="高老庄总试炼故事画面"><img ref={backgroundRef} key={`background-${generation}`} src={source(background)} alt="" aria-hidden="true" onLoad={() => load(0)} onError={failed} />{frame ? <span className="week-three-boss-states" data-state={currentEvent!.stateAfter} data-frame={frame.frame} style={{ '--frame-x': frame.x, '--frame-y': frame.y } as CSSProperties}><img ref={statesRef} key={`states-${generation}`} src={source(states)} alt="" aria-hidden="true" onLoad={() => load(1)} onError={failed} /></span> : null}</div>
    <p role="status">当前公开故事阶段：{stageLabel(currentEvent)}</p>
    {scenario && currentEvent ? <article aria-label="当前公开证据卡"><h3>{scenario.title}</h3>{scenario.kind === 'practice' ? <p>逻辑练习，不改变原著故事</p> : <p>原著公开情境</p>}<p>{scenario.publicFacts.join('；')}</p><p>当前检查：{conditionLabels[currentEvent.conditionKind] ?? '公开条件'}，{currentEvent.conditionTruth ? '真' : '假'}。</p>{(currentEvent.atomicConditions ?? []).length > 1 ? <p>原子判断：{currentEvent.atomicConditions.map((item) => `${conditionLabels[item.kind] ?? item.kind}${item.value ? '真' : '假'}`).join('、')}；当前运算符：{currentEvent.operator?.toUpperCase()}；组合结果：{currentEvent.combinedCondition ? '真' : '假'}。</p> : null}<p>实际分支：{currentEvent.actualBranch === 'then' ? '满足条件' : '继续核对'}；实际动作：{actionLabels[currentEvent.action] ?? '未识别动作'}。</p><p>故事状态：{currentEvent.stateBefore} → {currentEvent.stateAfter}</p></article> : null}
    {error ? <p role="alert">场景图片没有加载成功。<button type="button" onClick={retryResources}>重试加载场景图片</button></p> : null}
  </section>;
}
