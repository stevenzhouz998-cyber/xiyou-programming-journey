import * as Blockly from 'blockly';
import { ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS, isAdvancedWeekOneBlockType, type AdvancedWeekOneBlockType } from './advancedWeekOneContract';
import { ADVANCED_WEEK_ONE_BLOCK_LABELS } from './advancedWeekOneCatalogue';

let registered = false;

export function registerAdvancedWeekOneBlocks(): void {
  if (registered) return;
  for (const [type, definition] of Object.entries(ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS) as Array<[AdvancedWeekOneBlockType, typeof ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[AdvancedWeekOneBlockType]]>) {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.appendDummyInput().appendField(ADVANCED_WEEK_ONE_BLOCK_LABELS[type]);
        if ('childScope' in definition) this.appendStatementInput('CHILDREN').appendField('依次完成');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(definition.missionId === 'w1-m4' ? 18 : 42);
        this.setTooltip(ADVANCED_WEEK_ONE_BLOCK_LABELS[type]);
      },
    };
  }
  registered = true;
}

export function isAdvancedWeekOneRegisteredBlock(block: Blockly.Block): block is Blockly.Block & { type: AdvancedWeekOneBlockType } {
  return isAdvancedWeekOneBlockType(block.type);
}
