import { Link } from 'react-router-dom';
import type { WeekFourListAccess } from '../progress/progress';

export function WeekFourListAccessNotice({ access }: { access: WeekFourListAccess }) {
  if (access.kind === 'formal') return null;
  const historical = access.kind === 'historical-read-only';
  return (
    <main className="not-found week-four-branch-access-notice">
      <h1>
        {historical
          ? access.completed ? '以前闯过的记录已保留' : '以前已能查看这段故事'
          : '先完成上一关的正式验证'}
      </h1>
      <p>
        {historical
          ? access.completed
            ? '这里只能回看故事。想再动手练习，请先完成上一关的正式验证。'
            : '这次只能回看故事，还没有闯过这一关。完成上一关的正式验证后，就能继续挑战。'
          : '完成上一关的核验后，就能继续这段列表与循环故事。'}
      </p>
      <Link to="/mission/w4-m3">返回上一关继续验证</Link>
    </main>
  );
}
