import * as Blockly from 'blockly';
import { WEEK_FOUR_MAPPING_BLOCK_TYPES } from './weekFourMappingDraft';

export { WEEK_FOUR_MAPPING_BLOCK_TYPES } from './weekFourMappingDraft';

export function registerWeekFourMappingBlocks(): void {
  Blockly.Blocks[WEEK_FOUR_MAPPING_BLOCK_TYPES.root] = { init(this: Blockly.Block) { this.appendDummyInput().appendField('遇到山中来客'); this.appendStatementInput('BODY'); this.setColour(28); this.setDeletable(false); } };
  Blockly.Blocks[WEEK_FOUR_MAPPING_BLOCK_TYPES.ifIdentity] = { init(this: Blockly.Block) { this.appendValueInput('CONDITION').appendField('如果'); this.appendStatementInput('THEN').appendField('那么'); this.appendStatementInput('ELSE').appendField('否则'); this.setPreviousStatement(true); this.setColour(210); this.setDeletable(false); } };
  Blockly.Blocks[WEEK_FOUR_MAPPING_BLOCK_TYPES.identityIsDemon] = { init(this: Blockly.Block) { this.appendDummyInput().appendField('真实身份是白骨精'); this.setOutput(true, 'Boolean'); this.setColour(120); this.setDeletable(false); } };
  Blockly.Blocks[WEEK_FOUR_MAPPING_BLOCK_TYPES.continueVerification] = { init(this: Blockly.Block) { this.appendDummyInput().appendField('继续核验'); this.setPreviousStatement(true); this.setColour(65); this.setDeletable(false); } };
  Blockly.Blocks[WEEK_FOUR_MAPPING_BLOCK_TYPES.politePass] = { init(this: Blockly.Block) { this.appendDummyInput().appendField('礼貌放行'); this.setPreviousStatement(true); this.setColour(65); this.setDeletable(false); } };
}
