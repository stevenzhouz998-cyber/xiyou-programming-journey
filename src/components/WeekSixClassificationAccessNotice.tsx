import type { WeekSixClassificationAccess } from '../progress/progress';

export function WeekSixClassificationAccessNotice({access}:{access:WeekSixClassificationAccess}) {
  if(access.kind==='locked')return <main className="not-found"><h1>先完成三次借扇记录</h1><p>只有 W6-M1 的正式事实表与证明可以进入真假扇证据分类台。</p></main>;
  if(access.kind==='historical-read-only')return <main className="not-found"><h1>历史记录仅供查看</h1><p>{access.completed?'这台设备保留了旧版 W6-M2 完成历史，但没有伪造新的标签、依据、核验或正式作品。':'现有前置只有历史标记，不能代替 W6-M1 正式证明。'}</p></main>;
  return null;
}
