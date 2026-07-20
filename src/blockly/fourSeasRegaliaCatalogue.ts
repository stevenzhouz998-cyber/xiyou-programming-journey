import type { FourSeasBlockType } from './fourSeasRegaliaContract'

export const FOUR_SEAS_BLOCK_LABELS: Readonly<Record<FourSeasBlockType, string>> = {
  xiyou_request_regalia: '向东海龙王请求披挂',
  xiyou_collect_gifts: '收齐三海宝物',
  xiyou_receive_cloud_boots: '收下北海的藕丝步云履',
  xiyou_receive_golden_armor: '收下西海的锁子黄金甲',
  xiyou_receive_purple_crown: '收下南海的凤翅紫金冠',
  xiyou_equip_regalia: '穿戴整副披挂',
  xiyou_wear_crown: '戴上凤翅紫金冠',
  xiyou_wear_armor: '穿上锁子黄金甲',
  xiyou_wear_boots: '踏上藕丝步云履',
  xiyou_verify_regalia: '检查披挂是否齐全',
}
