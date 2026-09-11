import { useEffect, useRef, useState } from 'react';
import type { WeekFiveStoryOrchestrationState, WeekFiveStoryOrchestrationTraceItem } from '../engine/weekFiveStoryOrchestrationContract';
import { assetUrl } from '../utils/assets';

export interface WeekFiveStoryOrchestrationSceneProps {
  state: WeekFiveStoryOrchestrationState | 'ready';
  events: WeekFiveStoryOrchestrationTraceItem[];
  showCanonEpilogue: boolean;
  muted: boolean;
  reducedMotion: boolean;
  onAssetsReady(): void;
  onAssetsError(message: string): void;
}

const stageLabel = (name: string) => ({
  rescue_monks: '僧人解困',
  record_sanqing: '三清观记录',
  record_weather_sequence: '风云雷雨',
  record_later_trials: '后续比试',
  record_meditation: '坐禅',
  record_guess: '隔板猜物',
  record_final_trials: '后三项',
}[name] ?? name);

export function WeekFiveStoryOrchestrationScene({ state, events, showCanonEpilogue, onAssetsReady, onAssetsError }: WeekFiveStoryOrchestrationSceneProps) {
  const [generation, setGeneration] = useState(0);
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);
  const generationRef = useRef(0);
  useEffect(() => { generationRef.current = generation; loaded.current = false; }, [generation]);

  const rootCalls = events.filter((event): event is Extract<WeekFiveStoryOrchestrationTraceItem, { kind: 'function-called' }> => event.kind === 'function-called' && event.caller === 'record_chechi_story');
  const laterCalls = events.filter((event): event is Extract<WeekFiveStoryOrchestrationTraceItem, { kind: 'function-called' }> => event.kind === 'function-called' && event.caller === 'record_later_trials');
  const monkActions = events.filter((event): event is Extract<WeekFiveStoryOrchestrationTraceItem, { kind: 'monk-action' }> => event.kind === 'monk-action');
  const templeActions = events.filter((event): event is Extract<WeekFiveStoryOrchestrationTraceItem, { kind: 'temple-action' }> => event.kind === 'temple-action');
  const weatherActions = events.filter((event): event is Extract<WeekFiveStoryOrchestrationTraceItem, { kind: 'weather-action' }> => event.kind === 'weather-action');
  const trialActions = events.filter((event): event is Extract<WeekFiveStoryOrchestrationTraceItem, { kind: 'trial-action' }> => event.kind === 'trial-action');
  const monkSummary = monkActions.length ? monkActions.map((event) => `${event.scope === 'inside' ? `第${(event.iteration ?? 0) + 1}轮` : '循环外'}${event.action === 'release' ? '解困' : '登记'}${event.target}`).join(' → ') : '尚未执行';

  return <section className="week-five-temple-scene" aria-label="车迟国故事总编排庭院" data-state={state}>
    <img
      key={generation}
      className="week-five-temple-backdrop"
      src={assetUrl('/assets/week-five-trials/contest-courtyard-background.webp') + '?retry=' + generation}
      alt="明亮宫廷庭院中摆着一本记录车迟国故事的彩色大书"
      onLoad={() => { if (generation !== generationRef.current || loaded.current) return; loaded.current = true; setFailed(false); onAssetsReady(); }}
      onError={() => { if (generation !== generationRef.current) return; setFailed(true); onAssetsError('故事总编排庭院未加载，请重试。'); }}
    />
    {failed ? <button type="button" onClick={() => setGeneration((value) => value + 1)}>重试加载故事庭院</button> : null}
    <p className="week-five-function-practice-note">教学回顾：程序用一次完整运行重放公开故事记录，学习失败不会产生任何惩罚。</p>
    <ol className="week-five-story-orchestration-groups" aria-label="四个故事阶段的真实执行记录">
      <li><strong>1 僧人解困</strong><p>{monkSummary}</p></li>
      <li><strong>2 三清观</strong><p>{templeActions.length ? templeActions.map((event) => event.action === 'record_arrival' ? '记录到达' : '记录名字').join(' → ') : '尚未执行'}</p></li>
      <li><strong>3 风云雷雨</strong><p>{weatherActions.length ? weatherActions.map((event) => `${event.value}${event.source === 'parameter' ? '（来自参数）' : '（固定文字）'}`).join(' → ') : '尚未执行'}</p></li>
      <li><strong>4 后续比试</strong><p>{trialActions.length ? trialActions.map((event) => event.value).join(' → ') : '尚未执行'}</p></li>
    </ol>
    <dl className="week-five-function-evidence">
      <div><dt>总编排实际启动</dt><dd>{rootCalls.length ? rootCalls.map((event) => stageLabel(event.name)).join(' → ') : '等待运行'}</dd></div>
      <div><dt>后续小函数顺序</dt><dd>{laterCalls.length ? laterCalls.map((event) => stageLabel(event.name)).join(' → ') : '等待运行'}</dd></div>
    </dl>
    {showCanonEpilogue ? <aside className="week-five-temple-epilogue"><h3>固定原著回顾</h3><p>悟空在车迟国解救僧人，师徒经历三清观、祈雨和多项比试后继续西行。本关只保存公开故事标题与程序运行记录。</p></aside> : null}
  </section>;
}
