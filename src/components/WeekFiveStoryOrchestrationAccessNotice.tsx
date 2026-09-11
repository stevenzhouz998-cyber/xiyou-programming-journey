import { Link } from 'react-router-dom';
import type { WeekFiveStoryOrchestrationAccess } from '../progress/progress';

export function WeekFiveStoryOrchestrationAccessNotice({ access }: { access: WeekFiveStoryOrchestrationAccess }) {
  if (access.kind === 'formal') return null;
  const historical = access.kind === 'historical-read-only';
  return (
    <main className="not-found week-four-branch-access-notice">
      <h1>{historical
        ? (access.completed ? '以前闯过的记录已保留' : '以前已能查看这段故事')
        : '先完成后续比试分解的正式验证'}</h1>
      <p>{historical
        ? '这次只能回看故事；完成上一关正式问题分解验证后，就能练习故事总编排。'
        : '先真实运行并保存上一关的问题分解作品，再进入车迟国故事总编排。'}</p>
      <Link to="/mission/w5-m4">返回后续比试分解</Link>
    </main>
  );
}
