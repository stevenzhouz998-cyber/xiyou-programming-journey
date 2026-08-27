import * as Blockly from 'blockly';
import { type CuilanBooleanBlockType } from './weekThreeCuilanBooleanContract';

export const CUILAN_BOOLEAN_BLOCK_LABELS: Readonly<Record<CuilanBooleanBlockType, string>> = {
  w3_cuilan_transform: '变作高翠兰',
  w3_cuilan_if_disguise_ready: '如果伪装已经准备好',
  w3_cuilan_condition_appearance_matches: '外形和高翠兰相同',
  w3_cuilan_hold_disguise: '保持伪装，等待妖怪进屋',
  w3_cuilan_adjust_transform: '调整变化',
  w3_cuilan_collect_clue: '从对话得知姓名和云栈洞住处',
  w3_cuilan_if_identity_reveal: '检查是否应显出本相',
  w3_cuilan_condition_identity_is_cuilan: '真实身份是高翠兰',
  w3_cuilan_continue_disguise: '继续装作高翠兰',
  w3_cuilan_reveal_wukong: '显出悟空本相',
};

export function registerCuilanBooleanBlocks(): void {
  const statement = (type: Extract<CuilanBooleanBlockType, 'w3_cuilan_transform' | 'w3_cuilan_hold_disguise' | 'w3_cuilan_adjust_transform' | 'w3_cuilan_collect_clue' | 'w3_cuilan_continue_disguise' | 'w3_cuilan_reveal_wukong'>, colour: number) => {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.appendDummyInput().appendField(CUILAN_BOOLEAN_BLOCK_LABELS[type]);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(colour);
      },
    };
  };
  for (const type of ['w3_cuilan_transform', 'w3_cuilan_hold_disguise', 'w3_cuilan_adjust_transform', 'w3_cuilan_collect_clue', 'w3_cuilan_continue_disguise', 'w3_cuilan_reveal_wukong'] as const) statement(type, 28);
  for (const type of ['w3_cuilan_if_disguise_ready', 'w3_cuilan_if_identity_reveal'] as const) {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.appendValueInput('CONDITION').setCheck('Boolean').appendField(CUILAN_BOOLEAN_BLOCK_LABELS[type]);
        this.appendStatementInput('THEN').appendField('那么');
        this.appendStatementInput('ELSE').appendField('否则');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(210);
      },
    };
  }
  for (const type of ['w3_cuilan_condition_appearance_matches', 'w3_cuilan_condition_identity_is_cuilan'] as const) {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.appendDummyInput().appendField(CUILAN_BOOLEAN_BLOCK_LABELS[type]);
        this.setOutput(true, 'Boolean');
        this.setColour(65);
      },
    };
  }
}
