import * as Blockly from 'blockly';
import type { HeavenlySignalBossBlockType } from './weekTwoHeavenlySignalBossContract';

export const HEAVENLY_SIGNAL_BOSS_BLOCK_LABELS: Readonly<Record<HeavenlySignalBossBlockType, string>> = {
  xiyou_boss_on_stable_duty: '当 御马监开始值守', xiyou_boss_on_returned_flower_fruit: '当 悟空返回花果山', xiyou_boss_on_heavenly_title: '当 天庭正式授号', xiyou_boss_on_peach_message: '当 蟠桃会消息传来', xiyou_boss_on_furnace_refining: '当 八卦炉开始锻炼',
  xiyou_boss_accept_stable_post: '接受弼马温官职', xiyou_boss_repeat_horse_care: '重复照料天马', xiyou_boss_care_next_horse: '照料下一匹天马', xiyou_boss_learn_stable_rank: '了解弼马温品级', xiyou_boss_leave_heaven: '离开天庭返回花果山',
  xiyou_boss_raise_great_sage_flag: '竖起齐天大圣旗', xiyou_boss_accept_great_sage_title: '接受齐天大圣名号', xiyou_boss_build_great_sage_residence: '建立齐天大圣府',
  xiyou_boss_guard_peach_garden: '受命看守蟠桃园', xiyou_boss_learn_peach_banquet: '从七仙女处得知蟠桃会', xiyou_boss_drink_at_banquet: '进入瑶池饮下仙酒', xiyou_boss_stumble_into_tusita: '醉后误入兜率宫', xiyou_boss_eat_golden_elixir: '吃下金丹',
  xiyou_boss_enter_furnace: '被押入八卦炉', xiyou_boss_shelter_xun: '藏到巽位避火', xiyou_boss_repeat_until_furnace_ready: '重复直到', xiyou_boss_wait_seven_days: '安稳等待七日', xiyou_boss_observe_furnace: '查看炉口', xiyou_boss_escape_furnace: '纵身跳出', xiyou_boss_topple_furnace: '蹬倒八卦炉',
  xiyou_boss_condition_red_eyes: '眼睛被烟熏红', xiyou_boss_condition_furnace_open: '听见炉头声响并看见光明', xiyou_boss_condition_smoke_clears: '烟雾完全散去',
};
let registered = false;
export function registerHeavenlySignalBossBlocks(): void {
  if (registered) return;
  const eventHat = (type: HeavenlySignalBossBlockType) => { Blockly.Blocks[type] = { init(this: Blockly.Block) { this.appendStatementInput('HANDLER').appendField(HEAVENLY_SIGNAL_BOSS_BLOCK_LABELS[type]); this.setColour(290); } }; };
  for (const type of ['xiyou_boss_on_stable_duty', 'xiyou_boss_on_returned_flower_fruit', 'xiyou_boss_on_heavenly_title', 'xiyou_boss_on_peach_message', 'xiyou_boss_on_furnace_refining'] as const) eventHat(type);
  const action = (type: HeavenlySignalBossBlockType, colour = 28) => { Blockly.Blocks[type] = { init(this: Blockly.Block) { this.appendDummyInput().appendField(HEAVENLY_SIGNAL_BOSS_BLOCK_LABELS[type]); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(colour); } }; };
  for (const type of ['xiyou_boss_accept_stable_post', 'xiyou_boss_care_next_horse', 'xiyou_boss_learn_stable_rank', 'xiyou_boss_leave_heaven', 'xiyou_boss_raise_great_sage_flag', 'xiyou_boss_accept_great_sage_title', 'xiyou_boss_build_great_sage_residence', 'xiyou_boss_guard_peach_garden', 'xiyou_boss_learn_peach_banquet', 'xiyou_boss_drink_at_banquet', 'xiyou_boss_stumble_into_tusita', 'xiyou_boss_eat_golden_elixir', 'xiyou_boss_enter_furnace', 'xiyou_boss_shelter_xun', 'xiyou_boss_wait_seven_days', 'xiyou_boss_observe_furnace', 'xiyou_boss_escape_furnace', 'xiyou_boss_topple_furnace'] as const) action(type, type.includes('wait') || type.includes('observe') ? 160 : 28);
  Blockly.Blocks.xiyou_boss_repeat_horse_care = { init(this: Blockly.Block) { this.appendDummyInput().appendField('重复').appendField(new Blockly.FieldNumber(2, 1, 6, 1), 'TIMES').appendField('次照料天马'); this.appendStatementInput('CHILDREN').appendField('每次执行'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(210); } };
  Blockly.Blocks.xiyou_boss_repeat_until_furnace_ready = { init(this: Blockly.Block) { this.appendValueInput('CONDITION').setCheck('Boolean').appendField(HEAVENLY_SIGNAL_BOSS_BLOCK_LABELS.xiyou_boss_repeat_until_furnace_ready); this.appendStatementInput('CHILDREN').appendField('每轮执行'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(210); } };
  for (const type of ['xiyou_boss_condition_red_eyes', 'xiyou_boss_condition_furnace_open', 'xiyou_boss_condition_smoke_clears'] as const) Blockly.Blocks[type] = { init(this: Blockly.Block) { this.appendDummyInput().appendField(HEAVENLY_SIGNAL_BOSS_BLOCK_LABELS[type]); this.setOutput(true, 'Boolean'); this.setColour(65); } };
  registered = true;
}
