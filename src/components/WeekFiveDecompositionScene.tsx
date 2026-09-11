import { useEffect, useRef, useState } from 'react';
import type { WeekFiveDecompositionState, WeekFiveDecompositionTraceItem, WeekFiveSmallFunction } from '../engine/weekFiveDecompositionContract';
import { assetUrl } from '../utils/assets';

export interface WeekFiveDecompositionSceneProps {
  state: WeekFiveDecompositionState | 'ready';
  events: WeekFiveDecompositionTraceItem[];
  showCanonEpilogue: boolean;
  muted: boolean;
  reducedMotion: boolean;
  onAssetsReady(): void;
  onAssetsError(message: string): void;
}

const groupLabel = (name: WeekFiveSmallFunction) => name === 'record_meditation' ? '坐禅记录组' : name === 'record_guess' ? '猜物记录组' : '后三项记录组';

export function WeekFiveDecompositionScene({ state, events, showCanonEpilogue, onAssetsReady, onAssetsError }: WeekFiveDecompositionSceneProps) {
  const [generation, setGeneration] = useState(0);
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);
  const generationRef = useRef(0);
  useEffect(() => { generationRef.current = generation; loaded.current = false; }, [generation]);
  const declarations = events.filter((event): event is Extract<WeekFiveDecompositionTraceItem, { kind: 'action-declared' }> => event.kind === 'action-declared');
  const calls = events.filter((event): event is Extract<WeekFiveDecompositionTraceItem, { kind: 'function-called' }> => event.kind === 'function-called' && event.caller === 'record_five_trials' && event.name !== 'record_five_trials');
  const actions = events.filter((event): event is Extract<WeekFiveDecompositionTraceItem, { kind: 'action' }> => event.kind === 'action');
  const group = (name: WeekFiveSmallFunction) => declarations.filter((event) => event.owner === name).map((event) => event.value).join('、') || '没有记录';
  return <section className="week-five-temple-scene" aria-label="后续比试故事记录庭院" data-state={state}>
    <img
      key={generation}
      className="week-five-temple-backdrop"
      src={assetUrl('/assets/week-five-trials/contest-courtyard-background.webp') + '?retry=' + generation}
      alt="明亮宫廷庭院中摆着一本空白记录册和三本彩色小册"
      onLoad={() => { if (generation !== generationRef.current || loaded.current) return; loaded.current = true; setFailed(false); onAssetsReady(); }}
      onError={() => { if (generation !== generationRef.current) return; setFailed(true); onAssetsError('故事记录庭院未加载，请重试。'); }}
    />
    {failed ? <button type="button" onClick={() => setGeneration((value) => value + 1)}>重试加载故事记录庭院</button> : null}
    <p className="week-five-function-practice-note">教学回顾：程序只把公开故事标题分进记录册，不表演伤害，也不会给学习失败任何惩罚。</p>
    <dl className="week-five-function-evidence">
      <div><dt>坐禅记录组</dt><dd>{group('record_meditation')}</dd></div>
      <div><dt>猜物记录组</dt><dd>{group('record_guess')}</dd></div>
      <div><dt>后三项记录组</dt><dd>{group('record_final_trials')}</dd></div>
      <div><dt>总记录启动顺序</dt><dd>{calls.length ? calls.map((event) => groupLabel(event.name as WeekFiveSmallFunction)).join(' → ') : '等待运行'}</dd></div>
      <div><dt>实际留下的故事记录</dt><dd>{actions.length ? actions.map((event) => event.value).join(' → ') : '尚未执行'}</dd></div>
    </dl>
    {showCanonEpilogue ? <aside className="week-five-temple-epilogue"><h3>固定原著回顾</h3><p>坐禅由唐僧参与、悟空相助；隔板猜物包含多轮。三位国师在后续比试中先后败亡，师徒得以继续西行。后三项在本关只作为故事标题保存在记录册中。</p></aside> : null}
  </section>;
}
