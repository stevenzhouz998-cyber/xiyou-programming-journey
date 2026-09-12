import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Lightning } from '@phosphor-icons/react/dist/icons/Lightning';
import { MapTrifold } from '@phosphor-icons/react/dist/icons/MapTrifold';
import { SpeakerHigh } from '@phosphor-icons/react/dist/icons/SpeakerHigh';
import { SpeakerSlash } from '@phosphor-icons/react/dist/icons/SpeakerSlash';
import { UsersThree } from '@phosphor-icons/react/dist/icons/UsersThree';
import { ProgressProvider, useProgress } from './context/ProgressContext';
import { PrivacyPanel } from './components/PrivacyPanel';
import { LazySectionBoundary } from './components/LazySectionBoundary';
import { assetUrl } from './utils/assets';
import './styles.css';

const ParentPage = lazy(() => import('./components/ParentPage').then((module) => ({ default: module.ParentPage })));
const HomePage = lazy(() => import('./components/HomePage').then((module) => ({ default: module.HomePage })));
const RecoveryNotice = lazy(() => import('./components/RecoveryNotice').then((module) => ({ default: module.RecoveryNotice })));
const MissionPageContent = lazy(() => import('./components/MissionPageContent').then((module) => ({ default: module.MissionPageContent })));
const EquipmentDrawer = lazy(() => import('./components/EquipmentDrawer').then((module) => ({ default: module.EquipmentDrawer })));

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

function Header({ reducedMotion }: { reducedMotion: boolean }) {
  const navigate = useNavigate();
  const { progress, updateSettings } = useProgress();
  const totalStars = Object.values(progress.missions).reduce((sum, mission) => sum + mission.stars, 0);
  return <header className="topbar"><button className="brand" type="button" onClick={() => navigate('/')}><span className="brand-seal">码</span><span><strong>西游编程记</strong><small>原著闯关 · 编程修行</small></span></button><div className="learner-summary"><img src={assetUrl("/assets/young-hero.png")} alt="小行者头像" /><span><strong>{progress.learnerName}</strong><small>{Object.keys(progress.missions).length}/30 关 · {totalStars} 星</small></span></div><nav><button type="button" onClick={() => navigate('/')}><MapTrifold size={20} />成长地图</button><button type="button" onClick={() => navigate('/parent')}><UsersThree size={20} />家长周报</button><button type="button" aria-label={reducedMotion ? '使用普通动画' : '减弱动画'} onClick={() => updateSettings({ reducedMotion: !reducedMotion, reducedMotionOverride: true })}><Lightning size={21} />{reducedMotion ? '普通动画' : '减弱动画'}</button><button type="button" aria-label={progress.settings.muted ? '开启声音' : '关闭声音'} onClick={() => updateSettings({ muted: !progress.settings.muted })}>{progress.settings.muted ? <SpeakerSlash size={21} /> : <SpeakerHigh size={21} />}</button></nav></header>;
}

function AppRoutes() {
  const data = useProgress();
  const { progress, loadStatus, loadPersistence, loadError, corruptDownload, corruptError, saveStatus, saveError, saveRetryable, acknowledgePrivacy, retrySave } = data;
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => (
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
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
      {showRecoveryNotice && !completionPersistenceActive && <LazySectionBoundary label="存档恢复提示"><Suspense fallback={<aside className="recovery-notice recovery-notice-alert" role="status">存档恢复提示加载中，请稍候……</aside>}><RecoveryNotice loadStatus={loadStatus} persistence={persistence} loadError={loadError} corruptError={corruptError} saveError={saveError} hasCorruptDownload={corruptDownload !== null} conflict={conflict} retryable={saveRetryable} onRetry={retrySave} onCreateConflictBackup={data.createBackup} onReloadExternal={data.reloadExternalProgress} /></Suspense></LazySectionBoundary>}
    <div data-testid="app-background" inert={privacyOpen || globalModalOpen || equipmentOpen ? true : undefined} aria-hidden={privacyOpen || globalModalOpen || equipmentOpen ? true : undefined}>
      <Header reducedMotion={effectiveReducedMotion} />
      <RouteFocus blocked={privacyOpen || globalModalOpen || equipmentOpen} />
      <LazySectionBoundary label="页面内容"><Suspense fallback={<main className="mission-tools-loading" role="status">页面内容加载中，请稍候……</main>}><Routes><Route path="/" element={<HomePage onOpenEquipment={() => setEquipmentOpen(true)} />} /><Route path="/mission/:id" element={<MissionPageContent reducedMotion={effectiveReducedMotion} onGlobalModalOpenChange={setGlobalModalOpen} onCompletionPersistenceActiveChange={setCompletionPersistenceActive} />} /><Route path="/parent" element={<ParentPage />} /><Route path="*" element={<HomePage onOpenEquipment={() => setEquipmentOpen(true)} />} /></Routes></Suspense></LazySectionBoundary>
    </div>
    {equipmentOpen ? <LazySectionBoundary label="装备行囊"><Suspense fallback={<aside className="equipment-drawer-loading" role="status">装备行囊加载中，请稍候……</aside>}><EquipmentDrawer open={equipmentOpen} onClose={() => setEquipmentOpen(false)} /></Suspense></LazySectionBoundary> : null}
    <PrivacyPanel acknowledged={progress.privacy.localDataNoticeSeen} onAcknowledge={acknowledgePrivacy} />
  </div>;
}

interface AppProps {
  loadSaveCoordinator?: () => Promise<typeof import('./progress/storageCoordinator')>;
}

export default function App({ loadSaveCoordinator }: AppProps = {}) { return <HashRouter><ProgressProvider loadSaveCoordinator={loadSaveCoordinator}><AppRoutes /></ProgressProvider></HashRouter>; }
