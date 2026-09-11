import { Link } from 'react-router-dom';
import type { WeekFiveDecompositionAccess } from '../progress/progress';

export function WeekFiveDecompositionAccessNotice({ access }: { access: WeekFiveDecompositionAccess }) {
  if (access.kind === 'formal') return null;
  const historical = access.kind === 'historical-read-only';
  return (
    <main className="not-found week-four-branch-access-notice">
      <h1>{historical
        ? (access.completed ? '以前闯过的记录已保留' : '以前已能查看这段故事')
        : '先完成祈雨记录的正式验证'}</h1>
      <p>{historical
        ? '这次只能回看故事；完成上一关正式参数验证后，就能练习问题分解。'
        : '先真实运行并保存上一关的参数作品，再进入后续比试记录。'}</p>
      <Link to="/mission/w5-m3">返回祈雨记录</Link>
    </main>
  );
}
