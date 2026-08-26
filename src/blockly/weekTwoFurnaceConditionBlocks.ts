import * as Blockly from 'blockly';
import type { FurnaceConditionBlockType } from './weekTwoFurnaceConditionContract';

export const FURNACE_CONDITION_BLOCK_LABELS: Readonly<Record<FurnaceConditionBlockType, string>> = {
  xiyou_enter_eight_trigram_furnace: '被押入八卦炉',
  xiyou_shelter_in_xun: '藏到巽位避火',
  xiyou_repeat_until_furnace_ready: '重复直到',
  xiyou_wait_seven_days: '安稳等待七日',
  xiyou_observe_furnace_door: '查看炉口',
  xiyou_leap_out_of_furnace: '纵身跳出',
  xiyou_kick_over_furnace: '蹬倒八卦炉',
  xiyou_condition_red_eyes: '眼睛被烟熏红',
  xiyou_condition_furnace_open: '听见炉头声响并看见光明',
  xiyou_condition_smoke_clears: '烟雾完全散去',
};

let registered = false;
export function registerFurnaceConditionBlocks(): void {
  if (registered) return;
  const statement = (type: FurnaceConditionBlockType, colour: number) => {
    Blockly.Blocks[type] = { init(this: Blockly.Block) { this.appendDummyInput().appendField(FURNACE_CONDITION_BLOCK_LABELS[type]); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(colour); } };
  };
  statement('xiyou_enter_eight_trigram_furnace', 28);
  statement('xiyou_shelter_in_xun', 28);
  Blockly.Blocks.xiyou_repeat_until_furnace_ready = { init(this: Blockly.Block) { this.appendValueInput('CONDITION').setCheck('Boolean').appendField(FURNACE_CONDITION_BLOCK_LABELS.xiyou_repeat_until_furnace_ready); this.appendStatementInput('CHILDREN').appendField('每轮执行'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(210); } };
  statement('xiyou_wait_seven_days', 160);
  statement('xiyou_observe_furnace_door', 160);
  statement('xiyou_leap_out_of_furnace', 28);
  statement('xiyou_kick_over_furnace', 28);
  for (const type of ['xiyou_condition_red_eyes', 'xiyou_condition_furnace_open', 'xiyou_condition_smoke_clears'] as const) {
    Blockly.Blocks[type] = { init(this: Blockly.Block) { this.appendDummyInput().appendField(FURNACE_CONDITION_BLOCK_LABELS[type]); this.setOutput(true, 'Boolean'); this.setColour(65); } };
  }
  registered = true;
}
