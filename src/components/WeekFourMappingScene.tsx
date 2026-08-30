import { useState } from 'react';
import type { WeekFourMappingCard, WeekFourMappingTraceItem } from '../blockly/weekFourMappingContract';
import { WEEK_FOUR_MAPPING_CARDS } from '../blockly/weekFourMappingContract';
import { assetUrl } from '../utils/assets';

const branchActionLabel = (action: WeekFourMappingTraceItem['branchAction'] | undefined) => {
  if (action === 'continue-verification') return '继续核验';
  if (action === 'polite-pass') return '礼貌放行';
  return '尚未运行';
};

export interface WeekFourMappingSceneProps {
  state: 'waiting' | 'mismatch' | 'matched';
  activeCardId: WeekFourMappingCard['id'] | null;
  events: WeekFourMappingTraceItem[];
  muted: boolean;
  reducedMotion: boolean;
  onAssetsReady(): void;
  onAssetsError(message: string): void;
}

export function WeekFourMappingScene({ state, activeCardId, events, muted, reducedMotion, onAssetsReady, onAssetsError }: WeekFourMappingSceneProps) {
  const label = state === 'waiting' ? '等待对照' : state === 'mismatch' ? '发现差异' : '映射一致';
  const [generation, setGeneration] = useState(0);
  const [loaded, setLoaded] = useState<Set<'background' | 'states'>>(new Set());
  const [failed, setFailed] = useState(false);
  const load = (asset: 'background' | 'states') => setLoaded((previous) => { const next = new Set(previous); next.add(asset); if (!failed && next.size === 2) onAssetsReady(); return next; });
  const fail = (message: string) => { setFailed(true); onAssetsError(message); };
  const retry = () => { setGeneration((value) => value + 1); setLoaded(new Set()); setFailed(false); };
  return <section className={`week-four-mapping-scene state-${state}`} aria-label="白虎岭对照舞台" data-muted={muted} data-reduced-motion={reducedMotion}>
    <img key={`background-${generation}`} src={`${assetUrl('/assets/week-four-mapping/white-tiger-ridge-background.webp')}?retry=${generation}`} alt="白虎岭入口背景" onLoad={() => load('background')} onError={() => fail('白虎岭场景资源加载失败。')} />
    <img key={`states-${generation}`} data-state={state} src={`${assetUrl('/assets/week-four-mapping/mapping-states.webp')}?retry=${generation}`} alt="积木与 Python 映射状态" onLoad={() => load('states')} onError={() => fail('映射状态资源加载失败。')} />
    <p role="status">{label}</p>
    {failed ? <button type="button" className="button button-ghost" onClick={retry}>重试场景资源</button> : null}
    <section aria-label="公开证据卡">{WEEK_FOUR_MAPPING_CARDS.map((card) => <article key={card.id} aria-current={activeCardId === card.id ? 'step' : undefined}><h3>{card.kind === 'canon-intro' ? '原著引子' : '逻辑练习，非原著事件'}</h3><p>{card.appearance}</p><p>{branchActionLabel(events.find((event) => event.cardId === card.id)?.branchAction)}</p></article>)}</section>
  </section>;
}
