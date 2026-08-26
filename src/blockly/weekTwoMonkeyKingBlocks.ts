import * as Blockly from 'blockly';
import type { MonkeyKingBlockType } from './weekTwoMonkeyKingContract';

export const MONKEY_KING_BLOCK_LABELS: Readonly<Record<MonkeyKingBlockType, string>> = {
  xiyou_on_return_flower_fruit: '当 返回花果山',
  xiyou_on_heavenly_title: '当 天庭正式授号',
  xiyou_raise_great_sage_flag: '竖起齐天大圣旗',
  xiyou_accept_great_sage_title: '接受齐天大圣名号',
  xiyou_build_great_sage_residence: '建立齐天大圣府',
};

let registered = false;

export function registerMonkeyKingBlocks(): void {
  if (registered) return;
  const handler = (type: 'xiyou_on_return_flower_fruit' | 'xiyou_on_heavenly_title', colour: number) => {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.appendDummyInput().appendField(MONKEY_KING_BLOCK_LABELS[type]);
        this.appendStatementInput('HANDLER').appendField('发生时执行');
        this.setColour(colour);
        this.setTooltip('事件发生时，只执行连接在这个事件帽下面的积木。');
      },
    };
  };
  const action = (type: 'xiyou_raise_great_sage_flag' | 'xiyou_accept_great_sage_title' | 'xiyou_build_great_sage_residence', colour: number) => {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.appendDummyInput().appendField(MONKEY_KING_BLOCK_LABELS[type]);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(colour);
        this.setTooltip(MONKEY_KING_BLOCK_LABELS[type]);
      },
    };
  };
  handler('xiyou_on_return_flower_fruit', 35);
  handler('xiyou_on_heavenly_title', 260);
  action('xiyou_raise_great_sage_flag', 35);
  action('xiyou_accept_great_sage_title', 260);
  action('xiyou_build_great_sage_residence', 260);
  registered = true;
}
