import { useRef, useState } from 'react';
import {
  type WeekFourBranchCard,
  type WeekFourBranchState,
  type WeekFourBranchTraceItem,
} from '../engine/weekFourBranchContract';
import { assetUrl } from '../utils/assets';

export type WeekFourBranchSceneDisplayState = 'ready' | 'conflict' | 'proven' | WeekFourBranchState;

export interface WeekFourBranchSceneProps {
  state: WeekFourBranchSceneDisplayState;
  cards: readonly WeekFourBranchCard[];
  events: readonly WeekFourBranchTraceItem[];
  muted: boolean;
  reducedMotion: boolean;
  showCanonEpilogue: boolean;
  onAssetsReady(): void;
  onAssetsError(message: string): void;
}

type AssetId = 'background' | 'visitor' | 'states';
type Cell = 'ready' | 'conflict' | 'proven';
type SemanticState = 'ready' | 'conflict' | 'missing' | 'invalid' | 'proven';

const semanticStateFor = (state: WeekFourBranchSceneDisplayState): SemanticState => {
  if (state === 'proven' || state === 'branch-proven') return 'proven';
  if (state === 'conflict' || state === 'branch-conflict') return 'conflict';
  if (state === 'branch-missing') return 'missing';
  if (state === 'python-structure-invalid') return 'invalid';
  return 'ready';
};

const cellFor = (state: SemanticState): Cell => state === 'proven' ? 'proven' : state === 'ready' ? 'ready' : 'conflict';

const stateLabel: Record<SemanticState, string> = {
  ready: '等待分支归位',
  conflict: '两条路线同时发生',
  missing: '没有路线，没有执行动作',
  invalid: 'Python 结构或缩进未通过',
  proven: '每张卡只走一条路线',
};

const spriteLabel = (state: SemanticState) => state === 'missing'
  ? '分支路线状态：没有路线'
  : state === 'invalid'
    ? '分支路线状态：Python 结构未通过'
    : '分支路线状态';

const resultLabel = (event: Extract<WeekFourBranchTraceItem, { kind: 'card-result' }>) => {
  if (event.result === 'branch-conflict') return '观察与礼貌帮助同时发生';
  if (event.result === 'branch-missing') return '这张卡没有走到应有路线';
  return event.actions[0] === 'keep-observing' ? '只走观察路线' : '只走礼貌帮助路线';
};

export function WeekFourBranchScene({
  state,
  cards,
  events,
  muted,
  reducedMotion,
  showCanonEpilogue,
  onAssetsReady,
  onAssetsError,
}: WeekFourBranchSceneProps) {
  const [generation, setGeneration] = useState(0);
  const [failed, setFailed] = useState(false);
  const generationRef = useRef(0);
  const loadedRef = useRef(new Set<AssetId>());
  const failedGenerationRef = useRef<number | null>(null);
  const readyGenerationRef = useRef<number | null>(null);
  const callbacksRef = useRef({ onAssetsReady, onAssetsError });
  callbacksRef.current = { onAssetsReady, onAssetsError };

  const markLoaded = (asset: AssetId, eventGeneration: number) => {
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
    const next = generationRef.current + 1;
    generationRef.current = next;
    loadedRef.current = new Set();
    failedGenerationRef.current = null;
    readyGenerationRef.current = null;
    setGeneration(next);
    setFailed(false);
  };

  const semanticState = semanticStateFor(state);
  const cell = cellFor(semanticState);
  const position = cell === 'ready' ? '0% 0%' : cell === 'conflict' ? '50% 0%' : '100% 0%';
  const backgroundUrl = `${assetUrl('/assets/week-four-mapping/white-tiger-ridge-background.webp')}?retry=${generation}`;
  const visitorUrl = `${assetUrl('/assets/week-four-branches/old-woman-visitor.webp')}?retry=${generation}`;
  const statesUrl = `${assetUrl('/assets/week-four-branches/branch-route-states.webp')}?retry=${generation}`;
  const results = events.filter((event): event is Extract<WeekFourBranchTraceItem, { kind: 'card-result' }> => event.kind === 'card-result');

  return (
    <section
      className={`week-four-branch-scene state-${semanticState}`}
      aria-label="白虎岭分支核验舞台"
      data-muted={muted}
      data-reduced-motion={reducedMotion}
    >
      <img key={`background-${generation}`} src={backgroundUrl} alt="白虎岭背景" onLoad={() => markLoaded('background', generation)} onError={() => markFailed('白虎岭背景资源加载失败。', generation)} />
      <img key={`visitor-${generation}`} src={visitorUrl} alt="老妇来客" onLoad={() => markLoaded('visitor', generation)} onError={() => markFailed('老妇来客资源加载失败。', generation)} />
      <div
        role="img"
        aria-label={spriteLabel(semanticState)}
        data-state-cell={cell}
        data-state-kind={semanticState}
        style={{
          backgroundImage: `url("${statesUrl}")`,
          backgroundPosition: position,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '300% 100%',
          overflow: 'hidden',
        }}
      >
        <img
          key={`states-${generation}`}
          data-testid="branch-route-states-loader"
          src={statesUrl}
          alt=""
          hidden
          onLoad={() => markLoaded('states', generation)}
          onError={() => markFailed('分支路线状态资源加载失败。', generation)}
        />
      </div>
      <p role="status">{stateLabel[semanticState]}</p>
      <p>{muted ? '场景声音已静音' : '场景声音开启'}</p>
      <p>{reducedMotion ? '路线切换动效已减少' : '路线切换动效开启'}</p>
      {failed ? <button type="button" onClick={retry}>重试场景资源</button> : null}
      <section aria-label="公开分支核验卡">
        {cards.map((card) => {
          const result = results.find((event) => event.cardId === card.id);
          return (
            <article key={card.id}>
              <h3>{card.canon ? '原著核验卡' : '分支练习卡'}</h3>
              <p>外形：{card.appearance}</p>
              <p>{card.canon ? '公开身份核验' : '公开练习身份'}：{card.identity}</p>
              {!card.canon ? <p>练习卡，非原著情节</p> : null}
              {result ? <p>{resultLabel(result)}</p> : null}
            </article>
          );
        })}
      </section>
      {showCanonEpilogue && semanticState === 'proven' ? <p role="note">孙悟空安全地再次核验：老妇外形下的公开身份事实仍未改变。
      </p> : null}
    </section>
  );
}
