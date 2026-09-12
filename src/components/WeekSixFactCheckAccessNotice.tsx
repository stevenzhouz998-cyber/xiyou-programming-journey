import type { WeekSixFactCheckAccess } from '../progress/progress';
export function WeekSixFactCheckAccessNotice({access}:{access:Exclude<WeekSixFactCheckAccess,{kind:'formal'}>}){return <main className="not-found"><h1>{access.kind==='locked'?'回答审校台尚未解锁':'历史回答审校台'}</h1><p>{access.kind==='locked'?'先完成任务说明书并保存正式作品。':'这份旧记录没有可重验的逐句判断、证据与处置，不会伪造新证明。'}</p></main>}
