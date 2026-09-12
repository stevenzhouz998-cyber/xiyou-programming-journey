export const DEFAULT_WEEK_SIX_RECORDS_PYTHON = `records = [
    {"第几调": "一调", "经过": "得到假扇，火势更旺"},
    {"第几调": "二调", "经过": "取得真扇，随后被骗回"},
    {"第几调": "三调", "经过": "最终借得真扇，灭火通行"},
]

for record in records:
    record_attempt(record["第几调"], record["第几调"])`;

export const SOLVED_WEEK_SIX_RECORDS_PYTHON = DEFAULT_WEEK_SIX_RECORDS_PYTHON.replace(
  'record["第几调"])',
  'record["经过"])',
);
