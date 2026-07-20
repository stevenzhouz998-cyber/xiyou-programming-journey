import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { HashRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Lightning } from '@phosphor-icons/react/dist/icons/Lightning';
import { LockKey } from '@phosphor-icons/react/dist/icons/LockKey';
import { MapTrifold } from '@phosphor-icons/react/dist/icons/MapTrifold';
import { Medal } from '@phosphor-icons/react/dist/icons/Medal';
import { SpeakerHigh } from '@phosphor-icons/react/dist/icons/SpeakerHigh';
import { SpeakerSlash } from '@phosphor-icons/react/dist/icons/SpeakerSlash';
import { UsersThree } from '@phosphor-icons/react/dist/icons/UsersThree';
import { courseOutline, allMissionOutlines } from './course/courseOutline';
import { ProgressProvider, useProgress } from './context/ProgressContext';
import { getWeeklyReport, isMissionUnlocked } from './progress/progress';
import { PrivacyPanel } from './components/PrivacyPanel';
import { LazySectionBoundary } from './components/LazySectionBoundary';
import { assetUrl } from './utils/assets';
import { downloadTextFile } from './utils/download';
import './styles.css';

const ParentAccessGate = lazy(() => import('./components/ParentAccessGate').then((module) => ({ default: module.ParentAccessGate })));
const ParentDataTools = lazy(() => import('./components/ParentDataTools').then((module) => ({ default: module.ParentDataTools })));
const RecoveryNotice = lazy(() => import('./components/RecoveryNotice').then((module) => ({ default: module.RecoveryNotice })));
const MissionPageContent = lazy(() => import('./components/MissionPageContent').then((module) => ({ default: module.MissionPageContent })));

function RouteFocus({ blocked }: { blocked: boolean }) {
  const location = useLocation();
  const initialRef = useRef(true);
  useEffect(() => {
    if (blocked) return undefined;
    if (initialRef.current) { initialRef.current = false; return undefined; }
    let observer: MutationObserver | null = null;
    const focusRouteHeading = () => {
      const target = document.querySelector<HTMLElement>('main h1, main[tabindex="-1"]');
      if (!target || target.closest('[inert]')) return false;
      target.tabIndex = -1;
      target.focus();
      observer?.disconnect();
      return true;
    };
    const frame = requestAnimationFrame(() => {
      if (focusRouteHeading()) return;
      observer = new MutationObserver(() => { focusRouteHeading(); });
      observer.observe(document.body, { childList: true, subtree: true });
    });
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [blocked, location.pathname]);
  return null;
}

function playAudio(path: string, muted: boolean) {
  if (muted || typeof Audio === 'undefined') return;
  const playback = new Audio(path).play();
  if (playback && typeof playback.catch === 'function') void playback.catch(() => undefined);
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
  const nextMission = allMissionOutlines.find((mission) => isMissionUnlocked(progress, mission.id) && !progress.missions[mission.id]) ?? allMissionOutlines[0];
  const completed = Object.keys(progress.missions).length;

  useEffect(() => { playAudio(assetUrl('/assets/audio/welcome.m4a'), progress.settings.muted); }, []);

  return <main className="home-page"><div className="world-map-backdrop" aria-hidden="true" /><section className="hero-copy"><span className="chapter-chip">六周原著修行</span><h1>西游编程记</h1><p className="hero-kicker">读原著 · 排指令 · 写代码 · 懂 AI</p><div className="mentor-note"><img src={assetUrl("/assets/mentor.png")} alt="原著讲述导师" /><p>“故事只按原著前行，代码帮你看清其中的顺序、条件与规律。”</p></div><button className="cta" type="button" aria-label={completed === 0 ? '开始第一关：龙宫求兵' : `继续第${nextMission.week}周第${nextMission.order}关`} onClick={() => navigate(`/mission/${nextMission.id}`)}><span>{completed === 0 ? '开始第一关' : '继续今日闯关'}</span><small>{nextMission.title} · 约 20 分钟</small></button><p className="privacy-note"><LockKey size={18} />无需账号，进度只保存在这台电脑</p></section><section className="journey-panel" aria-label="六周成长地图"><div className="journey-heading"><span className="eyebrow">取经路 · 六段原著篇章</span><strong>{completed}/30 关已完成</strong></div><div className="week-grid">{courseOutline.weeks.map((week) => { const unlocked = isMissionUnlocked(progress, week.missions[0].id); const weekDone = week.missions.filter((mission) => progress.missions[mission.id]).length; return <article key={week.id} className={unlocked ? 'week-card unlocked' : 'week-card locked'}><div className="week-card-top"><span>第{'一二三四五六'[week.week - 1]}周</span>{unlocked ? <span>{weekDone}/5</span> : <LockKey size={18} />}</div><h2>{week.title}</h2><p>{week.theme}</p><div className="mission-dots">{week.missions.map((mission) => <button type="button" key={mission.id} aria-label={`${mission.title}${isMissionUnlocked(progress, mission.id) ? '' : '，未解锁'}`} disabled={!isMissionUnlocked(progress, mission.id)} onClick={() => navigate(`/mission/${mission.id}`)} className={progress.missions[mission.id] ? 'done' : mission.isBoss ? 'boss' : ''}>{mission.isBoss ? <Medal size={17} weight="fill" /> : mission.order}</button>)}</div></article>; })}</div></section></main>;
}

function ParentPage() {
  const data = useProgress();
  const { progress } = data;
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  return <LazySectionBoundary label="家长入口"><Suspense fallback={<main className="parent-gate" role="status">家长入口加载中，请稍候……</main>}><ParentAccessGate record={progress.settings.parentPin} saveRecord={async (record) => (await data.commitParentAccess(record)).status === 'saved'}><main className="parent-page"><div data-testid="parent-data-background" inert={dataDialogOpen ? true : undefined} aria-hidden={dataDialogOpen ? true : undefined}><div className="parent-heading"><div><span className="eyebrow">本地学习档案</span><h1>家长周报</h1><p>学习数据仅保存在这台电脑</p></div><Link className="button button-ghost" to="/">返回成长地图</Link></div><section className="report-summary"><article><strong>{Object.keys(progress.missions).length}</strong><span>已完成关卡</span></article><article><strong>{Object.values(progress.missions).reduce((sum, item) => sum + item.stars, 0)}</strong><span>累计星数</span></article><article><strong>{Object.values(progress.missions).reduce((sum, item) => sum + item.hintsUsed, 0)}</strong><span>使用提示</span></article></section><section className="weekly-reports">{courseOutline.weeks.map((week) => { const report = getWeeklyReport(progress, week.week); const completedMissions = week.missions.filter((mission) => progress.missions[mission.id]).map((mission) => mission.title); return <article className="weekly-report" key={week.id}><div><span>第{'一二三四五六'[week.week - 1]}周</span><h2>{week.title}</h2><p>{week.theme}</p>{completedMissions.length ? <p className="completed-mission-summary">已完成：{completedMissions.join('、')}</p> : null}{report.sessionRuns > 0 || report.sessionAdjustments > 0 ? <p className="mission-session-summary">运行 {report.sessionRuns} 次 · 调整 {report.sessionAdjustments} 次</p> : null}</div><div className="report-progress"><strong>{report.completed}/5</strong><span>完成 · {report.stars} 星 · {report.hintsUsed} 次提示</span><progress value={report.completed} max={5} /></div><div><span className="eyebrow">需要留意</span><p>{report.needsSupport.length ? [...new Set(report.needsSupport)].join('、') : report.completed ? '本周暂未出现明显卡点' : '尚未开始本周学习'}</p></div></article>; })}</section><LazySectionBoundary label="家长数据工具"><Suspense fallback={<p role="status">家长数据工具加载中，请稍候……</p>}><ParentDataTools progress={progress} loadStatus={data.loadStatus} loadPersistence={data.loadPersistence} saveStatus={data.saveStatus} corruptDownload={data.corruptDownload} corruptError={data.corruptError} onImport={data.importProgressFile} onClear={data.clearProgress} onCreateBackup={data.createBackup} onDownload={downloadTextFile} onDialogOpenChange={setDataDialogOpen} /></Suspense></LazySectionBoundary></div></main></ParentAccessGate></Suspense></LazySectionBoundary>;
}

function AppRoutes() {
  const data = useProgress();
  const { progress, loadStatus, loadPersistence, loadError, corruptDownload, corruptError, saveStatus, saveError, saveRetryable, acknowledgePrivacy, retrySave } = data;
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => (
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [completionPersistenceActive, setCompletionPersistenceActive] = useState(false);

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
  const conflict = saveStatus === 'conflict';
  const persistence = loadPersistence === 'unsaved' || saveStatus === 'unsaved' || conflict
    ? 'unsaved'
    : saveStatus === 'saved' ? 'saved' : loadPersistence;
  const privacyOpen = !progress.privacy.localDataNoticeSeen;
  const hasRecoveryDetails = corruptDownload !== null || corruptError !== null
    || loadStatus === 'recovered-from-snapshot' || loadStatus === 'reset-after-corruption';
  const showRecoveryNotice = conflict || persistence === 'unsaved' || hasRecoveryDetails
    || (loadStatus !== 'normal' && loadStatus !== 'storage-unavailable');

  return <div className="app-shell" data-testid="app-shell" data-reduced-motion={String(effectiveReducedMotion)}>
    {showRecoveryNotice && !completionPersistenceActive && <LazySectionBoundary label="存档恢复提示"><Suspense fallback={<aside className="recovery-notice recovery-notice-alert" role="status">存档恢复提示加载中，请稍候……</aside>}><RecoveryNotice loadStatus={loadStatus} persistence={persistence} loadError={loadError} corruptError={corruptError} saveError={saveError} hasCorruptDownload={corruptDownload !== null} conflict={conflict} retryable={saveRetryable} onRetry={retrySave} onDownloadConflictBackup={() => { const backup = data.createBackup(); downloadTextFile(backup.filename, backup.contents, backup.mimeType); }} onReloadExternal={data.reloadExternalProgress} /></Suspense></LazySectionBoundary>}
    <div data-testid="app-background" inert={privacyOpen || globalModalOpen ? true : undefined} aria-hidden={privacyOpen || globalModalOpen ? true : undefined}>
      <Header reducedMotion={effectiveReducedMotion} />
      <RouteFocus blocked={privacyOpen || globalModalOpen} />
      <LazySectionBoundary label="页面内容"><Suspense fallback={<main className="mission-tools-loading" role="status">页面内容加载中，请稍候……</main>}><Routes><Route path="/" element={<HomePage />} /><Route path="/mission/:id" element={<MissionPageContent reducedMotion={effectiveReducedMotion} onGlobalModalOpenChange={setGlobalModalOpen} onCompletionPersistenceActiveChange={setCompletionPersistenceActive} />} /><Route path="/parent" element={<ParentPage />} /><Route path="*" element={<HomePage />} /></Routes></Suspense></LazySectionBoundary>
    </div>
    <PrivacyPanel acknowledged={progress.privacy.localDataNoticeSeen} onAcknowledge={acknowledgePrivacy} />
  </div>;
}

interface AppProps {
  loadSaveCoordinator?: () => Promise<typeof import('./progress/storageCoordinator')>;
}

export default function App({ loadSaveCoordinator }: AppProps = {}) { return <HashRouter><ProgressProvider loadSaveCoordinator={loadSaveCoordinator}><AppRoutes /></ProgressProvider></HashRouter>; }
