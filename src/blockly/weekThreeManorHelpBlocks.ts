import * as Blockly from 'blockly';
import { MANOR_HELP_BLOCK_TYPES, type ManorHelpBlockType } from './weekThreeManorHelpContract';

export const MANOR_HELP_BLOCK_LABELS: Readonly<Record<ManorHelpBlockType, string>> = {
  w3_manor_receive_message: '收到当前口信',
  w3_manor_if_message: '如果',
  w3_manor_condition_explicit_demon_help: '口信是在明确请求降妖帮助',
  w3_manor_condition_mentions_gao_manor: '口信提到了高老庄',
  w3_manor_accept_and_return_notice: '主动应承，并请来人回庄禀报',
  w3_manor_continue_journey: '继续问路前行',
};

export function registerManorHelpBlocks(): void {
  if (MANOR_HELP_BLOCK_TYPES.every((type) => Blockly.Blocks[type] !== undefined)) return;
  const statement = (type: Extract<ManorHelpBlockType, 'w3_manor_receive_message' | 'w3_manor_accept_and_return_notice' | 'w3_manor_continue_journey'>, colour: number) => {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.appendDummyInput().appendField(MANOR_HELP_BLOCK_LABELS[type]);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(colour);
      },
    };
  };
  statement('w3_manor_receive_message', 28);
  statement('w3_manor_accept_and_return_notice', 28);
  statement('w3_manor_continue_journey', 28);
  Blockly.Blocks.w3_manor_if_message = {
    init(this: Blockly.Block) {
      this.appendValueInput('CONDITION').setCheck('Boolean').appendField(MANOR_HELP_BLOCK_LABELS.w3_manor_if_message);
      this.appendStatementInput('THEN').appendField('那么');
      this.appendStatementInput('ELSE').appendField('否则');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(210);
    },
  };
  for (const type of ['w3_manor_condition_explicit_demon_help', 'w3_manor_condition_mentions_gao_manor'] as const) {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.appendDummyInput().appendField(MANOR_HELP_BLOCK_LABELS[type]);
        this.setOutput(true, 'Boolean');
        this.setColour(65);
      },
    };
  }
}
