import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HashRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpenText, CheckCircle, Lightning, LockKey, MapTrifold, Medal, SpeakerHigh, SpeakerSlash, UsersThree } from '@phosphor-icons/react';
import { course, allMissions, getMission } from './course/course';
import { ProgressProvider, useProgress } from './context/ProgressContext';
import { getWeeklyReport, isMissionUnlocked } from './progress/progress';
import { validateSequence } from './engine/validation';
import { MissionTools } from './components/MissionTools';
import { PrivacyPanel } from './components/PrivacyPanel';
import { RecoveryNotice } from './components/RecoveryNotice';
import { ParentDataTools } from './components/ParentDataTools';
import { assetUrl } from './utils/assets';
import { downloadTextFile } from './utils/download';
import './styles.css';

const GlobalModalIsolationContext = createContext<(open: boolean) => void>(() => undefined);

function RouteFocus({ blocked }: { blocked: boolean }) {
  const location = useLocation();
  const initialRef = useRef(true);
  useEffect(() => {
    if (blocked) return undefined;
    if (initialRef.current) { initialRef.current = false; return undefined; }
    const frame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>('main h1, main[tabindex="-1"]');
      if (target && !target.closest('[inert]')) { target.tabIndex = -1; target.focus(); }
    });
    return () => cancelAnimationFrame(frame);
  }, [blocked, location.pathname]);
  return null;
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

function Header({ reducedMotion }: { reducedMotion: boolean }) {
  const navigate = useNavigate();
  const { progress, updateSettings } = useProgress();
  const totalStars = Object.values(progress.missions).reduce((sum, mission) => sum + mission.stars, 0);
  return <header className="topbar"><button className="brand" type="button" onClick={() => navigate('/')}><span className="brand-seal">码</span><span><strong>西游编程记</strong><small>原著闯关 · 编程修行</small></span></button><div className="learner-summary"><img src={assetUrl("/assets/young-hero.png")} alt="小行者头像" /><span><strong>{progress.learnerName}</strong><small>{Object.keys(progress.missions).length}/30 关 · {totalStars} 星</small></span></div><nav><button type="button" onClick={() => navigate('/')}><MapTrifold size={20} />成长地图</button><button type="button" onClick={() => navigate('/parent')}><UsersThree size={20} />家长周报</button><button type="button" aria-label={reducedMotion ? '使用普通动画' : '减弱动画'} onClick={() => updateSettings({ reducedMotion: !reducedMotion, reducedMotionOverride: true })}><Lightning size={21} />{reducedMotion ? '普通动画' : '减弱动画'}</button><button type="button" aria-label={progress.settings.muted ? '开启声音' : '关闭声音'} onClick={() => updateSettings({ muted: !progress.settings.muted })}>{progress.settings.muted ? <SpeakerSlash size={21} /> : <SpeakerHigh size={21} />}</button></nav></header>;
}

function HomePage() {
  const navigate = useNavigate();
  const { progress } = useProgress();
  const nextMission = allMissions.find((mission) => isMissionUnlocked(progress, mission.id) && !progress.missions[mission.id]) ?? allMissions[0];
  const completed = Object.keys(progress.missions).length;

  useEffect(() => { playAudio(assetUrl('/assets/audio/welcome.m4a'), progress.settings.muted); }, []);

  return <main className="home-page"><div className="world-map-backdrop" aria-hidden="true" /><section className="hero-copy"><span className="chapter-chip">六周原著修行</span><h1>西游编程记</h1><p className="hero-kicker">读原著 · 排指令 · 写代码 · 懂 AI</p><div className="mentor-note"><img src={assetUrl("/assets/mentor.png")} alt="原著讲述导师" /><p>“故事只按原著前行，代码帮你看清其中的顺序、条件与规律。”</p></div><button className="cta" type="button" aria-label={completed === 0 ? '开始第一关：龙宫求兵' : `继续第${nextMission.week}周第${nextMission.order}关`} onClick={() => navigate(`/mission/${nextMission.id}`)}><span>{completed === 0 ? '开始第一关' : '继续今日闯关'}</span><small>{nextMission.title} · 约 20 分钟</small></button><p className="privacy-note"><LockKey size={18} />无需账号，进度只保存在这台电脑</p></section><section className="journey-panel" aria-label="六周成长地图"><div className="journey-heading"><span className="eyebrow">取经路 · 六段原著篇章</span><strong>{completed}/30 关已完成</strong></div><div className="week-grid">{course.weeks.map((week) => { const unlocked = isMissionUnlocked(progress, week.missions[0].id); const weekDone = week.missions.filter((mission) => progress.missions[mission.id]).length; return <article key={week.id} className={unlocked ? 'week-card unlocked' : 'week-card locked'}><div className="week-card-top"><span>第{'一二三四五六'[week.week - 1]}周</span>{unlocked ? <span>{weekDone}/5</span> : <LockKey size={18} />}</div><h2>{week.title}</h2><p>{week.theme}</p><div className="mission-dots">{week.missions.map((mission) => <button type="button" key={mission.id} aria-label={`${mission.title}${isMissionUnlocked(progress, mission.id) ? '' : '，未解锁'}`} disabled={!isMissionUnlocked(progress, mission.id)} onClick={() => navigate(`/mission/${mission.id}`)} className={progress.missions[mission.id] ? 'done' : mission.isBoss ? 'boss' : ''}>{mission.isBoss ? <Medal size={17} weight="fill" /> : mission.order}</button>)}</div></article>; })}</div></section></main>;
}

function HintPanel({ hints, onUse }: { hints: { observe: string; think: string; partial: string }; onUse: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const items = [['观察提示', hints.observe], ['思路提示', hints.think], ['半成品提示', hints.partial]];
  return <div className="hint-panel"><p className="eyebrow">卡住了？提示不会阻止通关</p>{items.map(([label, text]) => <div key={label}><button type="button" onClick={() => { setOpen(open === label ? null : label); if (open !== label) onUse(); }}>{label}</button>{open === label && <p>{text}</p>}</div>)}</div>;
}

function SuccessDialog({ stars, feedback, hasNext, onMap, onNext }: { stars: number; feedback: string; hasNext: boolean; onMap: () => void; onNext: () => void }) {
  const setGlobalModalOpen = useContext(GlobalModalIsolationContext);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setGlobalModalOpen(true); (nextRef.current ?? mapRef.current)?.focus(); return () => setGlobalModalOpen(false); }, [setGlobalModalOpen]);
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

function MissionPageContent({ reducedMotion, id }: { reducedMotion: boolean; id: string }) {
  const navigate = useNavigate();
  const mission = getMission(id);
  const { progress, complete } = useProgress();
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [success, setSuccess] = useState(false);
  const [stars, setStars] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  if (!mission) return <main className="not-found"><h1>这页经卷没有找到</h1><Link to="/">返回成长地图</Link></main>;
  if (!isMissionUnlocked(progress, mission.id)) return <main className="not-found"><LockKey size={40} /><h1>这一关还没有解锁</h1><Link to="/">先完成前一关</Link></main>;

  const pass = (earnedStars: number) => {
    setStars(earnedStars); setSuccess(true); complete(mission.id, { stars: earnedStars, hintsUsed }); playAudio(assetUrl(mission.isBoss ? '/assets/audio/boss.m4a' : '/assets/audio/success.m4a'), progress.settings.muted);
  };
  const validate = (sequence: string[]) => {
    setActiveStep(sequence.length);
    const result = validateSequence(sequence, mission.expectedSequence, hintsUsed);
    setFeedback(result.feedback);
    if (result.passed) pass(result.stars);
  };
  const next = allMissions[allMissions.findIndex((item) => item.id === mission.id) + 1];

  const toolProps = mission.mode === 'blockly'
    ? { missionId: mission.id, commands: mission.expectedSequence, onRun: validate }
    : mission.mode === 'python'
      ? { starterCode: mission.starterCode ?? '', expectedOutput: mission.expectedOutput ?? '', onPass: () => pass(hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1) }
      : { commands: mission.expectedSequence, onRun: validate };
  return <main className="mission-page"><div data-testid="mission-background" inert={success ? true : undefined} aria-hidden={success ? true : undefined}><header className="mission-header"><button className="back-button" type="button" onClick={() => navigate('/')}><ArrowLeft size={21} />成长地图</button><div><span>第{mission.week}周 · 第{mission.order}关{mission.isBoss ? ' · BOSS' : ''}</span><h1>{mission.title}</h1></div><div className="canon-badge"><BookOpenText size={20} /><span>{mission.canon.title}</span></div></header><div className="mission-layout"><aside className="story-column"><span className="eyebrow">原著故事层</span><h2>{mission.subtitle}</h2>{mission.storyBeats.map((item) => <article className="story-beat" key={item.title}><CheckCircle size={20} weight="fill" /><div><strong>{item.title}</strong><p>{item.summary}</p></div></article>)}<a className="canon-link" href={mission.canon.sourceUrl} target="_blank" rel="noreferrer">查看原著第{mission.canon.chapters.map(chapterLabel).join('、')}回</a><HintPanel hints={mission.hints} onUse={() => setHintsUsed((count) => count + 1)} /></aside><section className="play-column"><div className="mission-objective"><span>今日任务</span><h2>{mission.objective}</h2><p>知识法宝：{mission.knowledge}</p></div><MissionTools missionId={mission.id} mode={mission.mode} sceneProps={{ activeStep, reducedMotion }} toolProps={toolProps} />{feedback && !success && <div className="feedback-message">{feedback}</div>}</section></div></div>{success && <SuccessDialog stars={stars} feedback={feedback} hasNext={Boolean(next)} onMap={() => navigate('/')} onNext={() => next && navigate(`/mission/${next.id}`)} />}</main>;
}

function MissionPage({ reducedMotion }: { reducedMotion: boolean }) {
  const { id = '' } = useParams();
  return <MissionPageContent key={id} id={id} reducedMotion={reducedMotion} />;
}

function ParentPage() {
  const data = useProgress();
  const { progress } = data;
  const [pin, setPin] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState('');
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const inputRef = (element: HTMLInputElement | null) => { if (element) element.value = ''; };
  if (!allowed) return <main className="parent-gate"><div className="gate-card"><img src={assetUrl("/assets/mentor.png")} alt="家长入口导师" /><span className="eyebrow">仅供家长查看</span><h1>家长周报</h1><p>请输入本机家长 PIN。默认 PIN 为 2580，可在后续设置中修改。</p><label htmlFor="parent-pin">家长 PIN</label><input ref={inputRef} id="parent-pin" aria-label="家长 PIN" inputMode="numeric" maxLength={6} onChange={(event) => setPin(event.target.value)} />{error && <p className="form-error">{error}</p>}<button type="button" className="button button-primary" onClick={() => pin === progress.settings.parentPin ? setAllowed(true) : setError('PIN 不正确，请再检查一次。')}>进入周报</button><Link to="/">返回孩子的成长地图</Link></div></main>;

  return <main className="parent-page"><div data-testid="parent-data-background" inert={dataDialogOpen ? true : undefined} aria-hidden={dataDialogOpen ? true : undefined}><div className="parent-heading"><div><span className="eyebrow">本地学习档案</span><h1>家长周报</h1><p>学习数据仅保存在这台电脑</p></div><Link className="button button-ghost" to="/">返回成长地图</Link></div><section className="report-summary"><article><strong>{Object.keys(progress.missions).length}</strong><span>已完成关卡</span></article><article><strong>{Object.values(progress.missions).reduce((sum, item) => sum + item.stars, 0)}</strong><span>累计星数</span></article><article><strong>{Object.values(progress.missions).reduce((sum, item) => sum + item.hintsUsed, 0)}</strong><span>使用提示</span></article></section><section className="weekly-reports">{course.weeks.map((week) => { const report = getWeeklyReport(progress, week.week); return <article className="weekly-report" key={week.id}><div><span>第{'一二三四五六'[week.week - 1]}周</span><h2>{week.title}</h2><p>{week.theme}</p></div><div className="report-progress"><strong>{report.completed}/5</strong><span>完成 · {report.stars} 星 · {report.hintsUsed} 次提示</span><progress value={report.completed} max={5} /></div><div><span className="eyebrow">需要留意</span><p>{report.needsSupport.length ? [...new Set(report.needsSupport)].join('、') : report.completed ? '本周暂未出现明显卡点' : '尚未开始本周学习'}</p></div></article>; })}</section><ParentDataTools progress={progress} loadStatus={data.loadStatus} loadPersistence={data.loadPersistence} saveStatus={data.saveStatus} corruptDownload={data.corruptDownload} onImport={data.importProgressFile} onClear={data.clearProgress} onCreateBackup={data.createBackup} onDownload={downloadTextFile} onDialogOpenChange={setDataDialogOpen} /></div></main>;
}

function AppRoutes() {
  const { progress, loadStatus, loadPersistence, loadError, corruptDownload, saveStatus, saveError, acknowledgePrivacy, retrySave } = useProgress();
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => (
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));
  const [globalModalOpen, setGlobalModalOpen] = useState(false);

  useEffect(() => {
    if (progress.settings.reducedMotionOverride || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (event: MediaQueryListEvent) => setSystemReducedMotion(event.matches);
    setSystemReducedMotion(media.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener?.(update);
    return () => media.removeListener?.(update);
  }, [progress.settings.reducedMotionOverride]);

  const effectiveReducedMotion = progress.settings.reducedMotionOverride
    ? progress.settings.reducedMotion
    : systemReducedMotion;
  const persistence = loadPersistence === 'unsaved' || saveStatus === 'unsaved' ? 'unsaved' : saveStatus === 'saved' ? 'saved' : loadPersistence;
  const privacyOpen = !progress.privacy.localDataNoticeSeen;

  return <GlobalModalIsolationContext.Provider value={setGlobalModalOpen}><div className="app-shell" data-testid="app-shell" data-reduced-motion={String(effectiveReducedMotion)}>
    <RecoveryNotice loadStatus={loadStatus} persistence={persistence} loadError={loadError} saveError={saveError} hasCorruptDownload={corruptDownload !== null} onRetry={retrySave} />
    <div data-testid="app-background" inert={privacyOpen || globalModalOpen ? true : undefined} aria-hidden={privacyOpen || globalModalOpen ? true : undefined}>
      <Header reducedMotion={effectiveReducedMotion} />
      <RouteFocus blocked={privacyOpen || globalModalOpen} />
      <Routes><Route path="/" element={<HomePage />} /><Route path="/mission/:id" element={<MissionPage reducedMotion={effectiveReducedMotion} />} /><Route path="/parent" element={<ParentPage />} /><Route path="*" element={<HomePage />} /></Routes>
    </div>
    <PrivacyPanel acknowledged={progress.privacy.localDataNoticeSeen} onAcknowledge={acknowledgePrivacy} />
  </div></GlobalModalIsolationContext.Provider>;
}

export default function App() { return <HashRouter><ProgressProvider><AppRoutes /></ProgressProvider></HashRouter>; }
