import type { WeekSixPromptAccess } from '../progress/progress';
export function WeekSixPromptAccessNotice({access}:{access:Exclude<WeekSixPromptAccess,{kind:'formal'}>}){return <main className="not-found"><h1>{access.kind==='locked'?'任务说明书尚未解锁':'历史任务说明书'}</h1><p>{access.kind==='locked'?'先完成真假扇证据分类并保存正式作品。':'这份旧记录没有可重验的任务、事实、限制与格式，不会伪造新证明。'}</p></main>}
