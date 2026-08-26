import * as Blockly from 'blockly';
import type { HorseCareBlockType } from './weekTwoHorseContract';

export const HORSE_CARE_BLOCK_LABELS: Readonly<Record<HorseCareBlockType, string>> = {
  xiyou_accept_stable_post: '接受弼马温官职',
  xiyou_repeat_horse_care: '重复照料天马',
  xiyou_care_next_horse: '照料下一匹天马',
  xiyou_learn_stable_rank: '了解弼马温品级',
  xiyou_leave_heaven: '离开天庭返回花果山',
};

let registered = false;

export function registerHorseCareBlocks(): void {
  if (registered) return;
  const statement = (type: HorseCareBlockType, colour: number) => {
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.appendDummyInput().appendField(HORSE_CARE_BLOCK_LABELS[type]);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(colour);
        this.setTooltip(HORSE_CARE_BLOCK_LABELS[type]);
      },
    };
  };
  statement('xiyou_accept_stable_post', 28);
  Blockly.Blocks.xiyou_repeat_horse_care = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField(HORSE_CARE_BLOCK_LABELS.xiyou_repeat_horse_care)
        .appendField(new Blockly.FieldNumber(3, 1, 6, 1), 'TIMES')
        .appendField('次');
      this.appendStatementInput('CHILDREN').appendField('每次执行');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(210);
      this.setTooltip('循环次数来自这块可见积木，循环体会按次数真正执行。');
    },
  };
  statement('xiyou_care_next_horse', 160);
  statement('xiyou_learn_stable_rank', 28);
  statement('xiyou_leave_heaven', 28);
  registered = true;
}
