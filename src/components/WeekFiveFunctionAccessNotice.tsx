import { Link } from 'react-router-dom';
import type { WeekFiveFunctionAccess } from '../progress/progress';

export function WeekFiveFunctionAccessNotice({ access }: { access: WeekFiveFunctionAccess }) {
  if (access.kind === 'formal') return null;
  const historical = access.kind === 'historical-read-only';
  return <main className="not-found week-four-branch-access-notice">
    <h1>{historical ? access.completed ? '以前闯过的记录已保留' : '以前已能查看这段故事' : '先完成逐人解困的正式验证'}</h1>
    <p>{historical ? access.completed ? '这里只能回看故事。完成上一关的正式验证后，可以重新练习函数。' : '这次只能回看故事；完成上一关的正式验证后，就能动手练习函数。' : '先完成上一关的真实 Python 循环和正式保存，再进入三清观函数练习。'}</p>
    <Link to="/mission/w5-m1">返回逐人解困</Link>
  </main>;
}
