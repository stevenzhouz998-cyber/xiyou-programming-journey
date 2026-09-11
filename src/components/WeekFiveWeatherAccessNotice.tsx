import { Link } from 'react-router-dom';
import type { WeekFiveWeatherAccess } from '../progress/progress';

export function WeekFiveWeatherAccessNotice({ access }: { access: WeekFiveWeatherAccess }) {
  if (access.kind === 'formal') return null;
  const historical = access.kind === 'historical-read-only';
  return (
    <main className="not-found week-four-branch-access-notice">
      <h1>{historical
        ? (access.completed ? '以前闯过的记录已保留' : '以前已能查看这段故事')
        : '先完成三清观的正式验证'}</h1>
      <p>{historical
        ? '这次只能回看故事；完成上一关正式函数验证后，就能练习参数。'
        : '先真实调用并保存上一关的函数，再进入祈雨参数练习。'}</p>
      <Link to="/mission/w5-m2">返回三清观</Link>
    </main>
  );
}
