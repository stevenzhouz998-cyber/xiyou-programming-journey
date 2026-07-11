const labels: Record<string, string> = {
  enter_palace: '进入龙宫', ask_weapon: '请求兵器', test_weapon: '试用兵器',
  inspect_weight: '查看重量', choose_heaviest: '选择最重', shrink_staff: '缩小金箍棒',
  request_armor: '索求披挂', receive_crown: '接过金冠', receive_armor: '披上金甲', receive_boots: '穿上云履',
  open_register: '打开生死簿', find_monkeys: '查找猴属', remove_names: '勾去名号',
  get_staff: '取得金箍棒', get_armor: '取得披挂', enter_underworld: '进入幽冥',
  accept_post: '接受官职', care_horses_repeat: '循环照料天马', learn_rank: '得知品级', leave_heaven: '反下天宫',
  raise_banner: '竖齐天旗', receive_title: '受齐天大圣号', build_residence: '天庭建府',
  guard_garden: '看守蟠桃园', learn_feast: '得知蟠桃会', visit_palace: '前往兜率宫', eat_elixir: '吃下金丹',
  duel_erlang: '与二郎神斗法', capture: '被擒拿', enter_furnace: '进入八卦炉', wait_until_complete: '炼足时日', escape_furnace: '踢炉脱身',
  become_stable_keeper: '受封弼马温', become_great_sage: '受齐天大圣号', peach_events: '蟠桃金丹之事', under_mountain: '压在五行山下',
  hear_report: '听高才报信', if_need_help: '判断是否求助', go_manor: '前往高老庄',
  transform: '悟空变化', wait: '等待妖怪', if_demon_arrives: '妖怪现身时判断', reveal_identity: '显出本相',
  chase: '追赶妖怪', reach_cave: '到达云栈洞', fight: '交锋', if_pilgrim_named: '听见取经人名号', tell_origin: '说明受戒来历',
  meet_tang: '拜见唐僧', tell_guanyin_order: '说明菩萨点化', receive_precepts: '摩顶受戒', join_team: '加入取经队伍', learn_origin: '得知来历',
  repeat_three: '重复三次', observe_appearance: '观察外形', keep_identity: '保持身份',
  appearance_woman: '记录女子外形', identity_demon: '记录真实身份', appearance_old_woman: '记录老妇外形',
  if_identity_demon: '判断妖怪身份', woman: '女子', old_woman: '老妇', old_man: '老翁', banish_wukong: '悟空被逐',
  woman_is_demon: '核验女子身份', old_woman_is_demon: '核验老妇身份', old_man_is_demon: '核验老翁身份', canon_ending: '保持原著结局',
  find_monks: '找到受役僧众', release_each: '逐一放行', enter_temple: '夜入三清观', transform_three: '三人变化', leave_names: '留下名号',
  wind: '风', cloud: '云', thunder: '雷', rain: '雨', meditation: '坐禅', guess_objects: '猜物', beheading: '砍头', disembowel: '剖腹', oil_bath: '下油锅',
  save_monks: '解救僧众', temple: '三清观留名', later_tests: '后续比试',
  first_fan: '一调芭蕉扇', second_fan: '二调芭蕉扇', third_fan: '三调芭蕉扇',
  label_first: '标注一调', label_fake: '标注假扇', verify_effect: '核验效果',
  state_task: '说明任务', provide_canon_facts: '提供原著事实', forbid_alt_ending: '禁止改写结局', request_format: '约定输出格式',
  read_claim: '读取说法', compare_source: '对照原著', mark_conflict: '标记冲突', keep_canon: '保留原著结论',
  first_attempt: '一调受挫', second_fake: '二调得假扇', third_battle: '三调交战', true_fan: '取得真扇', cross_mountain: '越过火焰山',
};

export function commandLabel(command: string): string {
  return labels[command] ?? command.replaceAll('_', ' · ');
}
