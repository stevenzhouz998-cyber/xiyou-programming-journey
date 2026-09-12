import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKey } from '@phosphor-icons/react/dist/icons/LockKey';
import { Medal } from '@phosphor-icons/react/dist/icons/Medal';
import { courseOutline, allMissionOutlines } from '../course/courseOutline';
import { useProgress } from '../context/ProgressContext';
import { isMissionUnlocked } from '../progress/progress';
import { assetUrl } from '../utils/assets';

function playAudio(path: string, muted: boolean) {
  if (muted || typeof Audio === 'undefined') return;
  const playback = new Audio(path).play();
  if (playback && typeof playback.catch === 'function') void playback.catch(() => undefined);
}

export function HomePage({ onOpenEquipment }: { onOpenEquipment: () => void }) {
  const navigate = useNavigate();
  const { progress } = useProgress();
  const nextMission = allMissionOutlines.find((mission) => isMissionUnlocked(progress, mission.id) && !progress.missions[mission.id]) ?? allMissionOutlines[0];
  const completed = Object.keys(progress.missions).length;

  useEffect(() => { playAudio(assetUrl('/assets/audio/welcome.m4a'), progress.settings.muted); }, []);

  return <main className="home-page"><div className="world-map-backdrop" aria-hidden="true" /><section className="hero-copy"><span className="chapter-chip">六周原著修行</span><h1>西游编程记</h1><p className="hero-kicker">读原著 · 排指令 · 写代码 · 懂 AI</p><div className="mentor-note"><img src={assetUrl('/assets/mentor.png')} alt="原著讲述导师" /><p>“故事只按原著前行，代码帮你看清其中的顺序、条件与规律。”</p></div><button className="cta" type="button" aria-label={completed === 0 ? '开始第一关：龙宫求兵' : `继续第${nextMission.week}周第${nextMission.order}关`} onClick={() => navigate(`/mission/${nextMission.id}`)}><span>{completed === 0 ? '开始第一关' : '继续今日闯关'}</span><small>{nextMission.title} · 约 20 分钟</small></button><p className="privacy-note"><LockKey size={18} />无需账号，进度只保存在这台电脑</p></section><section className="journey-panel" aria-label="六周成长地图"><div className="journey-heading"><span className="eyebrow">取经路 · 六段原著篇章</span><div className="journey-actions"><strong>{completed}/30 关已完成</strong><button className="button button-ghost equipment-entry" type="button" aria-label="打开装备行囊" onClick={onOpenEquipment}>装备行囊</button></div></div><div className="week-grid">{courseOutline.weeks.map((week) => { const unlocked = isMissionUnlocked(progress, week.missions[0].id); const weekDone = week.missions.filter((mission) => progress.missions[mission.id]).length; return <article key={week.id} className={unlocked ? 'week-card unlocked' : 'week-card locked'}><div className="week-card-top"><span>第{'一二三四五六'[week.week - 1]}周</span>{unlocked ? <span>{weekDone}/5</span> : <LockKey size={18} />}</div><h2>{week.title}</h2><p>{week.theme}</p><div className="mission-dots">{week.missions.map((mission) => <button type="button" key={mission.id} aria-label={`${mission.title}${isMissionUnlocked(progress, mission.id) ? '' : '，未解锁'}`} disabled={!isMissionUnlocked(progress, mission.id)} onClick={() => navigate(`/mission/${mission.id}`)} className={progress.missions[mission.id] ? 'done' : mission.isBoss ? 'boss' : ''}>{mission.isBoss ? <Medal size={17} weight="fill" /> : mission.order}</button>)}</div></article>; })}</div></section></main>;
}
