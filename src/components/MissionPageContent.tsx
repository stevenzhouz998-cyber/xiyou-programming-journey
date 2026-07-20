import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LockKey } from '@phosphor-icons/react/dist/icons/LockKey';
import { Medal } from '@phosphor-icons/react/dist/icons/Medal';
import { allMissionOutlines, getMissionOutline, isFormalMissionOutline } from '../course/courseOutline';
import type { MissionSpec } from '../course/types';
import { useProgress } from '../context/ProgressContext';
import { validateSequence } from '../engine/validation';
import { isMissionUnlocked } from '../progress/progress';
import { assetUrl } from '../utils/assets';
import { downloadTextFile } from '../utils/download';
import { LazySectionBoundary } from './LazySectionBoundary';
import type { FourSeasRegaliaExperienceProps } from './FourSeasRegaliaExperience';

const ArrowLeft = lazy(() => import('@phosphor-icons/react/dist/icons/ArrowLeft').then((module) => ({ default: module.ArrowLeft })));
const BookOpenText = lazy(() => import('@phosphor-icons/react/dist/icons/BookOpenText').then((module) => ({ default: module.BookOpenText })));
const CheckCircle = lazy(() => import('@phosphor-icons/react/dist/icons/CheckCircle').then((module) => ({ default: module.CheckCircle })));
const DragonPalaceExperience = lazy(() => import('./DragonPalaceExperience').then((module) => ({ default: module.DragonPalaceExperience })));
const MissionTools = lazy(() => import('./MissionTools').then((module) => ({ default: module.MissionTools })));
const RuyiStaffExperience = lazy(() => import('./RuyiStaffExperience').then((module) => ({ default: module.RuyiStaffExperience })));
const loadFourSeasRegaliaExperience = () => import('./FourSeasRegaliaExperience').then((module) => ({ default: module.FourSeasRegaliaExperience }));

export function FourSeasRegaliaRouteBoundary({
  loader = loadFourSeasRegaliaExperience,
  reloadPage,
  ...props
}: FourSeasRegaliaExperienceProps & {
  loader?: () => Promise<{ default: ComponentType<FourSeasRegaliaExperienceProps> }>;
  reloadPage?: () => void;
}) {
  const Experience = useMemo(() => lazy(loader), [loader]);
  return <LazySectionBoundary label="四海披挂任务" reloadPage={reloadPage}><Suspense fallback={<p className="mission-tools-loading" role="status">四海披挂任务加载中，请稍候……</p>}><Experience {...props} /></Suspense></LazySectionBoundary>;
}

function playAudio(path: string, muted: boolean) {
  if (muted || typeof Audio === 'undefined') return;
  const playback = new Audio(path).play();
  if (playback && typeof playback.catch === 'function') void playback.catch(() => undefined);
}

function chapterLabel(chapter: number): string {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (chapter < 10) return digits[chapter];
  if (chapter < 20) return `十${chapter === 10 ? '' : digits[chapter - 10]}`;
  const tens = Math.floor(chapter / 10);
  const ones = chapter % 10;
  return `${digits[tens]}十${ones === 0 ? '' : digits[ones]}`;
}

type HintTier = 'observe' | 'think' | 'partial';

function HintPanel({ hints, onUse, disabled = false, disabledReason = '' }: { hints: Record<HintTier, string>; onUse: (tier: HintTier) => void; disabled?: boolean; disabledReason?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (disabled && panelRef.current?.contains(document.activeElement)) reasonRef.current?.focus();
  }, [disabled]);
  const items: Array<[HintTier, string, string]> = [
    ['observe', '观察提示', hints.observe],
    ['think', '思路提示', hints.think],
    ['partial', '半成品提示', hints.partial],
  ];
  return <div className="hint-panel" ref={panelRef}><p className="eyebrow">卡住了？提示不会阻止通关</p>{disabled ? <p ref={reasonRef} className="hint-lock-reason" role="status" tabIndex={-1}>{disabledReason}</p> : null}{items.map(([tier, label, text]) => <div key={tier}><button type="button" disabled={disabled} aria-disabled={disabled} onClick={() => { if (disabled) return; setOpen(open === tier ? null : tier); if (open !== tier) onUse(tier); }}>{label}</button>{open === tier && <p>{text}</p>}</div>)}</div>;
}

function SuccessDialog({ stars, feedback, hasNext, onMap, onNext, onOpenChange }: { stars: number; feedback: string; hasNext: boolean; onMap: () => void; onNext: () => void; onOpenChange: (open: boolean) => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { onOpenChange(true); (nextRef.current ?? mapRef.current)?.focus(); return () => onOpenChange(false); }, [onOpenChange]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onMap(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])') ?? [])].filter((node) => !node.hasAttribute('disabled'));
    const first = focusable[0]; const last = focusable.at(-1);
    if (!first || !last) return;
    if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
  };
  return createPortal(<div ref={dialogRef} className="success-overlay" role="dialog" aria-modal="true" aria-labelledby="success-heading" onKeyDown={onKeyDown}><div className="success-card"><span className="seal-medal"><Medal size={42} weight="fill" /></span><p className="eyebrow">原著事件复原完成</p><h2 id="success-heading">闯关成功</h2><div className="stars" aria-label={`${stars}颗星`}>{Array.from({ length: 3 }, (_, index) => <span key={index} className={index < stars ? 'lit' : ''}>★</span>)}</div><p>{feedback || '你把原著事实和代码规律都整理清楚了。'}</p><div className="success-actions"><button ref={mapRef} type="button" className="button button-ghost" onClick={onMap}>回成长地图</button>{hasNext && <button ref={nextRef} type="button" className="button button-primary" onClick={onNext}>继续下一关</button>}</div></div></div>, document.body);
}

interface MissionPageProps {
  reducedMotion: boolean;
  onGlobalModalOpenChange: (open: boolean) => void;
  onCompletionPersistenceActiveChange: (active: boolean) => void;
}

function MissionPageForId({ id, mission, reducedMotion, onGlobalModalOpenChange, onCompletionPersistenceActiveChange }: MissionPageProps & { id: string; mission: MissionSpec | undefined }) {
  const navigate = useNavigate();
  const { progress, complete, recordMissionHint, retrySave, saveError, createBackup, reloadExternalProgress } = useProgress();
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [success, setSuccess] = useState(false);
  const [stars, setStars] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [battleInteractionLocked, setBattleInteractionLockedState] = useState(false);
  const [battleHintLockReason, setBattleHintLockReason] = useState<'idle' | 'playback' | 'session-pending' | 'session-recovery'>('idle');
  const setBattleInteractionLocked = (locked: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => {
    setBattleInteractionLockedState(locked);
    setBattleHintLockReason(reason);
  };
  const successRef = useRef(false);
  const mountedRef = useRef(false);
  const requestGenerationRef = useRef(0);
  type CompletionSave = { requestId: number; stars: number; hintsUsed: number; status: 'pending' | 'unsaved' | 'conflict' };
  const completionSaveRef = useRef<CompletionSave | null>(null);
  const completionRetryRef = useRef<HTMLButtonElement>(null);
  const [completionSave, setCompletionSave] = useState<CompletionSave | null>(null);
  useEffect(() => {
    if (mission?.id === 'w1-m3' && completionSave?.status === 'unsaved') completionRetryRef.current?.focus();
  }, [completionSave, mission?.id]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestGenerationRef.current += 1;
      completionSaveRef.current = null;
      onCompletionPersistenceActiveChange(false);
    };
  }, [onCompletionPersistenceActiveChange]);
  if (!mission) return <main className="not-found"><h1>这页经卷没有找到</h1><Link to="/">返回成长地图</Link></main>;
  if (!isMissionUnlocked(progress, mission.id)) return <main className="not-found"><LockKey size={40} /><h1>这一关还没有解锁</h1><Link to="/">先完成前一关</Link></main>;

  const isCurrentRequest = (request: CompletionSave) => mountedRef.current
    && requestGenerationRef.current === request.requestId
    && completionSaveRef.current === request;
  const revealSuccess = (request: CompletionSave, persistedStars: number) => {
    if (!isCurrentRequest(request) || successRef.current) return false;
    completionSaveRef.current = null; setCompletionSave(null); successRef.current = true; setStars(persistedStars); setSuccess(true);
    onCompletionPersistenceActiveChange(false);
    playAudio(assetUrl(mission.isBoss ? '/assets/audio/boss.m4a' : '/assets/audio/success.m4a'), progress.settings.muted);
    return true;
  };
  const pass = async (earnedStars: number, completionHints = hintsUsed): Promise<boolean> => {
    if (successRef.current || completionSaveRef.current !== null) return false;
    const request: CompletionSave = { requestId: ++requestGenerationRef.current, stars: earnedStars, hintsUsed: completionHints, status: 'pending' };
    onCompletionPersistenceActiveChange(true);
    completionSaveRef.current = request; setCompletionSave(request);
    const result = await complete(mission.id, { stars: earnedStars, hintsUsed: completionHints });
    if (!isCurrentRequest(request)) return false;
    if (result.status === 'saved' && result.progress.missions[mission.id]?.status === 'completed') return revealSuccess(request, result.progress.missions[mission.id].stars);
    const failed: CompletionSave = { ...request, status: result.status === 'saved' ? 'unsaved' : result.status };
    completionSaveRef.current = failed; setCompletionSave(failed);
    return false;
  };
  const retryCompletionSave = async () => {
    const failed = completionSaveRef.current;
    if (!failed || failed.status !== 'unsaved') return;
    const request: CompletionSave = { ...failed, requestId: ++requestGenerationRef.current, status: 'pending' };
    completionSaveRef.current = request; setCompletionSave(request);
    const result = await retrySave();
    if (!isCurrentRequest(request)) return;
    if (result.status === 'saved' && result.progress.missions[mission.id]?.status === 'completed') { revealSuccess(request, result.progress.missions[mission.id].stars); return; }
    const next: CompletionSave = { ...request, status: result.status === 'saved' ? 'unsaved' : result.status };
    completionSaveRef.current = next; setCompletionSave(next);
  };
  const downloadCompletionConflictBackup = () => {
    const backup = createBackup();
    downloadTextFile(backup.filename, backup.contents, backup.mimeType);
  };
  const loadExternalCompletionProgress = () => {
    const request = completionSaveRef.current;
    if (!request || request.status !== 'conflict') return;
    const loaded = reloadExternalProgress();
    if (loaded === null) return;
    if (loaded.missions[mission.id]?.status === 'completed') { revealSuccess(request, loaded.missions[mission.id].stars); return; }
    completionSaveRef.current = null;
    setCompletionSave(null);
    onCompletionPersistenceActiveChange(false);
  };
  const validate = (sequence: string[]) => {
    setActiveStep(sequence.length);
    const result = validateSequence(sequence, mission.expectedSequence, hintsUsed);
    setFeedback(result.feedback);
    if (result.passed) pass(result.stars);
  };
  const next = allMissionOutlines[allMissionOutlines.findIndex((item) => item.id === mission.id) + 1];
  const toolProps = mission.mode === 'blockly'
    ? { missionId: mission.id, commands: mission.expectedSequence, onRun: validate }
    : mission.mode === 'python'
      ? { starterCode: mission.starterCode ?? '', expectedOutput: mission.expectedOutput ?? '', onPass: () => pass(hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1) }
      : { commands: mission.expectedSequence, onRun: validate };
  const hintsLocked = (mission.id === 'w1-m2' || mission.id === 'w1-m3') && (battleInteractionLocked || completionSave !== null);
  const hintLockReason = completionSave?.status === 'pending'
    ? '通关结果正在保存，请等保存完成后再使用提示。'
    : completionSave !== null
      ? '通关结果尚未保存，请先完成保存恢复。'
      : battleHintLockReason === 'session-pending'
        ? '运行结果正在保存，提示会在保存完成后恢复。'
        : battleHintLockReason === 'session-recovery'
          ? '运行结果尚未保存，请先完成保存恢复。'
          : '战斗指令正在执行，提示会在本次播放结束后恢复。';

  return <main className="mission-page"><div data-testid="mission-background" inert={success ? true : undefined} aria-hidden={success ? true : undefined}><header className="mission-header"><button className="back-button" type="button" onClick={() => navigate('/')}><ArrowLeft size={21} />成长地图</button><div><span>第{mission.week}周 · 第{mission.order}关{mission.isBoss ? ' · BOSS' : ''}</span><h1>{mission.title}</h1></div><div className="canon-badge"><BookOpenText size={20} /><span>{mission.canon.title}</span></div></header><div className="mission-layout"><aside className="story-column"><span className="eyebrow">原著故事层</span><h2>{mission.subtitle}</h2>{mission.storyBeats.map((item) => <article className="story-beat" key={item.title}><CheckCircle size={20} weight="fill" /><div><strong>{item.title}</strong><p>{item.summary}</p></div></article>)}<a className="canon-link" href={mission.canon.sourceUrl} target="_blank" rel="noreferrer">查看原著第{mission.canon.chapters.map(chapterLabel).join('、')}回</a><HintPanel hints={mission.hints} disabled={hintsLocked} disabledReason={hintLockReason} onUse={(tier) => { if (mission.id === 'w1-m1' || mission.id === 'w1-m2' || mission.id === 'w1-m3') { if (!progress.sessions[mission.id]?.usedHintTiers.includes(tier)) recordMissionHint(mission.id, tier); } else setHintsUsed((count) => count + 1); }} /></aside><section className="play-column"><div className="mission-objective"><span>今日任务</span><h2>{mission.objective}</h2><p>知识法宝：{mission.knowledge}</p></div>{mission.id === 'w1-m1' ? <LazySectionBoundary label="龙宫求兵任务"><Suspense fallback={<p className="mission-tools-loading" role="status">龙宫求兵任务加载中，请稍候……</p>}><DragonPalaceExperience reducedMotion={reducedMotion} muted={progress.settings.muted} onComplete={({ stars: earnedStars, hintsUsed: used }) => pass(earnedStars, used)} /></Suspense></LazySectionBoundary> : mission.id === 'w1-m2' ? <LazySectionBoundary label="定海神针任务"><Suspense fallback={<p className="mission-tools-loading" role="status">定海神针任务加载中，请稍候……</p>}><RuyiStaffExperience reducedMotion={reducedMotion} muted={progress.settings.muted} locked={completionSave !== null} onComplete={({ stars: earnedStars, hintsUsed: used }) => pass(earnedStars, used)} onSessionPersistenceActiveChange={onCompletionPersistenceActiveChange} onInteractionLockChange={setBattleInteractionLocked} /></Suspense></LazySectionBoundary> : mission.id === 'w1-m3' ? <FourSeasRegaliaRouteBoundary reducedMotion={reducedMotion} muted={progress.settings.muted} locked={completionSave !== null} onComplete={({ stars: earnedStars, hintsUsed: used }) => pass(earnedStars, used)} onSessionPersistenceActiveChange={onCompletionPersistenceActiveChange} onInteractionLockChange={setBattleInteractionLocked} /> : <LazySectionBoundary label="兼容任务工具"><Suspense fallback={<p className="mission-tools-loading" role="status">兼容任务工具加载中，请稍候……</p>}><MissionTools missionId={mission.id} mode={mission.mode} sceneProps={{ activeStep, reducedMotion }} toolProps={toolProps} /></Suspense></LazySectionBoundary>}{feedback && !success && <div className="feedback-message">{feedback}</div>}{completionSave ? <div className="completion-save-status" role={completionSave.status === 'pending' ? 'status' : 'alert'} aria-live={completionSave.status === 'pending' ? 'polite' : 'assertive'}><p>{completionSave.status === 'pending' ? '正在保存通关结果…' : completionSave.status === 'conflict' ? '通关待保存：其他标签页已经更新，请选择保留本页备份或载入其他标签页版本。' : '通关待保存：进度尚未安全写入这台电脑。'}</p>{completionSave.status === 'unsaved' && saveError ? <p>{saveError}</p> : null}{completionSave.status === 'unsaved' ? <button ref={completionRetryRef} type="button" className="button button-primary" onClick={retryCompletionSave}>重试保存通关</button> : null}{completionSave.status === 'conflict' ? <><button type="button" onClick={downloadCompletionConflictBackup}>下载本页备份</button><button type="button" onClick={loadExternalCompletionProgress}>载入其他标签页版本</button></> : null}</div> : null}</section></div></div>{success && <SuccessDialog stars={stars} feedback={feedback} hasNext={Boolean(next)} onMap={() => navigate('/')} onNext={() => next && navigate(`/mission/${next.id}`)} onOpenChange={onGlobalModalOpenChange} />}</main>;
}

export function MissionPageContent(props: MissionPageProps) {
  const { id = '' } = useParams();
  const outline = getMissionOutline(id);
  const formal = isFormalMissionOutline(outline);
  const [missionLoad, setMissionLoad] = useState<{ id: string; status: 'loading' | 'ready' | 'error'; mission?: MissionSpec }>({ id: '', status: 'loading' });
  const [missionRetry, setMissionRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setMissionLoad({ id, status: 'loading' });
    const load = formal
      ? import('../course/formalCourse').then(({ getFormalMission }) => getFormalMission(id))
      : import('../course/course').then(({ getMission }) => getMission(id));
    load.then((mission) => {
      if (active) setMissionLoad({ id, status: 'ready', mission });
    }).catch(() => {
      if (active) setMissionLoad({ id, status: 'error' });
    });
    return () => { active = false; };
  }, [formal, id, missionRetry]);
  if (missionLoad.id !== id || missionLoad.status === 'loading') {
    return <main className="mission-page"><p className="mission-tools-loading" role="status">关卡故事加载中，请稍候……</p></main>;
  }
  if (missionLoad.status === 'error') {
    return <main className="mission-page"><div className="mission-tools-error" role="alert"><p>关卡故事暂时没有加载成功。</p><button type="button" onClick={() => setMissionRetry((value) => value + 1)}>重试加载</button></div></main>;
  }
  return <MissionPageForId key={id} id={id} mission={missionLoad.mission} {...props} />;
}
