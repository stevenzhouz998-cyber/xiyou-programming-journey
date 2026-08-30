import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { BajieJoiningInstruction } from '../blockly/weekThreeBajieJoiningContract';
import { assetUrl } from '../utils/assets';

export interface WeekThreeBajieJoiningSceneProps {
  events: BajieJoiningInstruction[];
  replayToken: number;
  reducedMotion: boolean;
  muted: boolean;
  onResourceStateChange: (ready: boolean) => void;
  onPlaybackComplete: () => void;
}

const BACKGROUND = 'assets/week-three-bajie-joining/bajie-joining-background.webp';
const STATES = 'assets/week-three-bajie-joining/bajie-joining-states.webp';
const STEPS = [
  ['guanyin-arrangement', '猪悟能说明观音此前已劝善授戒，法名悟能。'],
  ['bajie-name', '唐僧为他另名八戒。'],
  ['westward-departure', '八戒挑担，师徒三众向西而行。'],
] as const;

export function WeekThreeBajieJoiningScene({ events, replayToken, reducedMotion, muted, onResourceStateChange, onPlaybackComplete }: WeekThreeBajieJoiningSceneProps) {
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [step, setStep] = useState(0);
  const [activeToken, setActiveToken] = useState<number | null>(null);
  const completedToken = useRef<number | null>(null);
  const resourceGeneration = useRef(0);
  const completeRef = useRef(onPlaybackComplete);
  completeRef.current = onPlaybackComplete;
  const ready = loaded.size === 2 && !failed;
  const hasJoinEvent = events.some((event) => event.opcode === 'formally-join-team' && event.actualBranch === 'then');

  useEffect(() => { onResourceStateChange(ready); }, [ready, onResourceStateChange]);
  useEffect(() => {
    if (!ready || replayToken <= 0) return undefined;
    if (activeToken !== replayToken) {
      setActiveToken(replayToken);
      setStep(0);
      return undefined;
    }
    if (step < STEPS.length - 1) {
      const id = window.setTimeout(() => setStep((current) => current + 1), reducedMotion ? 0 : 300);
      return () => window.clearTimeout(id);
    }
    if (completedToken.current !== replayToken) {
      completedToken.current = replayToken;
      completeRef.current();
    }
    return undefined;
  }, [activeToken, ready, replayToken, reducedMotion, step]);

  const markLoaded = (path: string, generation: number) => () => {
    if (generation !== resourceGeneration.current) return;
    setLoaded((current) => new Set(current).add(path));
  };
  const markFailed = (generation: number) => () => {
    if (generation === resourceGeneration.current) setFailed(true);
  };
  const retryResources = () => {
    const next = retry + 1;
    resourceGeneration.current = next;
    setLoaded(new Set());
    setFailed(false);
    setRetry(next);
  };
  const source = (path: string) => `${assetUrl(path)}${retry === 0 ? '' : `?retry=${retry}`}`;
  const [storyStep, narrative] = hasJoinEvent ? STEPS[step] : ['checking', '正在根据积木运行结果核对入队条件。'];
  const style = { '--bajie-joining-state-cell': hasJoinEvent ? String(step) : '0' } as CSSProperties;

  return <section className="week-three-bajie-joining-scene" role="region" aria-label="八戒归队执行场景" data-scene-ready={String(ready)} data-story-step={storyStep} data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-muted={String(muted)}>
    <div className="week-three-bajie-joining-scene-visual" role="img" aria-label="八戒归队故事画面" data-scene-ready={String(ready)} data-story-step={storyStep} data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-muted={String(muted)}>
      <img key={`background-${retry}`} className="week-three-bajie-joining-background" src={source(BACKGROUND)} alt="" aria-hidden="true" onLoad={markLoaded(BACKGROUND, retry)} onError={markFailed(retry)} />
      <div className="week-three-bajie-joining-sprite-viewport">
        <img key={`states-${retry}`} className="week-three-bajie-joining-state-sheet" style={style} src={source(STATES)} alt="" aria-hidden="true" onLoad={markLoaded(STATES, retry)} onError={markFailed(retry)} />
      </div>
    </div>
    <p role="status">{narrative}</p>
    {failed ? <div role="alert">场景图片没有加载成功。<button type="button" onClick={retryResources}>重试加载场景图片</button></div> : null}
  </section>;
}
