import { Link } from 'react-router-dom';
import type { WeekFourVariableAccess } from '../progress/progress';

type NoticeAccess = Exclude<WeekFourVariableAccess, { kind: 'formal' }>;

export function WeekFourVariableAccessNotice({ access }: { access: NoticeAccess }) {
  const historical = access.kind === 'historical-read-only';
  return (
    <main className="not-found week-four-variable-access-notice">
      <h1>{historical ? '历史记录已保留' : '先完成 W4-M1 正式复习'}</h1>
      <p>
        {historical
          ? '这份旧记录会继续保留，但不会建立新的取证记录、运行或完成结果。'
          : '第一次变化的正式取证需要先完成 W4-M1 的积木与 Python 对照。'}
      </p>
      <Link to="/mission/w4-m1">返回 W4-M1 正式重玩</Link>
    </main>
  );
}
