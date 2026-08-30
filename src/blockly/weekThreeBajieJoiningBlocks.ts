import * as Blockly from 'blockly';
import { type BajieJoiningBlockType } from './weekThreeBajieJoiningContract';

export const BAJIE_JOINING_BLOCK_LABELS: Readonly<Record<BajieJoiningBlockType, string>> = {
  w3_bajie_receive_statement: '收到当前入队陈述',
  w3_bajie_if_join_ready: '如果入队条件',
  w3_bajie_boolean_operation: '组合两个条件',
  w3_bajie_condition_guanyin_precepts: '已蒙观音劝善受戒',
  w3_bajie_condition_willing_westward: '明确愿随唐僧西去',
  w3_bajie_formally_join_team: '正式加入取经队伍',
  w3_bajie_continue_verification: '继续核对入队条件',
};

export function registerBajieJoiningBlocks(): void {
  Blockly.Blocks.w3_bajie_receive_statement = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(BAJIE_JOINING_BLOCK_LABELS.w3_bajie_receive_statement);
      this.setNextStatement(true); this.setDeletable(false); this.setColour(28);
    },
  };
  Blockly.Blocks.w3_bajie_if_join_ready = {
    init(this: Blockly.Block) {
      this.appendValueInput('CONDITION').setCheck('Boolean').appendField(BAJIE_JOINING_BLOCK_LABELS.w3_bajie_if_join_ready);
      this.appendStatementInput('THEN').appendField('那么'); this.appendStatementInput('ELSE').appendField('否则');
      this.setPreviousStatement(true); this.setDeletable(false); this.setColour(210);
    },
  };
  Blockly.Blocks.w3_bajie_boolean_operation = {
    init(this: Blockly.Block) {
      this.appendValueInput('LEFT').setCheck('Boolean');
      this.appendDummyInput().appendField(new Blockly.FieldDropdown([['同时满足（AND）', 'and'], ['满足一个即可（OR）', 'or']]), 'OPERATOR');
      this.appendValueInput('RIGHT').setCheck('Boolean');
      this.setOutput(true, 'Boolean'); this.setDeletable(false); this.setColour(65);
    },
  };
  for (const type of ['w3_bajie_condition_guanyin_precepts', 'w3_bajie_condition_willing_westward'] as const) {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) { this.appendDummyInput().appendField(BAJIE_JOINING_BLOCK_LABELS[type]); this.setOutput(true, 'Boolean'); this.setDeletable(false); this.setColour(65); },
    };
  }
  for (const type of ['w3_bajie_formally_join_team', 'w3_bajie_continue_verification'] as const) {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) { this.appendDummyInput().appendField(BAJIE_JOINING_BLOCK_LABELS[type]); this.setPreviousStatement(true); this.setDeletable(false); this.setColour(28); },
    };
  }
}
