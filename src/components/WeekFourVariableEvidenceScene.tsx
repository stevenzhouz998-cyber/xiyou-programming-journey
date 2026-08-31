import { useRef, useState } from 'react';
import type { WeekFourVariableTraceItem } from '../engine/weekFourVariableContract';
import { assetUrl } from '../utils/assets';

export interface WeekFourVariableEvidenceSceneProps {
  state: 'ready' | 'unsealed' | 'sealed'; events: WeekFourVariableTraceItem[]; muted: boolean; reducedMotion: boolean;
  showCanonEpilogue: boolean; onAssetsReady(): void; onAssetsError(message: string): void;
}
const stateLabel = { ready: '等待取证', unsealed: '证据尚未封存', sealed: '两只证据匣已封存' } as const;
const stateCellLabel = { ready: '等待记录', unsealed: '外形匣被覆盖，身份匣为空', sealed: '两匣分别封存' } as const;
const eventLabel = (event: WeekFourVariableTraceItem | undefined) => !event ? '尚未写入' : event.kind === 'seal' ? event.executed ? '已封存' : '封存未完成' : event.overwrote ? `火眼核验：${event.value}覆盖了原记录` : `记录：${event.value}`;

export function WeekFourVariableEvidenceScene({ state, events, muted, reducedMotion, showCanonEpilogue, onAssetsReady, onAssetsError }: WeekFourVariableEvidenceSceneProps) {
  const [generation, setGeneration] = useState(0);
  const [failed, setFailed] = useState(false);
  const generationRef = useRef(0);
  const loadedRef = useRef(new Set<'background' | 'woman' | 'states'>());
  const failedGenerationRef = useRef<number | null>(null);
  const readyGenerationRef = useRef<number | null>(null);
  const callbacksRef = useRef({ onAssetsReady, onAssetsError });
  callbacksRef.current = { onAssetsReady, onAssetsError };
  const markLoaded = (asset: 'background' | 'woman' | 'states', eventGeneration: number) => {
    if (eventGeneration !== generationRef.current || failedGenerationRef.current === eventGeneration || loadedRef.current.has(asset)) return;
    loadedRef.current.add(asset);
    if (loadedRef.current.size === 3 && readyGenerationRef.current !== eventGeneration) {
      readyGenerationRef.current = eventGeneration;
      callbacksRef.current.onAssetsReady();
    }
  };
  const markFailed = (message: string, eventGeneration: number) => {
    if (eventGeneration !== generationRef.current || failedGenerationRef.current === eventGeneration) return;
    failedGenerationRef.current = eventGeneration;
    callbacksRef.current.onAssetsError(message);
    setFailed(true);
  };
  const retry = () => {
    const nextGeneration = generationRef.current + 1;
    generationRef.current = nextGeneration;
    loadedRef.current = new Set();
    failedGenerationRef.current = null;
    readyGenerationRef.current = null;
    setGeneration(nextGeneration);
    setFailed(false);
  };
  const appearanceAssignments = events.filter((event): event is Extract<WeekFourVariableTraceItem, { kind: 'assign' }> => event.kind === 'assign' && event.target === 'appearance');
  const appearance = state === 'unsealed' ? appearanceAssignments.find((event) => event.overwrote) : state === 'sealed' ? appearanceAssignments.find((event) => !event.overwrote) : undefined;
  const identity = state === 'sealed' ? events.find((event) => event.kind === 'assign' && event.target === 'identity') : undefined;
  const seal = state === 'ready' ? undefined : events.find((event) => event.kind === 'seal');
  const stateSpriteTransform = state === 'ready' ? 'translateX(0%)' : state === 'unsealed' ? 'translateX(-33.333333%)' : 'translateX(-66.666667%)';
  return <section className={`week-four-variable-evidence-scene state-${state}`} aria-label="白虎岭变量取证舞台" data-muted={muted} data-reduced-motion={reducedMotion}>
    <img key={`background-${generation}`} src={`${assetUrl('/assets/week-four-mapping/white-tiger-ridge-background.webp')}?retry=${generation}`} alt="白虎岭背景" onLoad={() => markLoaded('background', generation)} onError={() => markFailed('白虎岭背景资源加载失败。', generation)} />
    <div className="week-four-variable-scene-props">
      <img key={`woman-${generation}`} src={`${assetUrl('/assets/week-four-variables/woman-with-offering.webp')}?retry=${generation}`} alt="送斋来客" onLoad={() => markLoaded('woman', generation)} onError={() => markFailed('送斋来客资源加载失败。', generation)} />
      <div className="week-four-variable-state-sprite" data-testid="variable-state-sprite" data-state-cell={state} style={{ overflow: 'hidden' }}>
        <img key={`states-${generation}`} className="week-four-variable-state-sprite-image" style={{ transform: stateSpriteTransform }} src={`${assetUrl('/assets/week-four-variables/variable-record-states.webp')}?retry=${generation}`} alt="变量取证状态" onLoad={() => markLoaded('states', generation)} onError={() => markFailed('变量取证状态资源加载失败。', generation)} />
      </div>
    </div>
    <p role="status">{stateLabel[state]}</p>
    {failed ? <button type="button" className="button button-ghost" onClick={retry}>重试场景资源</button> : null}
    <section aria-label="公开证据卡"><article><h3>普通观察</h3><p>送斋女子</p>{state !== 'ready' ? <p>{eventLabel(appearance)}</p> : null}</article><article><h3>火眼核验</h3><p>白骨精</p>{state === 'unsealed' ? <p>身份匣尚无记录</p> : null}{state === 'sealed' ? <p>{eventLabel(identity)}</p> : null}</article></section>
    <section aria-label="证据匣状态"><p data-testid={`variable-state-${state}`} data-state-cell={state}>{stateCellLabel[state]}</p>{seal ? <p>{eventLabel(seal)}</p> : null}</section>
    {showCanonEpilogue && state === 'sealed' ? <p role="note">悟空识破第一次变化，变化者借法脱身，山岭疑云仍未散去</p> : null}
  </section>;
}
