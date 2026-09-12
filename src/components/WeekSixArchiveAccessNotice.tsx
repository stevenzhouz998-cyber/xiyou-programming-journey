import type { WeekSixArchiveAccess } from '../progress/progress';
export function WeekSixArchiveAccessNotice({access}:{access:Exclude<WeekSixArchiveAccess,{kind:'formal'}>}){return <main className="not-found"><h1>{access.kind==='locked'?'取经档案总编尚未解锁':'历史火焰山终局试炼'}</h1><p>{access.kind==='locked'?'先完成回答审校台并保存正式作品。':'这份旧记录没有真实代码、整理与核验链，不会伪造终点证明。'}</p></main>}
