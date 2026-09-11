import { useEffect, useRef, useState } from 'react';
import type { WeekFiveWeatherState, WeekFiveWeatherTraceItem } from '../engine/weekFiveWeatherContract';
import { assetUrl } from '../utils/assets';

export interface WeekFiveWeatherSceneProps {
  state: WeekFiveWeatherState | 'ready';
  events: WeekFiveWeatherTraceItem[];
  showCanonEpilogue: boolean;
  muted: boolean;
  reducedMotion: boolean;
  onAssetsReady(): void;
  onAssetsError(message: string): void;
}

export function WeekFiveWeatherScene({
  state,
  events,
  showCanonEpilogue,
  onAssetsReady,
  onAssetsError,
}: WeekFiveWeatherSceneProps) {
  const [generation, setGeneration] = useState(0);
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    generationRef.current = generation;
    loaded.current = false;
  }, [generation]);

  const calls = events.filter(
    (event): event is Extract<WeekFiveWeatherTraceItem, { kind: 'function-called' }> => event.kind === 'function-called',
  );
  const bindings = events.filter(
    (event): event is Extract<WeekFiveWeatherTraceItem, { kind: 'parameter-bound' }> => event.kind === 'parameter-bound',
  );
  const actions = events.filter(
    (event): event is Extract<WeekFiveWeatherTraceItem, { kind: 'action' }> => event.kind === 'action',
  );

  return (
    <section className="week-five-temple-scene" aria-label="祈雨参数记录现场" data-state={state}>
      <img
        key={generation}
        className="week-five-temple-backdrop"
        src={`${assetUrl('/assets/week-five-weather/rain-altar-background.webp')}?retry=${generation}`}
        alt="晴朗蓝天下铺着红毯、立有香炉的车迟国祈雨坛庭院"
        onLoad={() => {
          if (generation !== generationRef.current || loaded.current) return;
          loaded.current = true;
          setFailed(false);
          onAssetsReady();
        }}
        onError={() => {
          if (generation !== generationRef.current) return;
          setFailed(true);
          onAssetsError('祈雨坛场景未加载，请重试。');
        }}
      />
      {failed ? (
        <button type="button" onClick={() => setGeneration((value) => value + 1)}>
          重试加载祈雨坛场景
        </button>
      ) : null}
      <p className="week-five-function-practice-note">
        教学记录抽象：程序只记录故事片段中的号令，不表示真实控制天气，也不要求孩子编写斗法。
      </p>
      <dl className="week-five-function-evidence">
        <div>
          <dt>本次传入</dt>
          <dd>{calls.length ? calls.map((item) => item.argument).join(' → ') : '等待运行'}</dd>
        </div>
        <div>
          <dt>参数 order</dt>
          <dd>{bindings.length ? bindings.map((item) => item.value).join(' → ') : '尚未绑定'}</dd>
        </div>
        <div>
          <dt>实际记录</dt>
          <dd>{actions.length ? actions.map((item) => item.value).join(' → ') : '尚未执行'}</dd>
        </div>
      </dl>
      {showCanonEpilogue ? (
        <aside className="week-five-temple-epilogue">
          <h3>固定原著尾声</h3>
          <p>风、云、雷、雨四步之后，故事还有收雨放晴；这里展示的是第四十五回的教学片段，不由孩子代码生成。</p>
        </aside>
      ) : null}
    </section>
  );
}
